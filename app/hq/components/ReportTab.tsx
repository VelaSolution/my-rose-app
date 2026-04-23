"use client";
import { useState, useEffect } from "react";
import { HQRole, DailyReport, IssueReport, ProjectReport } from "@/app/hq/types";
import { sb, today, fmt, I, C, L, B, B2, useTeamDisplayNames } from "@/app/hq/utils";
import WeeklyReport from "@/app/hq/components/report/WeeklyReport";
import DailyReportSection from "@/app/hq/components/report/DailyReportSection";
import IssueReportSection from "@/app/hq/components/report/IssueReportSection";
import ProjectReportSection from "@/app/hq/components/report/ProjectReportSection";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

type SubTab = "weekly" | "daily" | "issue" | "project";

const TEMPLATES = [
  { label: "일일 업무 보고", content: `[오늘 한 일]\n- \n\n[내일 할 일]\n- \n\n[이슈사항]\n- `, problems: "", next: "" },
  { label: "주간 보고", content: `[이번 주 성과]\n- \n\n[다음 주 계획]\n- \n\n[건의사항]\n- `, problems: "", next: "" },
  { label: "프로젝트 진행", content: `[진행률]\n- \n\n[이슈]\n- \n\n[일정변경]\n- \n\n[리스크]\n- `, problems: "", next: "" },
];

export default function ReportTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [sub, setSub] = useState<SubTab>("weekly");
  const [showTemplates, setShowTemplates] = useState(false);

  const [weeklyText, setWeeklyText] = useState("");
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const [dailies, setDailies] = useState<(DailyReport & { author?: string; feedback?: string })[]>([]);
  const [dDate, setDDate] = useState(today());
  const [dContent, setDContent] = useState("");
  const [dProblems, setDProblems] = useState("");
  const [dNext, setDNext] = useState("");

  const [issues, setIssues] = useState<(IssueReport & { author?: string; feedback?: string })[]>([]);
  const [iTitle, setITitle] = useState("");
  const [iDesc, setIDesc] = useState("");
  const [iPriority, setIPriority] = useState("중간");
  const [iStatus, setIStatus] = useState("신규");

  const [projects, setProjects] = useState<(ProjectReport & { author?: string; feedback?: string })[]>([]);
  const [pTitle, setPTitle] = useState("");
  const [pProgress, setPProgress] = useState(0);
  const [pDeadline, setPDeadline] = useState(today());
  const [pDesc, setPDesc] = useState("");

  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editProblems, setEditProblems] = useState("");
  const [editNext, setEditNext] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editProgress, setEditProgress] = useState(0);

  const [commentMap, setCommentMap] = useState<Record<string, { id: string; author: string; text: string; time: string }[]>>({});
  const [commentText, setCommentText] = useState("");
  const [commentTarget, setCommentTarget] = useState<string | null>(null);

  const canApprove = myRole === "대표" || myRole === "이사" || myRole === "팀장";
  const [approver, setApprover] = useState("");
  const [approvers, setApprovers] = useState<{ name: string; hqRole: string }[]>([]);

  useEffect(() => {
    (async () => {
      const s = sb(); if (!s) return;
      const { data } = await s.from("hq_team").select("name, hq_role").order("created_at", { ascending: true });
      if (data) setApprovers(data.map((d: any) => ({ name: d.name, hqRole: d.hq_role })));
    })();
  }, []);

  /** 보고서 작성 시 전자결재에 자동 기안 */
  const createApprovalForReport = async (type: string, title: string, content: string, approverName: string) => {
    const s = sb(); if (!s) return;
    const line = approverName ? JSON.stringify([approverName]) : JSON.stringify([userName]);
    await s.from("hq_approvals").insert({
      title: `[${type}] ${title}`,
      content,
      author: userName,
      approver: line,
      status: "대기",
      approved_steps: "0",
    });
  };

  const loadDailies = async () => {
    const s = sb(); if (!s) return;
    const { data } = await s.from("hq_reports").select("*").eq("report_type", "daily").order("created_at", { ascending: false });
    if (data) setDailies(data.map((d: any) => ({ id: d.id, date: d.created_at?.slice(0, 10) ?? "", content: d.content ?? "", problems: d.problems ?? "", nextSteps: d.next_steps ?? "", status: d.status ?? "submitted", approver: d.approver, author: d.author, feedback: d.feedback ?? "" })));
  };

  const loadIssues = async () => {
    const s = sb(); if (!s) return;
    const { data } = await s.from("hq_reports").select("*").eq("report_type", "issue").order("created_at", { ascending: false });
    if (data) setIssues(data.map((d: any) => ({ id: d.id, title: d.title ?? "", description: d.description ?? "", priority: d.priority ?? "중간", status: d.status ?? "신규", reportStatus: d.status ?? "submitted", approver: d.approver, author: d.author, feedback: d.feedback ?? "" })));
  };

  const loadProjects = async () => {
    const s = sb(); if (!s) return;
    const { data } = await s.from("hq_reports").select("*").eq("report_type", "project").order("created_at", { ascending: false });
    if (data) setProjects(data.map((d: any) => ({ id: d.id, title: d.title ?? "", progress: d.progress ?? 0, description: d.description ?? "", deadline: d.deadline ?? "", reportStatus: d.status ?? "submitted", approver: d.approver, author: d.author, feedback: d.feedback ?? "" })));
  };

  const generateWeekly = async () => {
    setWeeklyLoading(true);
    const s = sb(); if (!s) { setWeeklyLoading(false); return; }
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [kpiRes, goalRes, taskRes, aarRes] = await Promise.all([
      s.from("hq_metrics").select("*").gte("date", sevenDaysAgo.slice(0, 10)).order("date", { ascending: false }),
      s.from("hq_goals").select("*").order("created_at", { ascending: false }).limit(10),
      s.from("hq_tasks").select("*").order("created_at", { ascending: false }).limit(20),
      s.from("hq_aar").select("*").gte("date", sevenDaysAgo.slice(0, 10)).order("date", { ascending: false }),
    ]);
    const lines: string[] = [];
    lines.push(`=== 주간 보고서 (${sevenDaysAgo.slice(0, 10)} ~ ${today()}) ===`);
    lines.push(`작성자: ${userName}\n`);
    lines.push("[ KPI 현황 ]");
    if (kpiRes.data?.length) kpiRes.data.forEach((k: any) => lines.push(`  ${k.date} | 매출 ${fmt(k.revenue ?? 0)}원 | 사용자 ${fmt(k.users_count ?? 0)}명 | 전환율 ${k.conversion_rate ?? 0}%`));
    else lines.push("  이번 주 KPI 데이터 없음");
    lines.push("");
    lines.push("[ 목표 달성률 ]");
    if (goalRes.data?.length) goalRes.data.slice(0, 5).forEach((g: any) => { const pct = g.target_value ? Math.round((g.current_value / g.target_value) * 100) : 0; lines.push(`  ${g.title} — ${pct}% (${fmt(g.current_value)}/${fmt(g.target_value)}) [${g.status}]`); });
    else lines.push("  등록된 목표 없음");
    lines.push("");
    lines.push("[ 태스크 진행 ]");
    if (taskRes.data?.length) { const byStatus: Record<string, number> = {}; taskRes.data.forEach((t: any) => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; }); Object.entries(byStatus).forEach(([s, c]) => lines.push(`  ${s}: ${c}건`)); }
    else lines.push("  등록된 태스크 없음");
    lines.push("");
    lines.push("[ AAR (사후검토) ]");
    if (aarRes.data?.length) aarRes.data.forEach((a: any) => lines.push(`  ${a.date} | 목표: ${a.goal} | 결과: ${a.result}`));
    else lines.push("  이번 주 AAR 없음");
    setWeeklyText(lines.join("\n"));
    setWeeklyLoading(false);
  };

  useEffect(() => {
    if (sub === "weekly") generateWeekly();
    if (sub === "daily") loadDailies();
    if (sub === "issue") loadIssues();
    if (sub === "project") loadProjects();
  }, [sub]);

  const addDaily = async () => {
    if (!dContent.trim()) { flash("내용을 입력하세요"); return; }
    if (!approver) { flash("결재자를 선택하세요"); return; }
    const s = sb(); if (!s) return;
    await s.from("hq_reports").insert({ report_type: "daily", content: dContent.trim(), problems: dProblems.trim(), next_steps: dNext.trim(), status: "submitted", author: userName });
    const body = `[일일보고서]\n\n■ 보고일: ${dDate}\n\n■ 금일 완료 업무:\n${dContent.trim()}\n\n■ 이슈사항:\n${dProblems.trim() || "(없음)"}\n\n■ 익일 예정:\n${dNext.trim() || "(없음)"}`;
    await createApprovalForReport("일일보고서", `${dDate} 일일보고`, body, approver);
    setDContent(""); setDProblems(""); setDNext("");
    flash("일일보고 등록 + 결재 요청 완료"); loadDailies();
  };

  const addIssue = async () => {
    if (!iTitle.trim()) { flash("제목을 입력하세요"); return; }
    if (!approver) { flash("결재자를 선택하세요"); return; }
    const s = sb(); if (!s) return;
    await s.from("hq_reports").insert({ report_type: "issue", title: iTitle.trim(), description: iDesc.trim(), priority: iPriority, status: "submitted", author: userName });
    const body = `[이슈보고서]\n\n• 제목: ${iTitle.trim()}\n• 우선순위: ${iPriority}\n\n■ 상세 내용:\n${iDesc.trim() || "(미입력)"}`;
    await createApprovalForReport("이슈보고서", iTitle.trim(), body, approver);
    setITitle(""); setIDesc(""); setIPriority("중간"); setIStatus("신규");
    flash("이슈 보고 등록 + 결재 요청 완료"); loadIssues();
  };

  const addProject = async () => {
    if (!pTitle.trim()) { flash("제목을 입력하세요"); return; }
    if (!approver) { flash("결재자를 선택하세요"); return; }
    const s = sb(); if (!s) return;
    await s.from("hq_reports").insert({ report_type: "project", title: pTitle.trim(), progress: pProgress, deadline: pDeadline, description: pDesc.trim(), status: "submitted", author: userName });
    const body = `[프로젝트보고서]\n\n• 프로젝트명: ${pTitle.trim()}\n• 진행률: ${pProgress}%\n• 마감일: ${pDeadline}\n\n■ 상세 내용:\n${pDesc.trim() || "(미입력)"}`;
    await createApprovalForReport("프로젝트보고서", pTitle.trim(), body, approver);
    setPTitle(""); setPProgress(0); setPDeadline(today()); setPDesc("");
    flash("프로젝트 보고 등록 + 결재 요청 완료"); loadProjects();
  };

  const approveReport = async (id: string, action: "approved" | "rejected") => {
    const s = sb(); if (!s) return;
    await s.from("hq_reports").update({ status: action, approver: userName }).eq("id", id);
    flash(action === "approved" ? "승인 완료" : "반려 완료");
    if (sub === "daily") loadDailies(); if (sub === "issue") loadIssues(); if (sub === "project") loadProjects();
  };

  const submitFeedback = async (id: string) => {
    if (!feedbackText.trim()) { flash("코멘트를 입력하세요"); return; }
    const s = sb(); if (!s) return;
    await s.from("hq_reports").update({ feedback: feedbackText.trim() }).eq("id", id);
    flash("코멘트 등록 완료"); setFeedbackId(null); setFeedbackText("");
    if (sub === "daily") loadDailies(); if (sub === "issue") loadIssues(); if (sub === "project") loadProjects();
  };

  const checkReport = async (id: string) => {
    const s = sb(); if (!s) return;
    await s.from("hq_reports").update({ status: "approved", approver: userName }).eq("id", id);
    flash("확인 완료 ✓");
    if (sub === "daily") loadDailies(); if (sub === "issue") loadIssues(); if (sub === "project") loadProjects();
  };

  const loadComments = async (reportId: string) => {
    const s = sb(); if (!s) return;
    const { data } = await s.from("hq_item_comments").select("*").eq("item_id", reportId).eq("item_type", "report").order("created_at", { ascending: true });
    if (data) setCommentMap(prev => ({ ...prev, [reportId]: data.map((r: any) => ({ id: r.id, author: r.author, text: r.text, time: r.created_at })) }));
  };

  const addComment = async (reportId: string) => {
    if (!commentText.trim()) return;
    const s = sb(); if (!s) return;
    await s.from("hq_item_comments").insert({ item_id: reportId, item_type: "report", author: userName, text: commentText.trim() });
    setCommentText(""); setCommentTarget(null); loadComments(reportId);
  };

  const saveEdit = async (id: string, type: "daily" | "issue" | "project") => {
    const s = sb(); if (!s) return;
    if (type === "daily") { await s.from("hq_reports").update({ content: editContent, problems: editProblems, next_steps: editNext }).eq("id", id); loadDailies(); }
    else if (type === "issue") { await s.from("hq_reports").update({ title: editTitle, description: editDesc }).eq("id", id); loadIssues(); }
    else { await s.from("hq_reports").update({ title: editTitle, description: editDesc, progress: editProgress }).eq("id", id); loadProjects(); }
    setEditId(null); flash("수정 완료");
  };

  /* -- edit/delete 권한 -- */
  const isAdmin = myRole === "대표" || myRole === "이사";
  const canDelete = isAdmin;

  const deleteReport = async (id: string) => {
    if (!confirm("이 보고서를 삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    // 관련 댓글도 삭제
    await s.from("hq_item_comments").delete().eq("item_id", id).eq("item_type", "report");
    const { error } = await s.from("hq_reports").delete().eq("id", id);
    if (error) { flash("삭제 실패: " + error.message); return; }
    flash("보고서 삭제 완료");
    if (sub === "daily") loadDailies();
    if (sub === "issue") loadIssues();
    if (sub === "project") loadProjects();
  };


  /* -- load comments on tab change -- */
  useEffect(() => {
    const items = sub === "daily" ? dailies : sub === "issue" ? issues : projects;
    items.forEach(item => loadComments(item.id));
  }, [dailies, issues, projects]);

  const applyTemplate = (tpl: typeof TEMPLATES[number]) => {
    setDContent(tpl.content); setDProblems(tpl.problems); setDNext(tpl.next);
    setShowTemplates(false); flash(`"${tpl.label}" 템플릿 적용됨`);
  };

  const subTabs: { key: SubTab; label: string }[] = [
    { key: "weekly", label: "주간 요약" }, { key: "daily", label: "일일 보고" },
    { key: "issue", label: "이슈 보고" }, { key: "project", label: "프로젝트 보고" },
  ];

  const sharedFeedbackProps = { feedbackId, feedbackText, setFeedbackId, setFeedbackText, submitFeedback };
  const sharedCommentProps = { commentMap, commentTarget, commentText, setCommentTarget, setCommentText, addComment };

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {subTabs.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${sub === t.key ? "bg-white text-[#3182F6] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 결재자 선택 (주간 외 모든 보고서) */}
      {sub !== "weekly" && (
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-semibold text-slate-700">결재자 지정</label>
            <select value={approver} onChange={e => setApprover(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6]/20 focus:border-[#3182F6]">
              <option value="">결재자 선택</option>
              {approvers.filter(a => a.hqRole === "대표" || a.hqRole === "이사" || a.hqRole === "팀장").map(a => (
                <option key={a.name} value={a.name}>{a.name} ({a.hqRole})</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">* 보고서 작성 시 전자결재에 자동 기안됩니다</span>
          </div>
        </div>
      )}

      {sub === "weekly" && (
        <WeeklyReport weeklyText={weeklyText} weeklyLoading={weeklyLoading} onRefresh={generateWeekly} flash={flash} />
      )}

      {sub === "daily" && (
        <DailyReportSection
          dailies={dailies} userName={userName} canApprove={canApprove}
          dDate={dDate} setDDate={setDDate} dContent={dContent} setDContent={setDContent}
          dProblems={dProblems} setDProblems={setDProblems} dNext={dNext} setDNext={setDNext}
          showTemplates={showTemplates} setShowTemplates={setShowTemplates}
          templates={TEMPLATES} applyTemplate={applyTemplate}
          editId={editId} setEditId={setEditId}
          editContent={editContent} setEditContent={setEditContent}
          editProblems={editProblems} setEditProblems={setEditProblems}
          editNext={editNext} setEditNext={setEditNext}
          {...sharedFeedbackProps} {...sharedCommentProps}
          addDaily={addDaily} approveReport={approveReport} checkReport={checkReport} saveEdit={saveEdit}
          canDelete={canDelete} deleteReport={deleteReport} isAdmin={isAdmin}
        />
      )}

      {sub === "issue" && (
        <IssueReportSection
          issues={issues} userName={userName} canApprove={canApprove}
          iTitle={iTitle} setITitle={setITitle} iDesc={iDesc} setIDesc={setIDesc}
          iPriority={iPriority} setIPriority={setIPriority} iStatus={iStatus} setIStatus={setIStatus}
          editId={editId} setEditId={setEditId}
          editTitle={editTitle} setEditTitle={setEditTitle} editDesc={editDesc} setEditDesc={setEditDesc}
          {...sharedFeedbackProps} {...sharedCommentProps}
          addIssue={addIssue} approveReport={approveReport} checkReport={checkReport} saveEdit={saveEdit}
          canDelete={canDelete} deleteReport={deleteReport} isAdmin={isAdmin}
        />
      )}

      {sub === "project" && (
        <ProjectReportSection
          projects={projects} userName={userName} canApprove={canApprove} today={today()}
          pTitle={pTitle} setPTitle={setPTitle} pProgress={pProgress} setPProgress={setPProgress}
          pDeadline={pDeadline} setPDeadline={setPDeadline} pDesc={pDesc} setPDesc={setPDesc}
          editId={editId} setEditId={setEditId}
          editTitle={editTitle} setEditTitle={setEditTitle} editDesc={editDesc} setEditDesc={setEditDesc}
          editProgress={editProgress} setEditProgress={setEditProgress}
          {...sharedFeedbackProps} {...sharedCommentProps}
          addProject={addProject} approveReport={approveReport} checkReport={checkReport} saveEdit={saveEdit}
          canDelete={canDelete} deleteReport={deleteReport} isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
