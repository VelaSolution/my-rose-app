"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { sb, I, B, useTeamDisplayNames } from "@/app/hq/utils";
import { EnrichedMsg, TeamMemberSimple, mapRow, groupByDate } from "./chatHelpers";
import MessageBubble from "./MessageBubble";

interface Props {
  userName: string;
  allMembers: TeamMemberSimple[];
  flash: (m: string) => void;
}

export default function TeamChat({ userName, allMembers, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [messages, setMessages] = useState<EnrichedMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);
  const isAtBottom = useRef(true);

  const filteredMembers = mentionQuery !== null
    ? allMembers.filter(m => m.name.includes(mentionQuery))
    : [];

  const insertMention = (name: string) => {
    const atIdx = text.lastIndexOf("@");
    if (atIdx === -1) return;
    const before = text.slice(0, atIdx);
    const after = text.slice(atIdx).replace(/@[^\s]*/, "");
    setText(before + `@${name} ` + after);
    setMentionQuery(null);
    setMentionIndex(0);
    inputRef.current?.focus();
  };

  const loadTeam = useCallback(async () => {
    const s = sb();
    if (!s) { setLoading(false); return; }
    const { data } = await s.from("hq_chat").select("*").order("created_at", { ascending: true }).limit(200);
    if (data) {
      const mapped = data.map(mapRow);
      setMessages(mapped);
      lastSeenCount.current = mapped.length;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTeam();
    const s = sb();
    if (!s) return;
    const channel = s
      .channel("hq_chat_realtime")
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "hq_chat" }, (payload: any) => {
        const newMsg = mapRow(payload.new);
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          const updated = [...prev, newMsg];
          if (!isAtBottom.current) setUnreadCount((c) => c + 1);
          else lastSeenCount.current = updated.length;
          return updated;
        });
      })
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "hq_chat" }, (payload: any) => {
        const updated = mapRow(payload.new);
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      })
      .on("postgres_changes" as any, { event: "DELETE", schema: "public", table: "hq_chat" }, (payload: any) => {
        const deletedId = payload.old?.id;
        if (deletedId) setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      })
      .subscribe();
    return () => { s.removeChannel(channel); };
  }, [loadTeam]);

  useEffect(() => {
    if (isAtBottom.current) {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBot = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottom.current = atBot;
    setShowScrollBtn(!atBot);
    if (atBot) { lastSeenCount.current = messages.length; setUnreadCount(0); }
  };

  const scrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setShowScrollBtn(false); setUnreadCount(0); lastSeenCount.current = messages.length;
  };

  const sendTeam = async () => {
    if (!text.trim()) return;
    const s = sb();
    if (!s) return;
    const msgText = text.trim();
    const payload: any = { sender: userName, text: msgText };
    if (replyTo) payload.reply_to = { sender: replyTo.sender, text: replyTo.text.slice(0, 100) };
    setText(""); setReplyTo(null); isAtBottom.current = true;
    const { data } = await s.from("hq_chat").insert(payload).select().single();
    if (data) {
      const newMsg = mapRow(data);
      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    }
  };

  const deleteTeamMsg = async (id: string) => {
    if (!confirm("메시지를 삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_chat").delete().eq("id", id);
    flash("삭제됨");
  };

  const toggleTeamReaction = async (msgId: string, emoji: string) => {
    const s = sb();
    if (!s) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions ?? {}) };
    const users = reactions[emoji] ?? [];
    if (users.includes(userName)) {
      reactions[emoji] = users.filter((u: string) => u !== userName);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, userName];
    }
    await s.from("hq_chat").update({ reactions }).eq("id", msgId);
    setShowReactionPicker(null);
  };

  const handleTeamKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(i => (i + 1) % filteredMembers.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMembers[mentionIndex].name); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTeam(); }
  };

  const handleTeamInput = (val: string) => {
    setText(val);
    const atMatch = val.match(/@([^\s]*)$/);
    if (atMatch) { setMentionQuery(atMatch[1]); setMentionIndex(0); } else { setMentionQuery(null); }
  };

  const teamGrouped = groupByDate(messages);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-1 mb-4 pr-1 relative">
        {loading ? (
          <div className="text-center py-12 text-slate-400">불러오는 중...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400">메시지가 없습니다. 첫 메시지를 보내보세요!</div>
        ) : (
          teamGrouped.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-medium text-slate-400 bg-white px-3">{group.label}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              {group.msgs.map((m) => (
                <MessageBubble key={m.id} m={m} userName={userName}
                  onReply={setReplyTo} onDelete={deleteTeamMsg} onReaction={toggleTeamReaction}
                  showReactionPicker={showReactionPicker} setShowReactionPicker={setShowReactionPicker} />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {showScrollBtn && (
        <div className="flex justify-center -mt-14 mb-2 relative z-10">
          <button onClick={scrollToBottom}
            className="bg-white shadow-lg border border-slate-200 rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            {unreadCount > 0 ? `새 메시지 ${unreadCount}개` : "아래로"}
          </button>
        </div>
      )}

      {replyTo && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl mb-2 border border-blue-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600">{displayName(replyTo.sender)} 에게 답장</p>
            <p className="text-xs text-blue-400 truncate">{replyTo.text}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="flex-shrink-0 relative pt-3 border-t border-slate-100">
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 max-h-40 overflow-y-auto">
            {filteredMembers.map((m, i) => (
              <button key={m.id} onMouseDown={(e) => { e.preventDefault(); insertMention(m.name); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  i === mentionIndex ? "bg-[#3182F6]/10 text-[#3182F6]" : "text-slate-700 hover:bg-slate-50"
                }`}>
                <span className="w-6 h-6 rounded-full bg-[#3182F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{m.name.charAt(0)}</span>
                <span className="font-medium">{m.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input ref={inputRef} className={`${I} flex-1`} value={text}
            onChange={(e) => handleTeamInput(e.target.value)} onKeyDown={handleTeamKeyDown}
            placeholder={replyTo ? `${displayName(replyTo.sender)}에게 답장...` : "메시지를 입력하세요... (@으로 멘션)"} />
          <button className={`${B} flex-shrink-0`} onClick={sendTeam}>전송</button>
        </div>
      </div>
    </div>
  );
}
