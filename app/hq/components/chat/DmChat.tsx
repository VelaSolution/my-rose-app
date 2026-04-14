"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { sb, I, B, useTeamDisplayNames } from "@/app/hq/utils";
import { EnrichedMsg, TeamMemberSimple, mapRow, groupByDate, avatarColor } from "./chatHelpers";
import MessageBubble from "./MessageBubble";

interface Props {
  userName: string;
  teamMembers: TeamMemberSimple[];
  flash: (m: string) => void;
}

export default function DmChat({ userName, teamMembers, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [dmTarget, setDmTarget] = useState<TeamMemberSimple | null>(null);
  const [dmMessages, setDmMessages] = useState<EnrichedMsg[]>([]);
  const [dmText, setDmText] = useState("");
  const [dmLoading, setDmLoading] = useState(false);
  const [dmReplyTo, setDmReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [dmShowReactionPicker, setDmShowReactionPicker] = useState<string | null>(null);
  const [dmLastMsgs, setDmLastMsgs] = useState<Record<string, { text: string; time: string }>>({});

  const dmInputRef = useRef<HTMLInputElement>(null);
  const dmBottomRef = useRef<HTMLDivElement>(null);
  const dmScrollContainerRef = useRef<HTMLDivElement>(null);
  const dmChannelRef = useRef<any>(null);

  // Load last messages for each team member
  useEffect(() => {
    if (teamMembers.length === 0) return;
    (async () => {
      const s = sb();
      if (!s) return;
      const lastMsgs: Record<string, { text: string; time: string }> = {};
      for (const member of teamMembers) {
        const { data } = await s.from("hq_dm").select("text, created_at")
          .or(`and(sender.eq.${userName},receiver.eq.${member.name}),and(sender.eq.${member.name},receiver.eq.${userName})`)
          .order("created_at", { ascending: false }).limit(1);
        if (data && data.length > 0) {
          lastMsgs[member.name] = {
            text: data[0].text,
            time: new Date(data[0].created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          };
        }
      }
      setDmLastMsgs(lastMsgs);
    })();
  }, [teamMembers, userName]);

  const loadDm = useCallback(async (target: string) => {
    setDmLoading(true);
    const s = sb();
    if (!s) { setDmLoading(false); return; }
    const { data } = await s.from("hq_dm").select("*")
      .or(`and(sender.eq.${userName},receiver.eq.${target}),and(sender.eq.${target},receiver.eq.${userName})`)
      .order("created_at", { ascending: true }).limit(200);
    if (data) setDmMessages(data.map(mapRow));
    setDmLoading(false);
  }, [userName]);

  useEffect(() => {
    if (!dmTarget) return;
    loadDm(dmTarget.name);
    const s = sb();
    if (!s) return;

    if (dmChannelRef.current) s.removeChannel(dmChannelRef.current);

    const channel = s
      .channel(`hq_dm_${dmTarget.id}_${Date.now()}`)
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "hq_dm" }, (payload: any) => {
        const newMsg = mapRow(payload.new);
        const isMyConvo = (newMsg.sender === userName && newMsg.receiver === dmTarget.name) ||
                          (newMsg.sender === dmTarget.name && newMsg.receiver === userName);
        if (!isMyConvo) return;
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setDmLastMsgs(prev => ({
          ...prev,
          [dmTarget.name]: { text: newMsg.text, time: newMsg.time },
        }));
      })
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "hq_dm" }, (payload: any) => {
        const updated = mapRow(payload.new);
        setDmMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      })
      .on("postgres_changes" as any, { event: "DELETE", schema: "public", table: "hq_dm" }, (payload: any) => {
        const deletedId = payload.old?.id;
        if (deletedId) setDmMessages((prev) => prev.filter((m) => m.id !== deletedId));
      })
      .subscribe();

    dmChannelRef.current = channel;
    return () => { s.removeChannel(channel); dmChannelRef.current = null; };
  }, [dmTarget, loadDm, userName]);

  useEffect(() => {
    if (dmTarget) {
      const el = dmScrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [dmMessages, dmTarget]);

  const sendDm = async () => {
    if (!dmText.trim() || !dmTarget) return;
    const s = sb();
    if (!s) return;
    const payload: any = { sender: userName, receiver: dmTarget.name, text: dmText.trim() };
    if (dmReplyTo) payload.reply_to = { sender: dmReplyTo.sender, text: dmReplyTo.text.slice(0, 100) };
    setDmText(""); setDmReplyTo(null);
    const { data } = await s.from("hq_dm").insert(payload).select().single();
    if (data) {
      const newMsg = mapRow(data);
      setDmMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      setDmLastMsgs(prev => ({ ...prev, [dmTarget.name]: { text: newMsg.text, time: newMsg.time } }));
    }
  };

  const deleteDmMsg = async (id: string) => {
    if (!confirm("메시지를 삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_dm").delete().eq("id", id);
    flash("삭제됨");
  };

  const toggleDmReaction = async (msgId: string, emoji: string) => {
    const s = sb();
    if (!s) return;
    const msg = dmMessages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions ?? {}) };
    const users = reactions[emoji] ?? [];
    if (users.includes(userName)) {
      reactions[emoji] = users.filter((u: string) => u !== userName);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, userName];
    }
    await s.from("hq_dm").update({ reactions }).eq("id", msgId);
    setDmShowReactionPicker(null);
  };

  const handleDmKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDm(); }
  };

  const dmGrouped = groupByDate(dmMessages);

  return (
    <div className="flex flex-1 min-h-0 gap-3">
      {/* Left: team member list */}
      <div className={`${dmTarget ? "hidden md:flex" : "flex"} flex-col w-full md:w-56 flex-shrink-0 border-r border-slate-100 pr-3`}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">팀원</p>
        <div className="flex-1 overflow-y-auto space-y-1">
          {teamMembers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">팀원이 없습니다</p>
          ) : (
            teamMembers.map((m) => (
              <button key={m.id} onClick={() => { setDmTarget(m); setDmReplyTo(null); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all ${
                  dmTarget?.id === m.id ? "bg-[#3182F6]/10" : "hover:bg-slate-50"
                }`}>
                <div className={`w-8 h-8 rounded-full ${avatarColor(m.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${dmTarget?.id === m.id ? "text-[#3182F6]" : "text-slate-700"}`}>{displayName(m.name)}</p>
                  {dmLastMsgs[m.name] && (
                    <p className="text-xs text-slate-400 truncate">{dmLastMsgs[m.name].text}</p>
                  )}
                </div>
                {dmLastMsgs[m.name] && (
                  <span className="text-[10px] text-slate-300 flex-shrink-0">{dmLastMsgs[m.name].time}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: DM conversation */}
      <div className={`${dmTarget ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}>
        {!dmTarget ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            <div className="text-center">
              <span className="text-4xl block mb-3">💬</span>
              <p>팀원을 선택해 대화를 시작하세요</p>
            </div>
          </div>
        ) : (
          <>
            {/* DM header */}
            <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100 flex-shrink-0">
              <button onClick={() => setDmTarget(null)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className={`w-8 h-8 rounded-full ${avatarColor(dmTarget.name)} flex items-center justify-center text-white text-xs font-bold`}>
                {dmTarget.name.charAt(0)}
              </div>
              <span className="text-sm font-bold text-slate-800">{displayName(dmTarget.name)}</span>
            </div>

            {/* DM messages */}
            <div ref={dmScrollContainerRef} className="flex-1 overflow-y-auto space-y-1 mb-4 pr-1">
              {dmLoading ? (
                <div className="text-center py-12 text-slate-400">불러오는 중...</div>
              ) : dmMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="text-3xl block mb-2">👋</span>
                  <p>{displayName(dmTarget.name)}님과의 첫 대화를 시작하세요!</p>
                </div>
              ) : (
                dmGrouped.map((group, gi) => (
                  <div key={gi}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs font-medium text-slate-400 bg-white px-3">{group.label}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    {group.msgs.map((m) => (
                      <MessageBubble key={m.id} m={m} userName={userName}
                        onReply={setDmReplyTo} onDelete={deleteDmMsg} onReaction={toggleDmReaction}
                        showReactionPicker={dmShowReactionPicker} setShowReactionPicker={setDmShowReactionPicker} />
                    ))}
                  </div>
                ))
              )}
              <div ref={dmBottomRef} />
            </div>

            {/* DM reply banner */}
            {dmReplyTo && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl mb-2 border border-blue-100">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-600">{displayName(dmReplyTo.sender)} 에게 답장</p>
                  <p className="text-xs text-blue-400 truncate">{dmReplyTo.text}</p>
                </div>
                <button onClick={() => setDmReplyTo(null)} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            {/* DM input */}
            <div className="flex-shrink-0 pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                <input ref={dmInputRef} className={`${I} flex-1`} value={dmText}
                  onChange={(e) => setDmText(e.target.value)} onKeyDown={handleDmKeyDown}
                  placeholder={dmReplyTo ? `${displayName(dmReplyTo.sender)}에게 답장...` : `${displayName(dmTarget.name)}에게 메시지 보내기...`} />
                <button className={`${B} flex-shrink-0`} onClick={sendDm}>전송</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
