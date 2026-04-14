"use client";
import { REPORT_ST } from "@/app/hq/types";
import { I, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

export const priorityColor: Record<string, string> = {
  "높음": "bg-red-50 text-red-700",
  "중간": "bg-amber-50 text-amber-700",
  "낮음": "bg-slate-50 text-slate-600",
};

export function StatusBadge({ st }: { st: string }) {
  const r = REPORT_ST[st] ?? REPORT_ST.draft;
  const sizeClass = "px-3 py-1.5 text-xs";
  return (
    <span className={`inline-flex items-center rounded-xl font-bold shadow-sm ${sizeClass} ${r.bg}`}>
      {st === "approved" && <span className="mr-1">&#10003;</span>}
      {st === "rejected" && <span className="mr-1">&#10007;</span>}
      {r.label}
    </span>
  );
}

export function FeedbackSection({
  item, canApprove, userName,
  feedbackId, feedbackText, setFeedbackId, setFeedbackText, submitFeedback,
}: {
  item: { id: string; feedback?: string; author?: string };
  canApprove: boolean;
  userName: string;
  feedbackId: string | null;
  feedbackText: string;
  setFeedbackId: (id: string | null) => void;
  setFeedbackText: (t: string) => void;
  submitFeedback: (id: string) => void;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      {item.feedback && (
        <div className="mb-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
          <p className="text-[10px] font-bold text-amber-600 mb-0.5">승인자 코멘트</p>
          <p className="text-xs text-amber-800">{item.feedback}</p>
        </div>
      )}
      {canApprove && item.author !== userName && (
        <>
          {feedbackId === item.id ? (
            <div className="flex gap-2 items-end">
              <textarea
                className={`${I} flex-1 min-h-[40px] text-xs`}
                rows={2}
                placeholder="코멘트를 입력하세요..."
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
              />
              <button className="rounded-xl bg-amber-50 text-amber-700 font-semibold px-3 py-2 text-xs hover:bg-amber-100 transition-all shrink-0" onClick={() => submitFeedback(item.id)}>등록</button>
              <button className="rounded-xl bg-slate-100 text-slate-500 font-semibold px-3 py-2 text-xs hover:bg-slate-200 transition-all shrink-0" onClick={() => { setFeedbackId(null); setFeedbackText(""); }}>취소</button>
            </div>
          ) : (
            <button className="text-xs text-slate-400 hover:text-[#3182F6] font-semibold transition-colors" onClick={() => { setFeedbackId(item.id); setFeedbackText(item.feedback ?? ""); }}>
              {item.feedback ? "코멘트 수정" : "+ 코멘트 추가"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function CommentSection({
  reportId, commentMap, commentTarget, commentText,
  setCommentTarget, setCommentText, addComment,
}: {
  reportId: string;
  commentMap: Record<string, { id: string; author: string; text: string; time: string }[]>;
  commentTarget: string | null;
  commentText: string;
  setCommentTarget: (id: string | null) => void;
  setCommentText: (t: string) => void;
  addComment: (id: string) => void;
}) {
  const { displayName } = useTeamDisplayNames();
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-bold text-slate-500 mb-2">댓글 ({(commentMap[reportId] ?? []).length})</p>
      {(commentMap[reportId] ?? []).map(c => (
        <div key={c.id} className="flex items-start gap-2 mb-2">
          <div className="w-5 h-5 bg-[#3182F6] rounded-full flex items-center justify-center shrink-0"><span className="text-[9px] text-white font-bold">{displayName(c.author)[0]}</span></div>
          <div><span className="text-xs font-semibold text-slate-700">{displayName(c.author)}</span> <span className="text-[10px] text-slate-400">{new Date(c.time).toLocaleString("ko-KR")}</span><p className="text-xs text-slate-600">{c.text}</p></div>
        </div>
      ))}
      {commentTarget === reportId ? (
        <div className="flex gap-2 mt-1">
          <input className={`${I} flex-1 text-xs`} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="댓글 입력..." onKeyDown={e => { if (e.key === "Enter") addComment(reportId); }} />
          <button className="rounded-xl bg-[#3182F6] text-white font-semibold px-3 py-1.5 text-xs" onClick={() => addComment(reportId)}>등록</button>
        </div>
      ) : (
        <button onClick={() => setCommentTarget(reportId)} className="text-xs text-slate-400 hover:text-[#3182F6] font-semibold">+ 댓글</button>
      )}
    </div>
  );
}
