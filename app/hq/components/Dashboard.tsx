"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { HQRole, Mett, Metric, Goal, Task, AAR, Tab, Feedback } from "@/app/hq/types";
import { sb, fmt, today, I, C, B, BADGE, ST, useTeamDisplayNames } from "@/app/hq/utils";
import AttendanceBanner from "@/app/hq/components/dashboard/AttendanceBanner";
import DetailModal from "@/app/hq/components/dashboard/DetailModal";
import WidgetEditor, { type WidgetPrefs, type SectionKey } from "@/app/hq/components/dashboard/WidgetEditor";
import {
  StatsSection, TodayTasksSection, ApprovalsAttendanceSection,
  RecentActivitySection, KpiSection, GoalsSection,
  TasksSection, FeedbackSectionDash, AarsSection,
  TeamStatusSection, RecentNoticesSection, UpcomingEventsSection, RecentReportsSection,
  CheckinStatusSection, ResourceBookingsSection, CrmPipelineSection,
} from "@/app/hq/components/dashboard/DashboardSections";

type Comment = { id: string; author: string; text: string; time: string };
type DetailItem = { type: "task" | "feedback"; id: string; title: string; status: string; extra: Record<string, string> };

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
  onNavigate?: (tab: Tab) => void;
}

const DEFAULT_ORDER: SectionKey[] = ["stats", "todayTasks", "approvals_attendance", "checkinStatus", "resourceBookings", "crmPipeline", "teamStatus", "recentNotices", "upcomingEvents", "recentReports", "recentActivity", "kpi", "goals", "tasks", "feedback", "aars"];
const LS_KEY = "vela_hq_dashboard_prefs";

function loadWidgetPrefs(): WidgetPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const order = parsed.order?.length ? parsed.order.filter((k: SectionKey) => DEFAULT_ORDER.includes(k)) : [...DEFAULT_ORDER];
      for (const k of DEFAULT_ORDER) { if (!order.includes(k)) order.push(k); }
      return { order, hidden: parsed.hidden ?? [] };
    }
  } catch {}
  return { order: [...DEFAULT_ORDER], hidden: [] };
}

function saveWidgetPrefs(prefs: WidgetPrefs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch {}
}

export default function Dashboard({ userId, userName, myRole, flash, onNavigate }: Props) {
  const { displayName } = useTeamDisplayNames();
  const go = (tab: Tab) => onNavigate?.(tab);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<{ clockIn: string; clockOut: string } | null>(null);
  const [aars, setAars] = useState<AAR[]>([]);
  const [metts, setMetts] = useState<Mett[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [todaySignups, setTodaySignups] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeSubs, setActiveSubs] = useState(0);
  const [directive, setDirective] = useState("");
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [attendanceIn, setAttendanceIn] = useState(0);
  const [attendanceOut, setAttendanceOut] = useState(0);
  const [recentActivity, setRecentActivity] = useState<{ type: string; icon: string; title: string; time: string; tab: Tab }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ name: string; role: string; status: string }[]>([]);
  const [todayAttRecords, setTodayAttRecords] = useState<{ userName: string; clockIn: string; clockOut: string; status: string }[]>([]);
  const [recentNotices, setRecentNotices] = useState<{ id: string; title: string; date: string; pinned: boolean; author: string }[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; title: string; date: string; author: string }[]>([]);
  const [recentReports, setRecentReports] = useState<{ id: string; title: string; content?: string; author: string; status: string; date: string; report_type: string }[]>([]);
  const [checkinDone, setCheckinDone] = useState(0);
  const [checkinPending, setCheckinPending] = useState(0);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);
  const [crmDealsByStage, setCrmDealsByStage] = useState<{ stage: string; count: number; value: number }[]>([]);
  const [crmTotalValue, setCrmTotalValue] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPrefs>(() => loadWidgetPrefs());
  const [dragItem, setDragItem] = useState<SectionKey | null>(null);

  const updatePrefs = useCallback((updater: (prev: WidgetPrefs) => WidgetPrefs) => {
    setWidgetPrefs(prev => { const next = updater(prev); saveWidgetPrefs(next); return next; });
  }, []);

  const toggleVisibility = (key: SectionKey) => {
    updatePrefs(prev => ({
      ...prev,
      hidden: prev.hidden.includes(key) ? prev.hidden.filter(k => k !== key) : [...prev.hidden, key],
    }));
  };

  const handleDragStart = (key: SectionKey) => setDragItem(key);
  const handleDragOver = (e: React.DragEvent, overKey: SectionKey) => {
    e.preventDefault();
    if (!dragItem || dragItem === overKey) return;
    updatePrefs(prev => {
      const order = [...prev.order];
      const fromIdx = order.indexOf(dragItem);
      const toIdx = order.indexOf(overKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, dragItem);
      return { ...prev, order };
    });
  };
  const handleDragEnd = () => setDragItem(null);

  const moveWidget = (key: SectionKey, dir: -1 | 1) => {
    updatePrefs(prev => {
      const order = [...prev.order];
      const idx = order.indexOf(key);
      const target = idx + dir;
      if (target < 0 || target >= order.length) return prev;
      [order[idx], order[target]] = [order[target], order[idx]];
      return { ...prev, order };
    });
  };

  const isSectionVisible = (key: SectionKey) => !widgetPrefs.hidden.includes(key);

  useEffect(() => {
    loadCritical();
    const timer = setTimeout(() => { loadSecondary(); }, 500);
    return () => clearTimeout(timer);
  }, []);

  async function loadCritical() {
    const s = sb(); if (!s) return;
    setLoading(true);
    try {
      const [mRes, gRes, tRes, pAll, pToday, dirRes] = await Promise.all([
        s.from("hq_metrics").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(15),
        s.from("hq_goals").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
        s.from("hq_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        s.from("profiles").select("id", { count: "exact", head: true }),
        s.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today() + "T00:00:00"),
        s.from("hq_directives").select("content").eq("user_id", userId).single(),
      ]);
      setMetrics((mRes.data as Metric[]) ?? []);
      setGoals((gRes.data as Goal[]) ?? []);
      setTasks((tRes.data as Task[]) ?? []);
      let staffEmails: string[] = [];
      try { const { data: teamData } = await s.from("hq_team").select("email"); if (teamData) staffEmails = teamData.map((t: any) => t.email).filter(Boolean); } catch {}
      const staffCount = staffEmails.length;
      setTotalUsers(Math.max(0, (pAll.count ?? 0) - staffCount));
      setTodaySignups(pToday.count ?? 0);
      if (dirRes.data?.content) setDirective(dirRes.data.content);

      try {
        const todayStr = today();
        const { data: attData } = await s.from("hq_attendance").select("id, status, user_name, clock_in, clock_out").eq("date", todayStr);
        if (attData) {
          setAttendanceIn(attData.filter((a: any) => a.status !== "결근").length);
          setAttendanceOut(attData.filter((a: any) => a.status === "결근").length);
          const myAtt = attData.find((a: any) => a.user_name === userName);
          if (myAtt) {
            const toTime = (ts: string | null) => { if (!ts) return ""; try { return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; } };
            setTodayAttendance({ clockIn: toTime(myAtt.clock_in), clockOut: toTime(myAtt.clock_out) });
          } else { setTodayAttendance(null); }
        }
        const { count: teamCount } = await s.from("hq_team").select("id", { count: "exact", head: true }).neq("approved", false);
        if (teamCount && attData) { setAttendanceOut(Math.max(0, (teamCount ?? 0) - attData.length)); setAttendanceIn(attData.length); }
      } catch {}
    } catch { flash("데이터 로딩 실패"); }
    finally { setLoading(false); }
  }

  async function loadSecondary() {
    const s = sb(); if (!s) return;
    setSecondaryLoading(true);
    try {
      const [aRes, meRes, payAll, paySub] = await Promise.all([
        s.from("hq_aar").select("*").eq("user_id", userId).order("date", { ascending: false }),
        s.from("hq_mett").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
        s.from("payments").select("amount").eq("status", "done"),
        s.from("payments").select("id", { count: "exact", head: true }).eq("status", "done"),
      ]);
      setAars((aRes.data as AAR[]) ?? []);
      setMetts((meRes.data as Mett[]) ?? []);
      setTotalRevenue((payAll.data ?? []).reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0));
      setActiveSubs(paySub.count ?? 0);

      try { const { data: fbData } = await s.from("hq_feedback").select("*").order("created_at", { ascending: false }); if (fbData) setFeedbacks(fbData.map((r: any) => ({ id: r.id, type: r.type ?? "", title: r.title ?? "", description: r.description ?? "", priority: r.priority ?? "중간", status: r.status ?? "신규", date: r.created_at?.slice(0, 10) ?? "", author: r.author ?? "" }))); } catch {}
      try { const { count } = await s.from("hq_approvals").select("id", { count: "exact", head: true }).eq("status", "대기"); setPendingApprovals(count ?? 0); } catch {}
      try {
        const [noticeRecent, taskRecent, fbRecent] = await Promise.all([
          s.from("hq_notices").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
          s.from("hq_tasks").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
          s.from("hq_feedback").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
        ]);
        const activities: { type: string; icon: string; title: string; time: string; tab: Tab }[] = [];
        (noticeRecent.data ?? []).forEach((n: any) => activities.push({ type: "공지", icon: "📢", title: n.title, time: n.created_at, tab: "notice" }));
        (taskRecent.data ?? []).forEach((t: any) => activities.push({ type: "태스크", icon: "✅", title: t.title, time: t.created_at, tab: "task" }));
        (fbRecent.data ?? []).forEach((f: any) => activities.push({ type: "피드백", icon: "🐛", title: f.title, time: f.created_at, tab: "board" }));
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities.slice(0, 5));
      } catch {}
      try {
        const { data: cmtData } = await s.from("hq_item_comments").select("*").order("created_at", { ascending: true });
        if (cmtData) {
          const grouped: Record<string, Comment[]> = {};
          for (const r of cmtData as any[]) { if (!grouped[r.item_id]) grouped[r.item_id] = []; grouped[r.item_id].push({ id: r.id, author: r.author, text: r.text, time: r.created_at ? new Date(r.created_at).toLocaleString("ko-KR") : "" }); }
          setComments(grouped);
        }
      } catch {}

      // 팀원 현황
      try {
        const { data: td } = await s.from("hq_team").select("name, role, status").neq("approved", false);
        if (td) setTeamMembers(td as any[]);
      } catch {}

      // 오늘 출퇴근 전체
      try {
        const { data: attAll } = await s.from("hq_attendance").select("user_name, clock_in, clock_out, status").eq("date", today());
        if (attAll) setTodayAttRecords(attAll.map((a: any) => ({
          userName: a.user_name,
          clockIn: a.clock_in ? new Date(a.clock_in).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
          clockOut: a.clock_out ? new Date(a.clock_out).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
          status: a.status,
        })));
      } catch {}

      // 최근 공지
      try {
        const { data: nd } = await s.from("hq_notices").select("id, title, date, pinned, author").order("pinned", { ascending: false }).order("date", { ascending: false }).limit(5);
        if (nd) setRecentNotices(nd as any[]);
      } catch {}

      // 다가오는 일정
      try {
        const { data: ed } = await s.from("hq_calendar").select("id, title, date, author").gte("date", today()).order("date", { ascending: true }).limit(5);
        if (ed) setUpcomingEvents(ed as any[]);
      } catch {}

      // 최근 보고서
      try {
        const { data: rd } = await s.from("hq_reports").select("id, title, content, author, status, date, report_type").order("created_at", { ascending: false }).limit(5);
        if (rd) setRecentReports(rd as any[]);
      } catch {}

      // 체크인 현황
      try {
        const todayStr = today();
        const { count: teamCount } = await s.from("hq_team").select("id", { count: "exact", head: true }).neq("approved", false);
        const { count: doneCount } = await s.from("hq_checkins").select("id", { count: "exact", head: true }).eq("date", todayStr);
        const done = doneCount ?? 0;
        const total = teamCount ?? 0;
        setCheckinDone(done);
        setCheckinPending(Math.max(0, total - done));
      } catch {}

      // 자원예약
      try {
        const todayStr = today();
        const { count: bkCount } = await s.from("hq_bookings").select("id", { count: "exact", head: true }).eq("date", todayStr);
        setTodayBookingsCount(bkCount ?? 0);
      } catch {}

      // CRM 파이프라인
      try {
        const { data: deals } = await s.from("hq_crm_deals").select("stage, value");
        if (deals) {
          const stageMap: Record<string, { count: number; value: number }> = {};
          let totalVal = 0;
          for (const d of deals as any[]) {
            const st = d.stage || "lead";
            if (!stageMap[st]) stageMap[st] = { count: 0, value: 0 };
            stageMap[st].count += 1;
            stageMap[st].value += (d.value || 0);
            totalVal += (d.value || 0);
          }
          setCrmDealsByStage(Object.entries(stageMap).map(([stage, v]) => ({ stage, ...v })));
          setCrmTotalValue(totalVal);
        }
      } catch {}
    } catch { flash("보조 데이터 로딩 실패"); }
    finally { setSecondaryLoading(false); }
  }

  const directiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function saveDirective(v: string) {
    setDirective(v);
    if (directiveTimer.current) clearTimeout(directiveTimer.current);
    directiveTimer.current = setTimeout(async () => {
      const s = sb(); if (!s) return;
      const { error } = await s.from("hq_directives").upsert({ user_id: userId, content: v, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) flash("지시사항 저장 실패: " + error.message);
    }, 1000);
  }

  const addComment = async (itemId: string) => {
    if (!commentText.trim()) return;
    const s = sb(); if (!s) return;
    const { error } = await s.from("hq_item_comments").insert({ item_id: itemId, item_type: "dashboard", author: userName, text: commentText.trim() });
    if (error) { flash("댓글 저장 실패"); return; }
    const c: Comment = { id: Date.now().toString(), author: userName, text: commentText.trim(), time: new Date().toLocaleString("ko-KR") };
    setComments(prev => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), c] }));
    setCommentText("");
  };

  const openTask = (t: Task) => setDetail({
    type: "task", id: t.id, title: t.title, status: t.status,
    extra: { 담당자: displayName(t.assignee || "-"), 마감일: t.deadline || "-", 결과: t.result || "-" },
  });

  const openFeedback = (f: Feedback) => setDetail({
    type: "feedback", id: f.id, title: f.title, status: f.status,
    extra: { 유형: f.type, 우선순위: f.priority, 설명: f.description || "-", 작성자: displayName(f.author), 날짜: f.date },
  });

  const handleQuickClockIn = async () => {
    const s = sb(); if (!s) return;
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    const isLate = time > "09:00";
    const { error } = await s.from("hq_attendance").upsert({ user_id: userId, user_name: userName, date: today(), clock_in: now.toISOString(), status: isLate ? "지각" : "정상" }, { onConflict: "user_id,date" });
    if (error) { flash("출근 저장 실패"); return; }
    flash(`출근 완료! (${time})`);
    setTodayAttendance({ clockIn: time, clockOut: "" });
    loadCritical(); loadSecondary();
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-white rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl" />)}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="h-32 bg-white rounded-2xl" />
          <div className="h-32 bg-white rounded-2xl" />
        </div>
      </div>
    );
  }

  const renderSection = (sectionKey: SectionKey) => {
    switch (sectionKey) {
      case "stats": return <StatsSection key="stats" totalUsers={totalUsers} todaySignups={todaySignups} totalRevenue={totalRevenue} activeSubs={activeSubs} />;
      case "todayTasks": return <TodayTasksSection key="todayTasks" tasks={tasks} go={go} userName={userName} openTask={openTask} />;
      case "approvals_attendance": return <ApprovalsAttendanceSection key="approvals_attendance" pendingApprovals={pendingApprovals} attendanceIn={attendanceIn} attendanceOut={attendanceOut} go={go} userName={userName} />;
      case "recentActivity": return <RecentActivitySection key="recentActivity" recentActivity={recentActivity} go={go} userName={userName} />;
      case "kpi": return <KpiSection key="kpi" metrics={metrics} go={go} userName={userName} />;
      case "goals": return <GoalsSection key="goals" goals={goals} go={go} userName={userName} />;
      case "tasks": return <TasksSection key="tasks" tasks={tasks} comments={comments} go={go} userName={userName} openTask={openTask} />;
      case "feedback": return <FeedbackSectionDash key="feedback" feedbacks={feedbacks} comments={comments} go={go} userName={userName} openFeedback={openFeedback} />;
      case "aars": return <AarsSection key="aars" aars={aars} go={go} userName={userName} />;
      case "teamStatus": return <TeamStatusSection key="teamStatus" teamMembers={teamMembers} attendanceData={todayAttRecords} go={go} userName={userName} />;
      case "recentNotices": return <RecentNoticesSection key="recentNotices" notices={recentNotices} go={go} userName={userName} />;
      case "upcomingEvents": return <UpcomingEventsSection key="upcomingEvents" events={upcomingEvents} go={go} userName={userName} />;
      case "recentReports": return <RecentReportsSection key="recentReports" reports={recentReports} go={go} userName={userName} />;
      case "checkinStatus": return <CheckinStatusSection key="checkinStatus" checkinDone={checkinDone} checkinPending={checkinPending} go={go} userName={userName} />;
      case "resourceBookings": return <ResourceBookingsSection key="resourceBookings" todayBookingsCount={todayBookingsCount} go={go} userName={userName} />;
      case "crmPipeline": return <CrmPipelineSection key="crmPipeline" dealsByStage={crmDealsByStage} totalDealValue={crmTotalValue} go={go} userName={userName} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <AttendanceBanner loading={loading} todayAttendance={todayAttendance} onClockIn={handleQuickClockIn} onNavigate={go} />

      {detail && (
        <DetailModal detail={detail} comments={comments} commentText={commentText}
          setCommentText={setCommentText} addComment={addComment} onClose={() => setDetail(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {(() => { const h = new Date().getHours(); return h < 6 ? "🌙" : h < 12 ? "☀️" : h < 18 ? "🌤️" : "🌙"; })()} {userName}님, {(() => { const h = new Date().getHours(); return h < 6 ? "늦은 밤이에요" : h < 12 ? "좋은 아침이에요" : h < 18 ? "좋은 오후에요" : "수고하셨어요"; })()}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>
        <button onClick={() => setEditMode(v => !v)}
          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${editMode ? "bg-[#3182F6] text-white shadow-sm shadow-[#3182F6]/20" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"}`}>
          {editMode ? "✓ 완료" : "⚙ 편집"}
        </button>
      </div>

      {/* 퀵 액세스 */}
      {!editMode && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {([
            { tab: "attendance" as Tab, icon: "⏰", label: "출퇴근" },
            { tab: "task" as Tab, icon: "✅", label: "업무" },
            { tab: "report" as Tab, icon: "📄", label: "보고서" },
            { tab: "approval" as Tab, icon: "📋", label: "결재" },
            { tab: "chat" as Tab, icon: "💬", label: "채팅" },
            { tab: "notice" as Tab, icon: "📢", label: "공지" },
            { tab: "calendar" as Tab, icon: "📅", label: "일정" },
            { tab: "files" as Tab, icon: "📁", label: "파일" },
          ]).map(q => (
            <button key={q.tab} onClick={() => go(q.tab)}
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-white ring-1 ring-slate-200/60 hover:ring-[#3182F6]/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
              <span className="text-xl">{q.icon}</span>
              <span className="text-[11px] font-bold text-slate-600">{q.label}</span>
            </button>
          ))}
        </div>
      )}

      {editMode && (
        <WidgetEditor widgetPrefs={widgetPrefs} dragItem={dragItem}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}
          onToggleVisibility={toggleVisibility} onMoveWidget={moveWidget} isSectionVisible={isSectionVisible} />
      )}

      {/* 전폭 위젯 */}
      {(["stats", "approvals_attendance"] as SectionKey[]).filter(k => widgetPrefs.order.includes(k) && isSectionVisible(k)).map(k => renderSection(k))}

      {/* 2열 그리드 (데스크톱) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {widgetPrefs.order.filter(k => !["stats", "approvals_attendance"].includes(k) && isSectionVisible(k)).map(sectionKey => (
          <div key={sectionKey}>{renderSection(sectionKey)}</div>
        ))}
      </div>

      {/* Weekly Directive */}
      <div className={`${C} !p-3`}>
        <h3 className="mb-1.5 text-xs font-bold text-slate-700">주간 지시사항</h3>
        <textarea
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          rows={2}
          placeholder="이번 주 핵심 지시사항을 입력하세요..."
          value={directive}
          onChange={(e) => saveDirective(e.target.value)}
        />
      </div>
    </div>
  );
}
