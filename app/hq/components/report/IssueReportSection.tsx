"use client";
import { useState } from "react";
import { IssueReport } from "@/app/hq/types";
import { I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";
import { StatusBadge, FeedbackSection, CommentSection, priorityColor, printIssueReport } from "./ReportHelpers";

interface Props {
  issues: (IssueReport & { author?: string; feedback?: string })[];
  userName: string;
  canApprove: boolean;
  // Form state
  iTitle: string; setITitle: (v: string) => void;
  iDesc: string; setIDesc: (v: string) => void;
  iPriority: string; setIPriority: (v: string) => void;
  iStatus: string; setIStatus: (v: string) => void;
  // Edit state
  editId: string | null; setEditId: (id: string | null) => void;
  editTitle: string; setEditTitle: (v: string) => void;
  editDesc: string; setEditDesc: (v: string) => void;
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
  addIssue: () => void;
  approveReport: (id: string, action: "approved" | "rejected") => void;
  checkReport: (id: string) => void;
  submitFeedback: (id: string) => void;
  saveEdit: (id: string, type: "daily" | "issue" | "project") => void;
  addComment: (id: string) => void;
  // Delete permissions (HQ 권한 관리)
  canDelete?: boolean;
  deleteReport?: (id: string) => void;
  isAdmin?: boolean;
}

export default function IssueReportSection(props: Props) {
  const { displayName } = useTeamDisplayNames();
  const {
    issues, userName, canApprove,
    iTitle, setITitle, iDesc, setIDesc, iPriority, setIPriority, iStatus, setIStatus,
    editId, setEditId, editTitle, setEditTitle, editDesc, setEditDesc,
    feedbackId, feedbackText, setFeedbackId, setFeedbackText,
    commentMap, commentTarget, commentText, setCommentTarget, setCommentText,
    addIssue, approveReport, checkReport, submitFeedback, saveEdit, addComment,
    canDelete, deleteReport, isAdmin,
  } = props;

  return (
    <>
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">이슈 보고</h3>
        <div className="space-y-3">
          <div>
            <label className={L}>제목</label>
            <input className={I} value={iTitle} onChange={(e) => setITitle(e.target.value)} placeholder="이슈 제목" />
          </div>
          <div>
            <label className={L}>설명</label>
            <textarea className={`${I} min-h-[80px]`} rows={3} value={iDesc} onChange={(e) => setIDesc(e.target.value)} placeholder="이슈 상세 설명" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={L}>우선순위</label>
              <select className={I} value={iPriority} onChange={(e) => setIPriority(e.target.value)}>
                <option>높음</option><option>중간</option><option>낮음</option>
              </select>
            </div>
            <div>
              <label className={L}>상태</label>
              <select className={I} value={iStatus} onChange={(e) => setIStatus(e.target.value)}>
                <option>신규</option><option>진행중</option><option>완료</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button className={B} onClick={addIssue}>제출</button>
          </div>
        </div>
      </div>

      <IssueList issues={issues} userName={userName} canApprove={canApprove}
        editId={editId} setEditId={setEditId} editTitle={editTitle} setEditTitle={setEditTitle} editDesc={editDesc} setEditDesc={setEditDesc}
        feedbackId={feedbackId} feedbackText={feedbackText} setFeedbackId={setFeedbackId} setFeedbackText={setFeedbackText}
        commentMap={commentMap} commentTarget={commentTarget} commentText={commentText}
        setCommentTarget={setCommentTarget} setCommentText={setCommentText}
        approveReport={approveReport} checkReport={checkReport} submitFeedback={submitFeedback}
        saveEdit={saveEdit} addComment={addComment} canDelete={canDelete} deleteReport={deleteReport} isAdmin={isAdmin}
      />
    </>
  );
}

function IssueList(props: Omit<Props, "iTitle" | "setITitle" | "iDesc" | "setIDesc" | "iPriority" | "setIPriority" | "iStatus" | "setIStatus" | "addIssue">) {
  const { displayName } = useTeamDisplayNames();
  const {
    issues, userName, canApprove,
    editId, setEditId, editTitle, setEditTitle, editDesc, setEditDesc,
    feedbackId, feedbackText, setFeedbackId, setFeedbackText,
    commentMap, commentTarget, commentText, setCommentTarget, setCommentText,
    approveReport, checkReport, submitFeedback, saveEdit, addComment,
    canDelete, deleteReport, isAdmin,
  } = props;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpandedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-2">
      {issues.map((iss) => {
        const isOpen = expandedIds.has(iss.id) || editId === iss.id;
        return (
          <div key={iss.id} className={C}>
            <button onClick={() => toggle(iss.id)} className="w-full flex items-center justify-between text-left">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`${BADGE} ${priorityColor[iss.priority] ?? priorityColor["중간"]}`}>{iss.priority}</span>
                <span className="text-sm font-semibold text-slate-800 truncate">{iss.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge st={iss.reportStatus ?? "submitted"} />
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M3 5l4 4 4-4" />
                </svg>
              </div>
            </button>
            {isOpen && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                {editId === iss.id ? (
                  <div className="space-y-2">
                    <input className={I} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    <textarea className={`${I} min-h-[60px]`} rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                    <div className="flex gap-2 justify-end">
                      <button className={B2} onClick={() => setEditId(null)}>취소</button>
                      <button className={B} onClick={() => saveEdit(iss.id, "issue")}>저장</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{iss.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{displayName(iss.author ?? userName)}</span>
                      {(iss.author === userName || isAdmin) && (
                        <button onClick={() => { setEditId(iss.id); setEditTitle(iss.title); setEditDesc(iss.description); }} className="text-slate-400 hover:text-[#3182F6] font-semibold">수정</button>
                      )}
                      {(canDelete || iss.author === userName) && deleteReport && (
                        <button onClick={() => deleteReport(iss.id)} className="text-slate-400 hover:text-red-500 font-semibold">삭제</button>
                      )}
                      <button onClick={() => printIssueReport(iss)} className="text-slate-400 hover:text-[#3182F6] font-semibold">PDF 출력</button>
                    </div>
                  </>
                )}
                {canApprove && iss.reportStatus === "submitted" && iss.author !== userName && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button className="rounded-xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-sm hover:bg-emerald-100 transition-all" onClick={() => approveReport(iss.id, "approved")}>승인</button>
                    <button className="rounded-xl bg-red-50 text-red-600 font-semibold px-4 py-2 text-sm hover:bg-red-100 transition-all" onClick={() => approveReport(iss.id, "rejected")}>반려</button>
                  </div>
                )}
                <FeedbackSection item={iss} canApprove={canApprove} userName={userName}
                  feedbackId={feedbackId} feedbackText={feedbackText}
                  setFeedbackId={setFeedbackId} setFeedbackText={setFeedbackText}
                  submitFeedback={submitFeedback} />
                <CommentSection reportId={iss.id} commentMap={commentMap}
                  commentTarget={commentTarget} commentText={commentText}
                  setCommentTarget={setCommentTarget} setCommentText={setCommentText}
                  addComment={addComment} />
              </div>
            )}
          </div>
        );
      })}
      {issues.length === 0 && <div className="text-center py-8 text-slate-400">이슈 보고가 없습니다</div>}
    </div>
  );
}
