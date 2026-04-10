"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { HQRole, ChatMsg } from "@/app/hq/types";
import { sb, I, B, C } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

interface EnrichedMsg extends ChatMsg {
  sender: string;
  created_at: string;
  reply_to?: { sender: string; text: string } | null;
  reactions?: Record<string, string[]>;
  receiver?: string;
}

interface TeamMemberSimple {
  id: string;
  name: string;
}

const REACTIONS = ["👍", "❤️", "😂", "👏", "🔥"];

function renderMentionText(text: string, isMe: boolean) {
  const parts = text.split(/(@[가-힣a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (/^@[가-힣a-zA-Z0-9_]+$/.test(part)) {
      return (
        <span key={i} className={`font-bold ${isMe ? "text-blue-200" : "text-[#3182F6]"}`}>
          {part}
        </span>
      );
    }
    return part;
  });
}

function dateSeparatorLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = yest.toISOString().slice(0, 10);
  const ds = d.toISOString().slice(0, 10);
  if (ds === todayStr) return "오늘";
  if (ds === yesterdayStr) return "어제";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function mapRow(d: any): EnrichedMsg {
  return {
    id: d.id,
    sender: d.sender ?? "",
    receiver: d.receiver ?? "",
    text: d.text ?? "",
    created_at: d.created_at ?? "",
    time: d.created_at ? new Date(d.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "",
    reply_to: d.reply_to ?? null,
    reactions: d.reactions ?? {},
  };
}

const avatarColor = (name: string) => {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
    "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ── 메시지 버블 (팀 채팅 + DM 공유) ──────────────────────
function MessageBubble({
  m, userName, onReply, onDelete, onReaction, showReactionPicker, setShowReactionPicker,
}: {
  m: EnrichedMsg;
  userName: string;
  onReply: (r: { id: string; sender: string; text: string }) => void;
  onDelete: (id: string) => void;
  onReaction: (msgId: string, emoji: string) => void;
  showReactionPicker: string | null;
  setShowReactionPicker: (id: string | null) => void;
}) {
  const isMe = m.sender === userName;
  const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;

  return (
    <div className={`flex items-end gap-2.5 mb-3 ${isMe ? "flex-row-reverse" : ""}`}>
      {!isMe && (
        <div className={`w-8 h-8 rounded-full ${avatarColor(m.sender)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
          {m.sender.charAt(0)}
        </div>
      )}
      <div className={`max-w-[70%] group ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && <p className="text-xs font-semibold text-slate-500 mb-1 ml-1">{m.sender}</p>}
        {m.reply_to && (
          <div className={`rounded-lg px-3 py-1.5 mb-1 text-xs border-l-2 ${isMe ? "bg-blue-400/20 border-blue-300 text-blue-100" : "bg-slate-50 border-slate-300 text-slate-500"}`}>
            <span className="font-semibold">{m.reply_to.sender}</span>
            <p className="truncate">{m.reply_to.text}</p>
          </div>
        )}
        <div className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isMe ? "bg-[#3182F6] text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md"}`}>
          <p className="whitespace-pre-wrap">{renderMentionText(m.text, isMe)}</p>
          <div className={`absolute ${isMe ? "-left-20" : "-right-20"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all`}>
            <button onClick={() => onReply({ id: m.id, sender: m.sender, text: m.text })} className="text-slate-300 hover:text-[#3182F6] transition-colors" title="답장">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </button>
            <button onClick={() => setShowReactionPicker(showReactionPicker === m.id ? null : m.id)} className="text-slate-300 hover:text-amber-400 transition-colors" title="반응">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            {isMe && (
              <button onClick={() => onDelete(m.id)} className="text-slate-300 hover:text-red-400 transition-colors" title="삭제">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
          {showReactionPicker === m.id && (
            <div className={`absolute ${isMe ? "right-0" : "left-0"} -top-10 bg-white rounded-xl shadow-lg border border-slate-200 px-2 py-1.5 flex gap-1 z-10`}>
              {REACTIONS.map(emoji => (
                <button key={emoji} onClick={(e) => { e.stopPropagation(); onReaction(m.id, emoji); }} className="hover:scale-125 transition-transform text-lg px-0.5">{emoji}</button>
              ))}
            </div>
          )}
        </div>
        {hasReactions && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
            {Object.entries(m.reactions!).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReaction(m.id, emoji)}
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs border transition-all ${
                  (users as string[]).includes(userName) ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}>
                <span>{emoji}</span><span className="font-medium">{(users as string[]).length}</span>
              </button>
            ))}
          </div>
        )}
        <p className={`text-[10px] text-slate-400 mt-1 ${isMe ? "text-right mr-1" : "ml-1"}`}>{m.time}</p>
      </div>
    </div>
  );
}

// ── 메인 ChatTab ─────────────────────────────────────────
export default function ChatTab({ userId, userName, myRole, flash }: Props) {
  const [mode, setMode] = useState<"team" | "dm">("team");
  const [dmTarget, setDmTarget] = useState<TeamMemberSimple | null>(null);

  // ── 팀 채팅 state ──
  const [messages, setMessages] = useState<EnrichedMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  // ── DM state ──
  const [dmMessages, setDmMessages] = useState<EnrichedMsg[]>([]);
  const [dmText, setDmText] = useState("");
  const [dmLoading, setDmLoading] = useState(false);
  const [dmReplyTo, setDmReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [dmShowReactionPicker, setDmShowReactionPicker] = useState<string | null>(null);
  const [dmLastMsgs, setDmLastMsgs] = useState<Record<string, { text: string; time: string }>>({});

  // ── 공통 ──
  const [teamMembers, setTeamMembers] = useState<TeamMemberSimple[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dmInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dmBottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dmScrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSeenCount = useRef(0);
  const isAtBottom = useRef(true);

  // Load team members
  const [allMembers, setAllMembers] = useState<TeamMemberSimple[]>([]);
  useEffect(() => {
    (async () => {
      const s = sb();
      if (!s) return;
      const { data } = await s.from("hq_team").select("id, name").neq("approved", false);
      if (data) {
        const members = data as TeamMemberSimple[];
        setAllMembers(members);
        setTeamMembers(members.filter(m => m.name !== userName));
      }
    })();
  }, [userName]);

  // 멘션: 전체 팀원 (자신 포함), DM 목록: 자신 제외
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

  // ═══════════════════════════════════════════════════════
  // 팀 채팅
  // ═══════════════════════════════════════════════════════
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
    if (mode === "team" && isAtBottom.current) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mode]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBot = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottom.current = atBot;
    setShowScrollBtn(!atBot);
    if (atBot) { lastSeenCount.current = messages.length; setUnreadCount(0); }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false); setUnreadCount(0); lastSeenCount.current = messages.length;
  };

  const sendTeam = async () => {
    if (!text.trim()) return;
    const s = sb();
    if (!s) return;
    const payload: any = { sender: userName, text: text.trim() };
    if (replyTo) payload.reply_to = { sender: replyTo.sender, text: replyTo.text.slice(0, 100) };
    await s.from("hq_chat").insert(payload);
    setText(""); setReplyTo(null); isAtBottom.current = true;
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

  // ═══════════════════════════════════════════════════════
  // 개별 채팅 (DM)
  // ═══════════════════════════════════════════════════════
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

  // Subscribe to DM realtime when target changes
  useEffect(() => {
    if (!dmTarget) return;
    loadDm(dmTarget.name);
    const s = sb();
    if (!s) return;

    // Clean up previous channel
    if (dmChannelRef.current) s.removeChannel(dmChannelRef.current);

    const channel = s
      .channel(`hq_dm_${dmTarget.id}`)
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "hq_dm" }, (payload: any) => {
        const newMsg = mapRow(payload.new);
        // Only add if it's part of this conversation
        const isMyConvo = (newMsg.sender === userName && newMsg.receiver === dmTarget.name) ||
                          (newMsg.sender === dmTarget.name && newMsg.receiver === userName);
        if (!isMyConvo) return;
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Update last message
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

  // Auto scroll DM
  useEffect(() => {
    if (mode === "dm" && dmTarget) dmBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages, mode, dmTarget]);

  const sendDm = async () => {
    if (!dmText.trim() || !dmTarget) return;
    const s = sb();
    if (!s) return;
    const payload: any = { sender: userName, receiver: dmTarget.name, text: dmText.trim() };
    if (dmReplyTo) payload.reply_to = { sender: dmReplyTo.sender, text: dmReplyTo.text.slice(0, 100) };
    await s.from("hq_dm").insert(payload);
    setDmText(""); setDmReplyTo(null);
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

  // ── 메시지 그룹핑 (날짜 구분) ──────────────────────────
  function groupByDate(msgs: EnrichedMsg[]) {
    const groups: { label: string; msgs: EnrichedMsg[] }[] = [];
    let currentDate = "";
    for (const m of msgs) {
      const d = m.created_at ? m.created_at.slice(0, 10) : "";
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ label: dateSeparatorLabel(m.created_at), msgs: [m] });
      } else {
        groups[groups.length - 1].msgs.push(m);
      }
    }
    return groups;
  }

  const teamGrouped = groupByDate(messages);
  const dmGrouped = groupByDate(dmMessages);

  // ── 렌더링 ─────────────────────────────────────────────
  return (
    <div className={`${C} flex flex-col`} style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      {/* 모드 탭 */}
      <div className="flex items-center gap-1 mb-4 flex-shrink-0">
        <button
          onClick={() => setMode("team")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === "team" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          팀 채팅
        </button>
        <button
          onClick={() => setMode("dm")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === "dm" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          개별 채팅
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 팀 채팅 모드 */}
      {/* ═══════════════════════════════════════════════════ */}
      {mode === "team" && (
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
                <p className="text-xs font-semibold text-blue-600">{replyTo.sender} 에게 답장</p>
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
                placeholder={replyTo ? `${replyTo.sender}에게 답장...` : "메시지를 입력하세요... (@으로 멘션)"} />
              <button className={`${B} flex-shrink-0`} onClick={sendTeam}>전송</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* 개별 채팅 (DM) 모드 */}
      {/* ═══════════════════════════════════════════════════ */}
      {mode === "dm" && (
        <div className="flex flex-1 min-h-0 gap-3">
          {/* 좌측: 팀원 목록 */}
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
                      <p className={`text-sm font-semibold truncate ${dmTarget?.id === m.id ? "text-[#3182F6]" : "text-slate-700"}`}>{m.name}</p>
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

          {/* 우측: DM 대화 */}
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
                {/* DM 헤더 */}
                <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100 flex-shrink-0">
                  <button onClick={() => setDmTarget(null)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <div className={`w-8 h-8 rounded-full ${avatarColor(dmTarget.name)} flex items-center justify-center text-white text-xs font-bold`}>
                    {dmTarget.name.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-slate-800">{dmTarget.name}</span>
                </div>

                {/* DM 메시지 영역 */}
                <div ref={dmScrollContainerRef} className="flex-1 overflow-y-auto space-y-1 mb-4 pr-1">
                  {dmLoading ? (
                    <div className="text-center py-12 text-slate-400">불러오는 중...</div>
                  ) : dmMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <span className="text-3xl block mb-2">👋</span>
                      <p>{dmTarget.name}님과의 첫 대화를 시작하세요!</p>
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

                {/* DM 답장 배너 */}
                {dmReplyTo && (
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl mb-2 border border-blue-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-600">{dmReplyTo.sender} 에게 답장</p>
                      <p className="text-xs text-blue-400 truncate">{dmReplyTo.text}</p>
                    </div>
                    <button onClick={() => setDmReplyTo(null)} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                {/* DM 입력 */}
                <div className="flex-shrink-0 pt-3 border-t border-slate-100">
                  <div className="flex gap-2">
                    <input ref={dmInputRef} className={`${I} flex-1`} value={dmText}
                      onChange={(e) => setDmText(e.target.value)} onKeyDown={handleDmKeyDown}
                      placeholder={dmReplyTo ? `${dmReplyTo.sender}에게 답장...` : `${dmTarget.name}에게 메시지 보내기...`} />
                    <button className={`${B} flex-shrink-0`} onClick={sendDm}>전송</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
