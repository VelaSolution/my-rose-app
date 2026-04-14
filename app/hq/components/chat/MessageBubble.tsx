"use client";
import { useTeamDisplayNames } from "@/app/hq/utils";
import { EnrichedMsg, REACTIONS, avatarColor } from "./chatHelpers";

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

interface Props {
  m: EnrichedMsg;
  userName: string;
  onReply: (r: { id: string; sender: string; text: string }) => void;
  onDelete: (id: string) => void;
  onReaction: (msgId: string, emoji: string) => void;
  showReactionPicker: string | null;
  setShowReactionPicker: (id: string | null) => void;
}

export default function MessageBubble({
  m, userName, onReply, onDelete, onReaction, showReactionPicker, setShowReactionPicker,
}: Props) {
  const { displayName } = useTeamDisplayNames();
  const isMe = m.sender === userName;
  const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;

  return (
    <div className={`flex items-end gap-2.5 mb-3 ${isMe ? "flex-row-reverse" : ""}`}>
      {!isMe && (
        <div className={`w-8 h-8 rounded-full ${avatarColor(m.sender)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
          {displayName(m.sender).charAt(0)}
        </div>
      )}
      <div className={`max-w-[70%] group ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && <p className="text-xs font-semibold text-slate-500 mb-1 ml-1">{displayName(m.sender)}</p>}
        {m.reply_to && (
          <div className={`rounded-lg px-3 py-1.5 mb-1 text-xs border-l-2 ${isMe ? "bg-blue-400/20 border-blue-300 text-blue-100" : "bg-slate-50 border-slate-300 text-slate-500"}`}>
            <span className="font-semibold">{displayName(m.reply_to.sender)}</span>
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
