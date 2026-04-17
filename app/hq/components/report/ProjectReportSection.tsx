"use client";
import { useState } from "react";
import { ProjectReport } from "@/app/hq/types";
import { I, C, L, B, B2, useTeamDisplayNames } from "@/app/hq/utils";
import { StatusBadge, FeedbackSection, CommentSection } from "./ReportHelpers";

interface Props {
  projects: (ProjectReport & { author?: string; feedback?: string })[];
  userName: string;
  canApprove: boolean;
  today: string;
  // Form state
  pTitle: string; setPTitle: (v: string) => void;
  pProgress: number; setPProgress: (v: number) => void;
  pDeadline: string; setPDeadline: (v: string) => void;
  pDesc: string; setPDesc: (v: string) => void;
  // Edit state
  editId: string | null; setEditId: (id: string | null) => void;
  editTitle: string; setEditTitle: (v: string) => void;
  editDesc: string; setEditDesc: (v: string) => void;
  editProgress?: number; setEditProgress?: (v: number) => void;
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
  addProject: () => void;
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

export default function ProjectReportSection(props: Props) {
  const { displayName } = useTeamDisplayNames();
  const {
    projects, userName, canApprove, today,
    pTitle, setPTitle, pProgress, setPProgress, pDeadline, setPDeadline, pDesc, setPDesc,
    editId, setEditId, editTitle, setEditTitle, editDesc, setEditDesc,
    editProgress, setEditProgress,
    feedbackId, feedbackText, setFeedbackId, setFeedbackText,
    commentMap, commentTarget, commentText, setCommentTarget, setCommentText,
    addProject, approveReport, checkReport, submitFeedback, saveEdit, addComment,
    canDelete, deleteReport, isAdmin,
  } = props;

  return (
    <>
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">프로젝트 보고</h3>
        <div className="space-y-3">
          <div>
            <label className={L}>프로젝트명</label>
            <input className={I} value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="프로젝트 이름" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={L}>진행률 ({pProgress}%)</label>
              <input type="range" min={0} max={100} value={pProgress} onChange={(e) => setPProgress(Number(e.target.value))} className="w-full accent-[#3182F6]" />
            </div>
            <div>
              <label className={L}>마감일</label>
              <input type="date" className={I} value={pDeadline} onChange={(e) => setPDeadline(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={L}>설명</label>
            <textarea className={`${I} min-h-[80px]`} rows={3} value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="프로젝트 상세 설명" />
          </div>
          <div className="flex justify-end">
            <button className={B} onClick={addProject}>제출</button>
          </div>
        </div>
      </div>

      <ProjectList projects={projects} userName={userName} canApprove={canApprove} today={today}
        editId={editId} setEditId={setEditId} editTitle={editTitle} setEditTitle={setEditTitle} editDesc={editDesc} setEditDesc={setEditDesc}
        editProgress={editProgress} setEditProgress={setEditProgress}
        feedbackId={feedbackId} feedbackText={feedbackText} setFeedbackId={setFeedbackId} setFeedbackText={setFeedbackText}
        commentMap={commentMap} commentTarget={commentTarget} commentText={commentText}
        setCommentTarget={setCommentTarget} setCommentText={setCommentText}
        approveReport={approveReport} checkReport={checkReport} submitFeedback={submitFeedback}
        saveEdit={saveEdit} addComment={addComment} canDelete={canDelete} deleteReport={deleteReport} isAdmin={isAdmin}
      />
    </>
  );
}

function ProjectList(props: Omit<Props, "pTitle" | "setPTitle" | "pProgress" | "setPProgress" | "pDeadline" | "setPDeadline" | "pDesc" | "setPDesc" | "addProject">) {
  const { displayName } = useTeamDisplayNames();
  const {
    projects, userName, canApprove,
    editId, setEditId, editTitle, setEditTitle, editDesc, setEditDesc,
    editProgress, setEditProgress,
    feedbackId, feedbackText, setFeedbackId, setFeedbackText,
    commentMap, commentTarget, commentText, setCommentTarget, setCommentText,
    approveReport, checkReport, submitFeedback, saveEdit, addComment,
    canDelete, deleteReport, isAdmin,
  } = props;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpandedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-2">
      {projects.map((p) => {
        const isOpen = expandedIds.has(p.id) || editId === p.id;
        return (
          <div key={p.id} className={C}>
            <button onClick={() => toggle(p.id)} className="w-full flex items-center justify-between text-left">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-sm font-semibold text-slate-800 truncate">{p.title}</span>
                <span className="text-xs font-semibold text-[#3182F6] flex-shrink-0">{p.progress}%</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge st={p.reportStatus ?? "submitted"} />
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M3 5l4 4 4-4" />
                </svg>
              </div>
            </button>
            {!isOpen && (
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#3182F6] rounded-full transition-all" style={{ width: `${p.progress}%` }} />
              </div>
            )}
            {isOpen && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                {editId === p.id ? (
                  <div className="space-y-2">
                    <input className={I} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    <textarea className={`${I} min-h-[60px]`} rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">진행률 ({editProgress ?? 0}%)</label>
                      <input type="range" min={0} max={100} value={editProgress ?? 0}
                        onChange={e => setEditProgress?.(Number(e.target.value))} className="w-full accent-[#3182F6]" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button className={B2} onClick={() => setEditId(null)}>취소</button>
                      <button className={B} onClick={() => saveEdit(p.id, "project")}>저장</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{p.description}</p>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>진행률</span>
                        <span className="font-semibold text-[#3182F6]">{p.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#3182F6] rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{displayName(p.author ?? userName)}</span>
                      <span>마감: {p.deadline}</span>
                      {(p.author === userName || isAdmin) && (
                        <button onClick={() => { setEditId(p.id); setEditTitle(p.title); setEditDesc(p.description); setEditProgress?.(p.progress); }} className="text-slate-400 hover:text-[#3182F6] font-semibold">수정</button>
                      )}
                      {(canDelete || p.author === userName) && deleteReport && (
                        <button onClick={() => deleteReport(p.id)} className="text-slate-400 hover:text-red-500 font-semibold">삭제</button>
                      )}
                    </div>
                  </>
                )}
                {canApprove && p.reportStatus === "submitted" && p.author !== userName && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button className="rounded-xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-sm hover:bg-emerald-100 transition-all" onClick={() => approveReport(p.id, "approved")}>승인</button>
                    <button className="rounded-xl bg-red-50 text-red-600 font-semibold px-4 py-2 text-sm hover:bg-red-100 transition-all" onClick={() => approveReport(p.id, "rejected")}>반려</button>
                  </div>
                )}
                <FeedbackSection item={p} canApprove={canApprove} userName={userName}
                  feedbackId={feedbackId} feedbackText={feedbackText}
                  setFeedbackId={setFeedbackId} setFeedbackText={setFeedbackText}
                  submitFeedback={submitFeedback} />
                <CommentSection reportId={p.id} commentMap={commentMap}
                  commentTarget={commentTarget} commentText={commentText}
                  setCommentTarget={setCommentTarget} setCommentText={setCommentText}
                  addComment={addComment} />
              </div>
            )}
          </div>
        );
      })}
      {projects.length === 0 && <div className="text-center py-8 text-slate-400">프로젝트 보고가 없습니다</div>}
    </div>
  );
}
