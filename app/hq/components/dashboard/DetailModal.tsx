"use client";
import { I, B, BADGE, ST, useTeamDisplayNames } from "@/app/hq/utils";

type Comment = { id: string; author: string; text: string; time: string };
type DetailItem = { type: "task" | "feedback"; id: string; title: string; status: string; extra: Record<string, string> };

interface Props {
  detail: DetailItem;
  comments: Record<string, Comment[]>;
  commentText: string;
  setCommentText: (v: string) => void;
  addComment: (itemId: string) => void;
  onClose: () => void;
}

export default function DetailModal({ detail, comments, commentText, setCommentText, addComment, onClose }: Props) {
  const { displayName } = useTeamDisplayNames();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { onClose(); setCommentText(""); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{detail.type === "task" ? "✅" : "🐛"}</span>
            <h3 className="text-lg font-bold text-slate-900 flex-1">{detail.title}</h3>
            <span className={`${BADGE} ${(ST[detail.status] ?? ST.pending).bg}`}>{(ST[detail.status] ?? ST.pending).label}</span>
            <button onClick={() => { onClose(); setCommentText(""); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
          </div>
          <p className="text-xs text-slate-400">{detail.type === "task" ? "태스크" : "피드백"}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(detail.extra).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{k}</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{v}</p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">댓글 ({(comments[detail.id] ?? []).length})</h4>
            {(comments[detail.id] ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">아직 댓글이 없습니다</p>
            ) : (
              <div className="space-y-1.5">
                {(comments[detail.id] ?? []).map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-5 h-5 bg-[#3182F6] rounded-full flex items-center justify-center">
                        <span className="text-[9px] text-white font-bold">{displayName(c.author)[0]}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{displayName(c.author)}</span>
                      <span className="text-[10px] text-slate-400">{c.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 pl-7">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
          <input className={`${I} flex-1`} placeholder="댓글을 입력하세요..."
            value={commentText} onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addComment(detail.id); }} />
          <button className={B} onClick={() => addComment(detail.id)}>전송</button>
        </div>
      </div>
    </div>
  );
}
