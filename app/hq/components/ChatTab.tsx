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
}

interface TeamMemberSimple {
  id: string;
  name: string;
}

const REACTIONS = ["👍", "❤️", "😂", "👏", "🔥"];

/** Render text with @mentions highlighted in blue bold */
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

export default function ChatTab({ userId, userName, myRole, flash }: Props) {
  const [messages, setMessages] = useState<EnrichedMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [typingVisible, setTypingVisible] = useState(false);

  const [teamMembers, setTeamMembers] = useState<TeamMemberSimple[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenCount = useRef(0);
  const isAtBottom = useRef(true);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load team members for @mention
  useEffect(() => {
    (async () => {
      const s = sb();
      if (!s) return;
      const { data } = await s.from("hq_team").select("id, name").eq("status", "active");
      if (data) setTeamMembers(data as TeamMemberSimple[]);
    })();
  }, []);

  const filteredMembers = mentionQuery !== null
    ? teamMembers.filter(m => m.name.includes(mentionQuery))
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

  const load = useCallback(async () => {
    const s = sb();
    if (!s) { setLoading(false); return; }
    const { data } = await s.from("hq_chat").select("*").order("created_at", { ascending: true }).limit(200);
    if (data) {
      const mapped: EnrichedMsg[] = data.map((d: any) => ({
        id: d.id,
        sender: d.sender ?? "",
        text: d.text ?? "",
        created_at: d.created_at ?? "",
        time: d.created_at ? new Date(d.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "",
        reply_to: d.reply_to ?? null,
        reactions: d.reactions ?? {},
      }));
      setMessages(mapped);

      // unread count: messages that arrived since last seen and user is scrolled up
      if (!isAtBottom.current && mapped.length > lastSeenCount.current) {
        setUnreadCount(mapped.length - lastSeenCount.current);
      }
      if (isAtBottom.current) {
        lastSeenCount.current = mapped.length;
        setUnreadCount(0);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  // Auto-scroll only if user is at bottom
  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBot = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottom.current = atBot;
    setShowScrollBtn(!atBot);
    if (atBot) {
      lastSeenCount.current = messages.length;
      setUnreadCount(0);
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
    setUnreadCount(0);
    lastSeenCount.current = messages.length;
  };

  const send = async () => {
    if (!text.trim()) return;
    const s = sb();
    if (!s) return;
    const payload: any = { sender: userName, text: text.trim() };
    if (replyTo) {
      payload.reply_to = { sender: replyTo.sender, text: replyTo.text.slice(0, 100) };
    }
    await s.from("hq_chat").insert(payload);
    setText("");
    setReplyTo(null);
    isAtBottom.current = true;
    load();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // @mention dropdown navigation
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(i => (i + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInputChange = (val: string) => {
    setText(val);
    // Show typing indicator concept
    setTypingVisible(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTypingVisible(false), 2000);

    // @mention detection
    const atMatch = val.match(/@([^\s]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const deleteMsg = async (id: string) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_chat").delete().eq("id", id);
    flash("삭제됨");
    load();
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    const s = sb();
    if (!s) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions ?? {}) };
    const users = reactions[emoji] ?? [];
    if (users.includes(userName)) {
      reactions[emoji] = users.filter(u => u !== userName);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, userName];
    }
    await s.from("hq_chat").update({ reactions }).eq("id", msgId);
    setShowReactionPicker(null);
    load();
  };

  const avatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
      "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Group messages by date
  const groupedMessages: { label: string; msgs: EnrichedMsg[] }[] = [];
  let currentDate = "";
  for (const m of messages) {
    const d = m.created_at ? m.created_at.slice(0, 10) : "";
    if (d !== currentDate) {
      currentDate = d;
      groupedMessages.push({ label: dateSeparatorLabel(m.created_at), msgs: [m] });
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(m);
    }
  }

  return (
    <div className={`${C} flex flex-col`} style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex-shrink-0">팀 채팅</h3>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-1 mb-4 pr-1 relative"
      >
        {loading ? (
          <div className="text-center py-12 text-slate-400">불러오는 중...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400">메시지가 없습니다. 첫 메시지를 보내보세요!</div>
        ) : (
          groupedMessages.map((group, gi) => (
            <div key={gi}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-medium text-slate-400 bg-white px-3">{group.label}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {group.msgs.map((m) => {
                const isMe = m.sender === userName;
                const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;
                return (
                  <div key={m.id} className={`flex items-end gap-2.5 mb-3 ${isMe ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    {!isMe && (
                      <div className={`w-8 h-8 rounded-full ${avatarColor(m.sender)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {m.sender.charAt(0)}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[70%] group ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && (
                        <p className="text-xs font-semibold text-slate-500 mb-1 ml-1">{m.sender}</p>
                      )}

                      {/* Reply quote */}
                      {m.reply_to && (
                        <div className={`rounded-lg px-3 py-1.5 mb-1 text-xs border-l-2 ${isMe ? "bg-blue-400/20 border-blue-300 text-blue-100" : "bg-slate-50 border-slate-300 text-slate-500"}`}>
                          <span className="font-semibold">{m.reply_to.sender}</span>
                          <p className="truncate">{m.reply_to.text}</p>
                        </div>
                      )}

                      <div className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isMe ? "bg-[#3182F6] text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md"}`}>
                        <p className="whitespace-pre-wrap">{renderMentionText(m.text, isMe)}</p>

                        {/* Action buttons (reply, react, delete) */}
                        <div className={`absolute ${isMe ? "-left-20" : "-right-20"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all`}>
                          {/* Reply */}
                          <button
                            onClick={() => setReplyTo({ id: m.id, sender: m.sender, text: m.text })}
                            className="text-slate-300 hover:text-[#3182F6] transition-colors"
                            title="답장"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                          {/* Reaction picker toggle */}
                          <button
                            onClick={() => setShowReactionPicker(showReactionPicker === m.id ? null : m.id)}
                            className="text-slate-300 hover:text-amber-400 transition-colors"
                            title="반응"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {/* Delete (own messages only) */}
                          {isMe && (
                            <button
                              onClick={() => deleteMsg(m.id)}
                              className="text-slate-300 hover:text-red-400 transition-colors"
                              title="삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Reaction picker popup */}
                        {showReactionPicker === m.id && (
                          <div className={`absolute ${isMe ? "right-0" : "left-0"} -top-10 bg-white rounded-xl shadow-lg border border-slate-200 px-2 py-1.5 flex gap-1 z-10`}>
                            {REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }}
                                className="hover:scale-125 transition-transform text-lg px-0.5"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reactions display */}
                      {hasReactions && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                          {Object.entries(m.reactions!).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(m.id, emoji)}
                              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs border transition-all ${
                                (users as string[]).includes(userName)
                                  ? "bg-blue-50 border-blue-200 text-blue-600"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-medium">{(users as string[]).length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <p className={`text-[10px] text-slate-400 mt-1 ${isMe ? "text-right mr-1" : "ml-1"}`}>{m.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingVisible && (
          <div className="flex items-center gap-2 ml-10 mb-2">
            <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button + unread count */}
      {showScrollBtn && (
        <div className="flex justify-center -mt-14 mb-2 relative z-10">
          <button
            onClick={scrollToBottom}
            className="bg-white shadow-lg border border-slate-200 rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {unreadCount > 0 ? `새 메시지 ${unreadCount}개` : "아래로"}
          </button>
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl mb-2 border border-blue-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600">{replyTo.sender} 에게 답장</p>
            <p className="text-xs text-blue-400 truncate">{replyTo.text}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 relative pt-3 border-t border-slate-100">
        {/* @mention dropdown */}
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 max-h-40 overflow-y-auto">
            {filteredMembers.map((m, i) => (
              <button
                key={m.id}
                onMouseDown={(e) => { e.preventDefault(); insertMention(m.name); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  i === mentionIndex ? "bg-[#3182F6]/10 text-[#3182F6]" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-[#3182F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {m.name.charAt(0)}
                </span>
                <span className="font-medium">{m.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className={`${I} flex-1`}
            value={text}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? `${replyTo.sender}에게 답장...` : "메시지를 입력하세요... (@으로 멘션)"}
          />
          <button className={`${B} flex-shrink-0`} onClick={send}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
