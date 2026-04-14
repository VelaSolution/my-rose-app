"use client";
import { DailyReport } from "@/app/hq/types";
import { I, C, L, B, B2, useTeamDisplayNames } from "@/app/hq/utils";
import { StatusBadge, FeedbackSection, CommentSection } from "./ReportHelpers";

interface Props {
  dailies: (DailyReport & { author?: string; feedback?: string })[];
  userName: string;
  canApprove: boolean;
  // Form state
  dDate: string; setDDate: (v: string) => void;
  dContent: string; setDContent: (v: string) => void;
  dProblems: string; setDProblems: (v: string) => void;
  dNext: string; setDNext: (v: string) => void;
  // Template
  showTemplates: boolean; setShowTemplates: (v: boolean) => void;
  templates: { label: string; content: string; problems: string; next: string }[];
  applyTemplate: (tpl: { label: string; content: string; problems: string; next: string }) => void;
  // Edit state
  editId: string | null; setEditId: (id: string | null) => void;
  editContent: string; setEditContent: (v: string) => void;
  editProblems: string; setEditProblems: (v: string) => void;
  editNext: string; setEditNext: (v: string) => void;
  // Feedback state
  feedbackId: string | null; feedbackText: string;
  setFeedbackId: (id: string | null) => void;
  setFeedbackText: (t: string) => void;
  // Comment state
  commentMap: Record<string, { id: string; author: string; text: string; time: string }[]>;
  commentTarget: string | null; commentText: string;
  setCommentTarget: (id: string | null) => void;
  setCommentText: (t: string) => void;
  // Actions
  addDaily: () => void;
  approveReport: (id: string, action: "approved" | "rejected") => void;
  checkReport: (id: string) => void;
  submitFeedback: (id: string) => void;
  saveEdit: (id: string, type: "daily" | "issue" | "project") => void;
  addComment: (id: string) => void;
}

export default function DailyReportSection(props: Props) {
  const { displayName } = useTeamDisplayNames();
  const {
    dailies, userName, canApprove,
    dDate, setDDate, dContent, setDContent, dProblems, setDProblems, dNext, setDNext,
    showTemplates, setShowTemplates, templates, applyTemplate,
    editId, setEditId, editContent, setEditContent, editProblems, setEditProblems, editNext, setEditNext,
    feedbackId, feedbackText, setFeedbackId, setFeedbackText,
    commentMap, commentTarget, commentText, setCommentTarget, setCommentText,
    addDaily, approveReport, checkReport, submitFeedback, saveEdit, addComment,
  } = props;

  return (
    <>
      <div className={C}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">일일 보고 작성</h3>
          <div className="relative">
            <button className={B2} onClick={() => setShowTemplates(!showTemplates)}>
              템플릿
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(tpl)}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-[#3182F6]/5 hover:text-[#3182F6] transition-colors border-b border-slate-100 last:border-0 font-medium"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className={L}>날짜</label>
            <input type="date" className={I} value={dDate} onChange={(e) => setDDate(e.target.value)} />
          </div>
          <div>
            <label className={L}>업무 내용</label>
            <textarea className={`${I} min-h-[80px]`} rows={3} value={dContent} onChange={(e) => setDContent(e.target.value)} placeholder="오늘의 업무 내용" />
          </div>
          <div>
            <label className={L}>문제/이슈</label>
            <textarea className={`${I} min-h-[60px]`} rows={2} value={dProblems} onChange={(e) => setDProblems(e.target.value)} placeholder="발생한 문제사항" />
          </div>
          <div>
            <label className={L}>내일 계획</label>
            <textarea className={`${I} min-h-[60px]`} rows={2} value={dNext} onChange={(e) => setDNext(e.target.value)} placeholder="내일 진행 예정 업무" />
          </div>
          <div className="flex justify-end">
            <button className={B} onClick={addDaily}>제출</button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {dailies.map((d) => (
          <div key={d.id} className={C}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{displayName(d.author ?? userName)}</span>
                <span className="text-xs text-slate-400">{d.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge st={d.status ?? "submitted"} />
                {canApprove && d.status === "submitted" && (
                  <button onClick={() => checkReport(d.id)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors" title="확인">✓ 확인</button>
                )}
              </div>
            </div>
            {editId === d.id ? (
              <div className="space-y-2">
                <textarea className={`${I} min-h-[60px]`} rows={3} value={editContent} onChange={e => setEditContent(e.target.value)} />
                <textarea className={`${I} min-h-[40px]`} rows={2} value={editProblems} onChange={e => setEditProblems(e.target.value)} placeholder="문제/이슈" />
                <textarea className={`${I} min-h-[40px]`} rows={2} value={editNext} onChange={e => setEditNext(e.target.value)} placeholder="내일 계획" />
                <div className="flex gap-2 justify-end">
                  <button className={B2} onClick={() => setEditId(null)}>취소</button>
                  <button className={B} onClick={() => saveEdit(d.id, "daily")}>저장</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{d.content}</p>
                {d.problems && <p className="text-sm text-red-600 mb-1"><span className="font-semibold">문제:</span> {d.problems}</p>}
                {d.nextSteps && <p className="text-sm text-blue-600"><span className="font-semibold">계획:</span> {d.nextSteps}</p>}
                {d.author === userName && d.status !== "approved" && (
                  <button onClick={() => { setEditId(d.id); setEditContent(d.content); setEditProblems(d.problems); setEditNext(d.nextSteps); }} className="text-xs text-slate-400 hover:text-[#3182F6] font-semibold mt-2">수정</button>
                )}
              </>
            )}
            {canApprove && d.status === "submitted" && d.author !== userName && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button className="rounded-xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-sm hover:bg-emerald-100 transition-all" onClick={() => approveReport(d.id, "approved")}>승인</button>
                <button className="rounded-xl bg-red-50 text-red-600 font-semibold px-4 py-2 text-sm hover:bg-red-100 transition-all" onClick={() => approveReport(d.id, "rejected")}>반려</button>
              </div>
            )}
            <FeedbackSection item={d} canApprove={canApprove} userName={userName}
              feedbackId={feedbackId} feedbackText={feedbackText}
              setFeedbackId={setFeedbackId} setFeedbackText={setFeedbackText}
              submitFeedback={submitFeedback} />
            <CommentSection reportId={d.id} commentMap={commentMap}
              commentTarget={commentTarget} commentText={commentText}
              setCommentTarget={setCommentTarget} setCommentText={setCommentText}
              addComment={addComment} />
          </div>
        ))}
        {dailies.length === 0 && <div className="text-center py-8 text-slate-400">일일 보고가 없습니다</div>}
      </div>
    </>
  );
}
