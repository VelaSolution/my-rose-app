"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type Tab = "dashboard" | "mett" | "kpi" | "goal" | "task" | "aar" | "notice" | "report" | "feedback" | "calendar" | "memo" | "team" | "timeline";
type TeamMember = { id: string; name: string; role: string; email: string; status: "active" | "away" | "offline" };
type Notice = { id: string; title: string; content: string; date: string; pinned: boolean };
type Feedback = { id: string; type: string; title: string; description: string; priority: string; status: string; date: string };
type MemoItem = { id: string; content: string; time: string };
type Mett = { id: string; mission: string; enemy: string; terrain: string; troops: string; time_constraint: string; civil: string; created_at: string };
type Metric = { id: string; date: string; revenue: number; users_count: number; conversion_rate: number; profit: number };
type Goal = { id: string; title: string; target_value: number; current_value: number; metric_type: string; start_date: string; end_date: string; status: string };
type Task = { id: string; goal_id: string | null; title: string; assignee: string; deadline: string; status: string; result: string };
type AAR = { id: string; date: string; goal: string; result: string; gap_reason: string; improvement: string };

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "현황", icon: "📋" },
  { key: "mett", label: "상황판단", icon: "🎯" },
  { key: "kpi", label: "KPI", icon: "📊" },
  { key: "goal", label: "목표", icon: "🏆" },
  { key: "task", label: "태스크", icon: "✅" },
  { key: "aar", label: "AAR", icon: "📝" },
  { key: "notice", label: "공지", icon: "📢" },
  { key: "report", label: "보고서", icon: "📄" },
  { key: "feedback", label: "피드백", icon: "🐛" },
  { key: "calendar", label: "일정", icon: "📅" },
  { key: "memo", label: "메모", icon: "💬" },
  { key: "team", label: "팀", icon: "👥" },
  { key: "timeline", label: "타임라인", icon: "🕐" },
];

const fmt = (n: number) => n.toLocaleString("ko-KR");
const ST: Record<string, { bg: string; label: string }> = {
  active: { bg: "bg-blue-100 text-blue-700", label: "진행" },
  completed: { bg: "bg-emerald-100 text-emerald-700", label: "완료" },
  failed: { bg: "bg-red-100 text-red-700", label: "실패" },
  pending: { bg: "bg-slate-100 text-slate-600", label: "대기" },
  in_progress: { bg: "bg-amber-100 text-amber-700", label: "진행" },
};

export default function HQPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [msg, setMsg] = useState("");

  const [metts, setMetts] = useState<Mett[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aars, setAars] = useState<AAR[]>([]);

  const [mettForm, setMettForm] = useState({ mission: "", enemy: "", terrain: "", troops: "", time_constraint: "", civil: "" });
  const [metricForm, setMetricForm] = useState({ date: new Date().toISOString().slice(0, 10), revenue: "", users_count: "", conversion_rate: "", profit: "" });
  const [goalForm, setGoalForm] = useState({ title: "", target_value: "", metric_type: "revenue", start_date: new Date().toISOString().slice(0, 10), end_date: "" });
  const [taskForm, setTaskForm] = useState({ title: "", assignee: "", deadline: "", goal_id: "" });
  const [aarForm, setAarForm] = useState({ date: new Date().toISOString().slice(0, 10), goal: "", result: "", gap_reason: "", improvement: "" });

  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "", pinned: false });
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [fbForm, setFbForm] = useState({ type: "버그", title: "", description: "", priority: "중간", status: "신규" });
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [memoText, setMemoText] = useState("");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamForm, setTeamForm] = useState({ name: "", role: "", email: "" });
  const [directive, setDirective] = useState("");
  const [directiveSaved, setDirectiveSaved] = useState("");
  const directiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const saveDirective = useCallback((val: string) => {
    if (directiveTimer.current) clearTimeout(directiveTimer.current);
    directiveTimer.current = setTimeout(() => {
      localStorage.setItem("vela-hq-directive", val);
      setDirectiveSaved(new Date().toLocaleString("ko-KR"));
    }, 500);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sb = createSupabaseBrowserClient();
        if (!sb) { setLoading(false); return; }
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);
        const adminEmails = ["mnhyuk@velaanalytics.com", "mnhyuk0213@gmail.com"];
        if (adminEmails.includes(user.email ?? "")) setAuthorized(true);

        const [m, met, g, t, a] = await Promise.all([
          sb.from("hq_mett").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
          sb.from("hq_metrics").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
          sb.from("hq_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
          sb.from("hq_tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
          sb.from("hq_aar").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(10),
        ]);
        setMetts((m.data ?? []) as Mett[]);
        setMetrics((met.data ?? []) as Metric[]);
        setGoals((g.data ?? []) as Goal[]);
        setTasks((t.data ?? []) as Task[]);
        setAars((a.data ?? []) as AAR[]);
      } catch (e) { console.error("HQ load error:", e); }
      try { const n = localStorage.getItem("vela-hq-notices"); if (n) setNotices(JSON.parse(n)); } catch {}
      try { const f = localStorage.getItem("vela-hq-feedback"); if (f) setFeedbacks(JSON.parse(f)); } catch {}
      try { const m = localStorage.getItem("vela-hq-memo"); if (m) setMemos(JSON.parse(m)); } catch {}
      try {
        const tm = localStorage.getItem("vela-hq-team");
        if (tm) setTeamMembers(JSON.parse(tm));
        else {
          const defaults: TeamMember[] = [
            { id: "1", name: "민혁", role: "대표", email: "mnhyuk@velaanalytics.com", status: "active" },
            { id: "2", name: "운영팀", role: "운영", email: "ops@velaanalytics.com", status: "active" },
          ];
          setTeamMembers(defaults); localStorage.setItem("vela-hq-team", JSON.stringify(defaults));
        }
      } catch {}
      try { const d = localStorage.getItem("vela-hq-directive"); if (d) setDirective(d); } catch {}
      setLoading(false);
    })();
  }, []);

  const sb = () => { try { return createSupabaseBrowserClient(); } catch { return null; } };

  // CRUD
  const saveMett = async () => {
    const s = sb(); if (!s || !userId || !mettForm.mission.trim()) return;
    const { data, error } = await s.from("hq_mett").insert({ user_id: userId, ...mettForm }).select().single();
    if (error) { flash("저장 실패: " + error.message); return; }
    if (data) { setMetts([data as Mett, ...metts]); flash("✓ 저장됨"); }
    setMettForm({ mission: "", enemy: "", terrain: "", troops: "", time_constraint: "", civil: "" });
  };
  const saveMetric = async () => {
    const s = sb(); if (!s || !userId) return;
    const payload = { user_id: userId, date: metricForm.date, revenue: Number(metricForm.revenue) || 0, users_count: Number(metricForm.users_count) || 0, conversion_rate: Number(metricForm.conversion_rate) || 0, profit: Number(metricForm.profit) || 0 };
    const { data, error } = await s.from("hq_metrics").upsert(payload, { onConflict: "user_id,date" }).select().single();
    if (error) { flash("저장 실패: " + error.message); return; }
    if (data) { setMetrics([data as Metric, ...metrics.filter(m => m.date !== metricForm.date)]); flash("✓ 저장됨"); }
    setMetricForm({ date: new Date().toISOString().slice(0, 10), revenue: "", users_count: "", conversion_rate: "", profit: "" });
  };
  const saveGoal = async () => {
    const s = sb(); if (!s || !userId || !goalForm.title.trim()) return;
    if (goals.filter(g => g.status === "active").length >= 2) { flash("활성 목표는 최대 2개"); return; }
    const { data, error } = await s.from("hq_goals").insert({ user_id: userId, title: goalForm.title, target_value: Number(goalForm.target_value) || 0, current_value: 0, metric_type: goalForm.metric_type, start_date: goalForm.start_date, end_date: goalForm.end_date || goalForm.start_date, status: "active" }).select().single();
    if (error) { flash("저장 실패: " + error.message); return; }
    if (data) { setGoals([data as Goal, ...goals]); flash("✓ 목표 추가됨"); }
    setGoalForm({ title: "", target_value: "", metric_type: "revenue", start_date: new Date().toISOString().slice(0, 10), end_date: "" });
  };
  const saveTask = async () => {
    const s = sb(); if (!s || !userId || !taskForm.title.trim()) return;
    const { data, error } = await s.from("hq_tasks").insert({ user_id: userId, title: taskForm.title, assignee: taskForm.assignee || null, deadline: taskForm.deadline || null, goal_id: taskForm.goal_id || null, status: "pending", result: null }).select().single();
    if (error) { flash("저장 실패: " + error.message); return; }
    if (data) { setTasks([data as Task, ...tasks]); flash("✓ 태스크 추가됨"); }
    setTaskForm({ title: "", assignee: "", deadline: "", goal_id: "" });
  };
  const saveAAR = async () => {
    const s = sb(); if (!s || !userId || !aarForm.goal.trim()) return;
    const { data, error } = await s.from("hq_aar").insert({ user_id: userId, ...aarForm }).select().single();
    if (error) { flash("저장 실패: " + error.message); return; }
    if (data) { setAars([data as AAR, ...aars]); flash("✓ AAR 저장됨"); }
    setAarForm({ date: new Date().toISOString().slice(0, 10), goal: "", result: "", gap_reason: "", improvement: "" });
  };
  const updateGoal = async (id: string, status: string) => { const s = sb(); if (!s) return; await s.from("hq_goals").update({ status }).eq("id", id); setGoals(goals.map(g => g.id === id ? { ...g, status } : g)); };
  const updateTask = async (id: string, status: string) => { const s = sb(); if (!s) return; await s.from("hq_tasks").update({ status }).eq("id", id); setTasks(tasks.map(t => t.id === id ? { ...t, status } : t)); };
  const del = async (table: string, id: string) => { if (!confirm("삭제?")) return; const s = sb(); if (!s) return; await s.from(table).delete().eq("id", id); };
  const delMett = async (id: string) => { await del("hq_mett", id); setMetts(metts.filter(m => m.id !== id)); };
  const delMetric = async (id: string) => { await del("hq_metrics", id); setMetrics(metrics.filter(m => m.id !== id)); };
  const delGoal = async (id: string) => { await del("hq_goals", id); setGoals(goals.filter(g => g.id !== id)); };
  const delTask = async (id: string) => { await del("hq_tasks", id); setTasks(tasks.filter(t => t.id !== id)); };
  const delAAR = async (id: string) => { await del("hq_aar", id); setAars(aars.filter(a => a.id !== id)); };

  // Notice helpers
  const saveNotice = () => {
    if (!noticeForm.title.trim()) return;
    const n: Notice = { id: Date.now().toString(), title: noticeForm.title, content: noticeForm.content, date: new Date().toISOString().slice(0, 10), pinned: noticeForm.pinned };
    const next = [n, ...notices]; setNotices(next); localStorage.setItem("vela-hq-notices", JSON.stringify(next));
    setNoticeForm({ title: "", content: "", pinned: false }); flash("✓ 공지 저장됨");
  };
  const togglePin = (id: string) => { const next = notices.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n); setNotices(next); localStorage.setItem("vela-hq-notices", JSON.stringify(next)); };
  const delNotice = (id: string) => { const next = notices.filter(n => n.id !== id); setNotices(next); localStorage.setItem("vela-hq-notices", JSON.stringify(next)); };
  const sortedNotices = [...notices].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));

  // Feedback helpers
  const saveFb = () => {
    if (!fbForm.title.trim()) return;
    const f: Feedback = { id: Date.now().toString(), ...fbForm, date: new Date().toISOString().slice(0, 10) };
    const next = [f, ...feedbacks]; setFeedbacks(next); localStorage.setItem("vela-hq-feedback", JSON.stringify(next));
    setFbForm({ type: "버그", title: "", description: "", priority: "중간", status: "신규" }); flash("✓ 피드백 저장됨");
  };
  const updateFbStatus = (id: string, status: string) => { const next = feedbacks.map(f => f.id === id ? { ...f, status } : f); setFeedbacks(next); localStorage.setItem("vela-hq-feedback", JSON.stringify(next)); };
  const delFb = (id: string) => { const next = feedbacks.filter(f => f.id !== id); setFeedbacks(next); localStorage.setItem("vela-hq-feedback", JSON.stringify(next)); };

  // Memo helpers
  const saveMemo = () => {
    if (!memoText.trim()) return;
    const m: MemoItem = { id: Date.now().toString(), content: memoText, time: new Date().toLocaleString("ko-KR") };
    const next = [m, ...memos]; setMemos(next); localStorage.setItem("vela-hq-memo", JSON.stringify(next));
    setMemoText(""); flash("✓ 메모 저장됨");
  };
  const delMemo = (id: string) => { const next = memos.filter(m => m.id !== id); setMemos(next); localStorage.setItem("vela-hq-memo", JSON.stringify(next)); };

  // Team helpers
  const saveTeamMember = () => {
    if (!teamForm.name.trim()) return;
    const m: TeamMember = { id: Date.now().toString(), name: teamForm.name, role: teamForm.role, email: teamForm.email, status: "active" };
    const next = [...teamMembers, m]; setTeamMembers(next); localStorage.setItem("vela-hq-team", JSON.stringify(next));
    setTeamForm({ name: "", role: "", email: "" }); flash("✓ 멤버 추가됨");
  };
  const delTeamMember = (id: string) => { const next = teamMembers.filter(m => m.id !== id); setTeamMembers(next); localStorage.setItem("vela-hq-team", JSON.stringify(next)); };
  const toggleTeamStatus = (id: string) => {
    const cycle: Record<string, "active" | "away" | "offline"> = { active: "away", away: "offline", offline: "active" };
    const next = teamMembers.map(m => m.id === id ? { ...m, status: cycle[m.status] } : m); setTeamMembers(next); localStorage.setItem("vela-hq-team", JSON.stringify(next));
  };

  // Report helper
  const genReport = () => {
    const now = new Date(); const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekStr = `${weekAgo.toISOString().slice(0, 10)} ~ ${now.toISOString().slice(0, 10)}`;
    const kpi = latestKpi ? `매출: ${fmt(latestKpi.revenue)}원 | 사용자: ${fmt(latestKpi.users_count)} | 전환율: ${latestKpi.conversion_rate}% | 순이익: ${fmt(latestKpi.profit)}원` : "데이터 없음";
    const goalLines = activeGoals.map(g => `- ${g.title}: ${g.target_value > 0 ? Math.round(g.current_value / g.target_value * 100) : 0}%`).join("\n") || "- 없음";
    const weekTasks = tasks.filter(t => t.status === "completed"); const pendT = tasks.filter(t => t.status !== "completed" && t.status !== "failed");
    const aarLine = aars[0] ? `목표: ${aars[0].goal} / 결과: ${aars[0].result}` : "없음";
    return `[VELA 주간 보고서] ${weekStr}\n\n■ KPI\n${kpi}\n\n■ 목표 진행\n${goalLines}\n\n■ 태스크\n완료: ${weekTasks.length}건 / 미완료: ${pendT.length}건\n\n■ 최근 AAR\n${aarLine}`;
  };

  if (loading) return <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center"><div className="w-8 h-8 border-3 border-slate-300 border-t-slate-700 rounded-full animate-spin" /></div>;
  if (!authorized) return (
    <main className="min-h-screen bg-[#f0f2f5] pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-4">🔒</div><h2 className="text-xl font-bold text-slate-900 mb-2">접근 권한 없음</h2><p className="text-sm text-slate-500 mb-4">HQ는 관리자 전용입니다.</p><Link href="/" className="rounded-lg bg-slate-900 text-white font-semibold px-5 py-2.5 text-sm">홈으로</Link></div>
    </main>
  );

  const I = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const C = "bg-white border border-slate-200 rounded-lg p-4 mb-3 shadow-sm";
  const L = "block text-xs font-medium text-slate-600 mb-1";
  const B = "rounded-lg bg-blue-600 text-white font-semibold px-4 py-2 text-sm hover:bg-blue-700 transition";

  const activeGoals = goals.filter(g => g.status === "active");
  const pendingTasks = tasks.filter(t => t.status !== "completed" && t.status !== "failed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const latestMett = metts[0];
  const latestKpi = metrics[0];

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* 인트라넷 헤더 */}
      <header className="bg-[#1a1a2e] text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">🏛️ VELA HQ</span>
            <span className="text-xs text-slate-400 hidden sm:inline">Internal Operations</span>
          </div>
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs bg-emerald-600 px-2 py-1 rounded">{msg}</span>}
            <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white">고객 대시보드 →</Link>
          </div>
        </div>
      </header>

      {/* 탭 네비 */}
      <nav className="bg-white border-b border-slate-200 sticky top-[48px] z-40">
        <div className="max-w-5xl mx-auto flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-5">

        {/* 대시보드 */}
        {tab === "dashboard" && (
          <div className="space-y-4">
            {/* KPI 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { l: "매출", v: latestKpi ? fmt(latestKpi.revenue) + "원" : "—", c: "text-slate-900" },
                { l: "사용자", v: latestKpi ? fmt(latestKpi.users_count) : "—", c: "text-blue-600" },
                { l: "전환율", v: latestKpi ? latestKpi.conversion_rate + "%" : "—", c: "text-purple-600" },
                { l: "순이익", v: latestKpi ? fmt(latestKpi.profit) + "원" : "—", c: (latestKpi?.profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-500" },
              ].map(s => (
                <div key={s.l} className={C}><p className="text-[11px] text-slate-400">{s.l}</p><p className={`text-lg font-bold ${s.c}`}>{s.v}</p></div>
              ))}
            </div>

            {/* KPI 차트 — 최근 7일 매출 */}
            {metrics.length > 0 && (() => {
              const last7 = [...metrics].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
              const maxRev = Math.max(...last7.map(m => m.revenue), 1);
              return (
                <div className={C}>
                  <h3 className="text-sm font-bold mb-3">📊 최근 KPI 추이</h3>
                  <div className="flex items-end gap-2 h-28">
                    {last7.map(m => (
                      <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max((m.revenue / maxRev) * 100, 4)}%` }} />
                        <span className={`w-2.5 h-2.5 rounded-full ${m.profit >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                        <span className="text-[9px] text-slate-400">{m.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded inline-block" />매출</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />흑자</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full inline-block" />적자</span>
                  </div>
                </div>
              );
            })()}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={C}><p className="text-[11px] text-slate-400">진행중 태스크</p><p className="text-lg font-bold text-amber-600">{pendingTasks.length}<span className="text-xs text-slate-400 font-normal"> / {tasks.length}</span></p></div>
              <div className={C}><p className="text-[11px] text-slate-400">목표 달성률</p><p className="text-lg font-bold text-blue-600">{activeGoals.length > 0 ? Math.round(activeGoals.reduce((s, g) => s + (g.target_value > 0 ? g.current_value / g.target_value * 100 : 0), 0) / activeGoals.length) : 0}%</p></div>
              <div className={C}><p className="text-[11px] text-slate-400">미처리 피드백</p><p className="text-lg font-bold text-red-500">{feedbacks.filter(f => f.status !== "완료").length}</p></div>
              <div className={C}><p className="text-[11px] text-slate-400">이번 달 AAR</p><p className="text-lg font-bold text-purple-600">{aars.filter(a => a.date.slice(0, 7) === new Date().toISOString().slice(0, 7)).length}</p></div>
            </div>

            {/* 이번 주 핵심 지시 */}
            <div className={C}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">📣 이번 주 핵심 지시</h3>
                {directiveSaved && <span className="text-[10px] text-slate-400">저장됨: {directiveSaved}</span>}
              </div>
              <textarea className={`${I} h-16`} value={directive} placeholder="이번 주에 팀이 반드시 완수해야 할 것..."
                onChange={e => { setDirective(e.target.value); saveDirective(e.target.value); }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* 미션 */}
              <div className={C}>
                <div className="flex justify-between mb-2"><h3 className="text-sm font-bold">🎯 현재 미션</h3><button onClick={() => setTab("mett")} className="text-[11px] text-blue-600">수정 →</button></div>
                {latestMett ? <p className="text-sm font-semibold text-slate-900">{latestMett.mission}</p> : <p className="text-xs text-slate-400">METT-TC를 작성하세요</p>}
              </div>
              {/* 목표 */}
              <div className={C}>
                <div className="flex justify-between mb-2"><h3 className="text-sm font-bold">🏆 목표 ({activeGoals.length}/2)</h3><button onClick={() => setTab("goal")} className="text-[11px] text-blue-600">관리 →</button></div>
                {activeGoals.length === 0 ? <p className="text-xs text-slate-400">목표를 설정하세요</p> : activeGoals.map(g => (
                  <div key={g.id} className="mb-2"><div className="flex justify-between text-xs mb-1"><span>{g.title}</span><span className="text-slate-400">{g.target_value > 0 ? Math.round(g.current_value / g.target_value * 100) : 0}%</span></div><div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(g.target_value > 0 ? g.current_value / g.target_value * 100 : 0, 100)}%` }} /></div></div>
                ))}
              </div>
              {/* 태스크 */}
              <div className={C}>
                <div className="flex justify-between mb-2"><h3 className="text-sm font-bold">✅ 태스크 ({completedTasks.length}/{tasks.length})</h3><button onClick={() => setTab("task")} className="text-[11px] text-blue-600">관리 →</button></div>
                {pendingTasks.length === 0 ? <p className="text-xs text-emerald-600 font-semibold">모두 완료!</p> : pendingTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs py-1"><span className={`w-1.5 h-1.5 rounded-full ${t.status === "in_progress" ? "bg-amber-400" : "bg-slate-300"}`} /><span className="truncate flex-1">{t.title}</span>{t.deadline && <span className="text-slate-400">{t.deadline.slice(5)}</span>}</div>
                ))}
              </div>
              {/* AAR */}
              <div className={C}>
                <div className="flex justify-between mb-2"><h3 className="text-sm font-bold">📝 최근 AAR</h3><button onClick={() => setTab("aar")} className="text-[11px] text-blue-600">작성 →</button></div>
                {aars[0] ? <div className="text-xs space-y-1"><p><b>목표:</b> {aars[0].goal}</p><p><b>결과:</b> {aars[0].result}</p>{aars[0].improvement && <p className="text-blue-600"><b>개선:</b> {aars[0].improvement}</p>}</div> : <p className="text-xs text-slate-400">AAR을 작성하세요</p>}
              </div>
            </div>

            {/* 운영 리듬 */}
            <div className={C}>
              <h3 className="text-sm font-bold mb-2">📅 운영 리듬</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 rounded-lg p-2"><p className="font-bold text-blue-700 mb-1">일일</p><p className="text-blue-600">METT → KPI → Task → AAR</p></div>
                <div className="bg-purple-50 rounded-lg p-2"><p className="font-bold text-purple-700 mb-1">주간</p><p className="text-purple-600">월:목표 / 수:점검 / 금:AAR</p></div>
                <div className="bg-emerald-50 rounded-lg p-2"><p className="font-bold text-emerald-700 mb-1">월간</p><p className="text-emerald-600">KPI분석 / 전략수립</p></div>
              </div>
            </div>
          </div>
        )}

        {/* METT */}
        {tab === "mett" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-3">🎯 상황 판단 (METT-TC)</h3>
              <div className="space-y-2">
                {([["mission", "M — 목표"], ["enemy", "E — 문제/경쟁"], ["terrain", "T — 시장/환경"], ["troops", "T — 자원"], ["time_constraint", "T — 일정"], ["civil", "C — 고객 반응"]] as const).map(([k, l]) => (
                  <div key={k}><label className={L}>{l}</label><input className={I} value={mettForm[k]} onChange={e => setMettForm({ ...mettForm, [k]: e.target.value })} /></div>
                ))}
                <button onClick={saveMett} className={B}>저장</button>
              </div>
            </div>
            {metts.map(m => (
              <div key={m.id} className={C}>
                <div className="flex justify-between text-[11px] text-slate-400 mb-2"><span>{new Date(m.created_at).toLocaleDateString("ko-KR")}</span><button onClick={() => delMett(m.id)} className="text-red-400 hover:text-red-600">삭제</button></div>
                <p className="text-sm font-semibold mb-1">{m.mission}</p>
                <div className="text-xs text-slate-500 space-y-0.5">
                  {m.enemy && <p>문제: {m.enemy}</p>}{m.terrain && <p>환경: {m.terrain}</p>}{m.troops && <p>자원: {m.troops}</p>}{m.time_constraint && <p>일정: {m.time_constraint}</p>}{m.civil && <p>고객: {m.civil}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPI */}
        {tab === "kpi" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-3">📊 KPI 입력</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><label className={L}>날짜</label><input type="date" className={I} value={metricForm.date} onChange={e => setMetricForm({ ...metricForm, date: e.target.value })} /></div>
                <div><label className={L}>매출</label><input className={I} inputMode="numeric" value={metricForm.revenue} onChange={e => setMetricForm({ ...metricForm, revenue: e.target.value })} /></div>
                <div><label className={L}>사용자</label><input className={I} inputMode="numeric" value={metricForm.users_count} onChange={e => setMetricForm({ ...metricForm, users_count: e.target.value })} /></div>
                <div><label className={L}>전환율(%)</label><input className={I} inputMode="decimal" value={metricForm.conversion_rate} onChange={e => setMetricForm({ ...metricForm, conversion_rate: e.target.value })} /></div>
                <div><label className={L}>순이익</label><input className={I} inputMode="numeric" value={metricForm.profit} onChange={e => setMetricForm({ ...metricForm, profit: e.target.value })} /></div>
              </div>
              <button onClick={saveMetric} className={B}>저장</button>
            </div>
            {metrics.length > 0 && (
              <div className={C}>
                <table className="w-full text-xs"><thead><tr className="text-slate-400 border-b"><th className="py-1.5 text-left">날짜</th><th className="text-right">매출</th><th className="text-right">사용자</th><th className="text-right">전환율</th><th className="text-right">순이익</th><th className="w-6"></th></tr></thead>
                <tbody>{metrics.slice(0, 15).map(m => (
                  <tr key={m.id} className="border-b border-slate-50"><td className="py-1.5">{m.date}</td><td className="text-right">{fmt(m.revenue)}</td><td className="text-right">{m.users_count}</td><td className="text-right">{m.conversion_rate}%</td><td className={`text-right font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(m.profit)}</td><td><button onClick={() => delMetric(m.id)} className="text-red-400 text-[10px]">✕</button></td></tr>
                ))}</tbody></table>
              </div>
            )}
          </div>
        )}

        {/* Goal */}
        {tab === "goal" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-1">🏆 목표 추가</h3>
              <p className="text-[11px] text-slate-400 mb-2">활성 목표 최대 2개</p>
              <div className="space-y-2">
                <div><label className={L}>목표</label><input className={I} value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="예: 전환율 8% 달성" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={L}>목표 수치</label><input className={I} value={goalForm.target_value} onChange={e => setGoalForm({ ...goalForm, target_value: e.target.value })} /></div>
                  <div><label className={L}>지표</label><select className={I} value={goalForm.metric_type} onChange={e => setGoalForm({ ...goalForm, metric_type: e.target.value })}><option value="revenue">매출</option><option value="users">사용자</option><option value="conversion">전환율</option><option value="profit">순이익</option></select></div>
                  <div><label className={L}>시작일</label><input type="date" className={I} value={goalForm.start_date} onChange={e => setGoalForm({ ...goalForm, start_date: e.target.value })} /></div>
                  <div><label className={L}>마감일</label><input type="date" className={I} value={goalForm.end_date} onChange={e => setGoalForm({ ...goalForm, end_date: e.target.value })} /></div>
                </div>
                <button onClick={saveGoal} className={B}>추가</button>
              </div>
            </div>
            {goals.map(g => (
              <div key={g.id} className={C}>
                <div className="flex items-center justify-between mb-1"><h4 className="text-sm font-bold">{g.title}</h4><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ST[g.status]?.bg}`}>{ST[g.status]?.label}</span></div>
                <div className="text-xs text-slate-400 mb-2">{g.start_date} ~ {g.end_date} · 목표: {g.target_value}</div>
                <div className="h-1.5 bg-slate-100 rounded-full mb-2"><div className={`h-full rounded-full ${g.status === "completed" ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.min(g.target_value > 0 ? g.current_value / g.target_value * 100 : 0, 100)}%` }} /></div>
                <div className="flex gap-2 text-[11px]">
                  {g.status === "active" && <><button onClick={() => updateGoal(g.id, "completed")} className="text-emerald-600 font-semibold">완료</button><button onClick={() => updateGoal(g.id, "failed")} className="text-red-500 font-semibold">실패</button></>}
                  <button onClick={() => delGoal(g.id)} className="text-red-400 ml-auto">삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Task */}
        {tab === "task" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-2">✅ 태스크 추가</h3>
              <div className="space-y-2">
                <div><label className={L}>할 일</label><input className={I} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="구체적인 실행 항목" /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className={L}>담당</label><input className={I} value={taskForm.assignee} onChange={e => setTaskForm({ ...taskForm, assignee: e.target.value })} /></div>
                  <div><label className={L}>마감</label><input type="date" className={I} value={taskForm.deadline} onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })} /></div>
                  <div><label className={L}>목표 연결</label><select className={I} value={taskForm.goal_id} onChange={e => setTaskForm({ ...taskForm, goal_id: e.target.value })}><option value="">없음</option>{activeGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
                </div>
                <button onClick={saveTask} className={B}>추가</button>
              </div>
            </div>
            {tasks.map(t => (
              <div key={t.id} className={`${C} flex items-center gap-3`}>
                <button onClick={() => updateTask(t.id, t.status === "completed" ? "pending" : "completed")} className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] ${t.status === "completed" ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>{t.status === "completed" ? "✓" : ""}</button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${t.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"}`}>{t.title}</p>
                  <div className="flex gap-2 text-[11px] text-slate-400">{t.assignee && <span>👤 {t.assignee}</span>}{t.deadline && <span>📅 {t.deadline.slice(5)}</span>}</div>
                </div>
                <button onClick={() => delTask(t.id)} className="text-[10px] text-red-400">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* AAR */}
        {tab === "aar" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-1">📝 AAR 작성</h3>
              <p className="text-[11px] text-slate-400 mb-2">목표 → 결과 → 차이 → 개선</p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={L}>날짜</label><input type="date" className={I} value={aarForm.date} onChange={e => setAarForm({ ...aarForm, date: e.target.value })} /></div>
                  <div><label className={L}>목표</label><input className={I} value={aarForm.goal} onChange={e => setAarForm({ ...aarForm, goal: e.target.value })} /></div>
                </div>
                <div><label className={L}>결과</label><input className={I} value={aarForm.result} onChange={e => setAarForm({ ...aarForm, result: e.target.value })} /></div>
                <div><label className={L}>차이 원인</label><textarea className={`${I} h-14`} value={aarForm.gap_reason} onChange={e => setAarForm({ ...aarForm, gap_reason: e.target.value })} /></div>
                <div><label className={L}>개선안</label><textarea className={`${I} h-14`} value={aarForm.improvement} onChange={e => setAarForm({ ...aarForm, improvement: e.target.value })} /></div>
                <button onClick={saveAAR} className={B}>저장</button>
              </div>
            </div>
            {aars.map(a => (
              <div key={a.id} className={C}>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1"><span>{a.date}</span><button onClick={() => delAAR(a.id)} className="text-red-400">삭제</button></div>
                <div className="text-xs space-y-0.5"><p><b>목표:</b> {a.goal}</p><p><b>결과:</b> {a.result}</p>{a.gap_reason && <p className="text-amber-600"><b>차이:</b> {a.gap_reason}</p>}{a.improvement && <p className="text-blue-600"><b>개선:</b> {a.improvement}</p>}</div>
              </div>
            ))}
          </div>
        )}

        {/* Notice */}
        {tab === "notice" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-3">📢 공지사항 작성</h3>
              <div className="space-y-2">
                <div><label className={L}>제목</label><input className={I} value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} /></div>
                <div><label className={L}>내용</label><textarea className={`${I} h-20`} value={noticeForm.content} onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={noticeForm.pinned} onChange={e => setNoticeForm({ ...noticeForm, pinned: e.target.checked })} />📌 상단 고정</label>
                <button onClick={saveNotice} className={B}>등록</button>
              </div>
            </div>
            {sortedNotices.map(n => (
              <div key={n.id} className={C}>
                <div className="flex items-center justify-between mb-1">
                  <button onClick={() => setExpandedNotice(expandedNotice === n.id ? null : n.id)} className="text-sm font-bold text-left flex-1">{n.pinned && "📌 "}{n.title}</button>
                  <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">{n.date}</span>
                </div>
                {expandedNotice === n.id && <p className="text-xs text-slate-600 whitespace-pre-wrap mt-1 mb-2">{n.content}</p>}
                <div className="flex gap-2 text-[11px]">
                  <button onClick={() => togglePin(n.id)} className="text-amber-600">{n.pinned ? "고정 해제" : "📌 고정"}</button>
                  <button onClick={() => delNotice(n.id)} className="text-red-400 ml-auto">삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report */}
        {tab === "report" && (
          <div className="space-y-3">
            <div className={C}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">📄 주간 보고서</h3>
                <button onClick={() => { navigator.clipboard.writeText(genReport()); flash("📋 복사됨"); }} className={B}>📋 복사</button>
              </div>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 leading-relaxed">{genReport()}</pre>
            </div>
          </div>
        )}

        {/* Feedback */}
        {tab === "feedback" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-3">🐛 피드백/버그 등록</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={L}>유형</label><select className={I} value={fbForm.type} onChange={e => setFbForm({ ...fbForm, type: e.target.value })}><option>버그</option><option>기능요청</option><option>피드백</option></select></div>
                  <div><label className={L}>우선순위</label><select className={I} value={fbForm.priority} onChange={e => setFbForm({ ...fbForm, priority: e.target.value })}><option>높음</option><option>중간</option><option>낮음</option></select></div>
                </div>
                <div><label className={L}>제목</label><input className={I} value={fbForm.title} onChange={e => setFbForm({ ...fbForm, title: e.target.value })} /></div>
                <div><label className={L}>설명</label><textarea className={`${I} h-16`} value={fbForm.description} onChange={e => setFbForm({ ...fbForm, description: e.target.value })} /></div>
                <button onClick={saveFb} className={B}>등록</button>
              </div>
            </div>
            {feedbacks.map(f => {
              const pBg: Record<string, string> = { "높음": "bg-red-100 text-red-700", "중간": "bg-amber-100 text-amber-700", "낮음": "bg-slate-100 text-slate-600" };
              const sBg: Record<string, string> = { "신규": "bg-blue-100 text-blue-700", "진행": "bg-amber-100 text-amber-700", "완료": "bg-emerald-100 text-emerald-700" };
              return (
                <div key={f.id} className={C}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sBg[f.status] ?? ""}`}>{f.status}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${pBg[f.priority] ?? ""}`}>{f.priority}</span>
                    <span className="text-[10px] text-slate-400">{f.type}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{f.date}</span>
                  </div>
                  <p className="text-sm font-semibold mb-1">{f.title}</p>
                  {f.description && <p className="text-xs text-slate-500 mb-2">{f.description}</p>}
                  <div className="flex gap-2 text-[11px]">
                    {f.status !== "완료" && <button onClick={() => updateFbStatus(f.id, f.status === "신규" ? "진행" : "완료")} className="text-blue-600 font-semibold">{f.status === "신규" ? "진행으로" : "완료로"}</button>}
                    <button onClick={() => delFb(f.id)} className="text-red-400 ml-auto">삭제</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar */}
        {tab === "calendar" && (() => {
          const { y, m } = calMonth;
          const first = new Date(y, m, 1); const startDay = first.getDay();
          const daysInMonth = new Date(y, m + 1, 0).getDate();
          const today = new Date(); const todayStr = today.toISOString().slice(0, 10);
          const cells: (number | null)[] = Array(startDay).fill(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);
          const dateStr = (d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const taskDates = new Set(tasks.filter(t => t.deadline).map(t => t.deadline));
          const goalDates = new Set(goals.flatMap(g => [g.end_date]));
          return (
            <div className="space-y-3">
              <div className={C}>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCalMonth(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })} className="text-sm text-slate-500 hover:text-slate-800 px-2">◀</button>
                  <h3 className="text-sm font-bold">{y}년 {m + 1}월</h3>
                  <button onClick={() => setCalMonth(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })} className="text-sm text-slate-500 hover:text-slate-800 px-2">▶</button>
                </div>
                <div className="grid grid-cols-7 text-center text-[11px]">
                  {["일", "월", "화", "수", "목", "금", "토"].map(d => <div key={d} className="py-1 font-bold text-slate-400">{d}</div>)}
                  {cells.map((d, i) => {
                    if (!d) return <div key={i} className="py-2" />;
                    const ds = dateStr(d); const isToday = ds === todayStr;
                    const hasTask = taskDates.has(ds); const hasGoal = goalDates.has(ds);
                    return (
                      <div key={i} className={`py-2 rounded-lg text-xs relative ${isToday ? "bg-blue-600 text-white font-bold" : "text-slate-700"}`}>
                        {d}
                        {(hasTask || hasGoal) && <div className="flex justify-center gap-0.5 mt-0.5">{hasTask && <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />}{hasGoal && <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" />}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-slate-400"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />태스크 마감</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />목표 마감</span></div>
              </div>
            </div>
          );
        })()}

        {/* Memo */}
        {tab === "memo" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-2">💬 빠른 메모</h3>
              <textarea className={`${I} h-16`} value={memoText} onChange={e => setMemoText(e.target.value)} placeholder="메모를 입력하세요..." />
              <button onClick={saveMemo} className={`${B} mt-2`}>저장</button>
            </div>
            {memos.map(m => (
              <div key={m.id} className={C}>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1"><span>{m.time}</span><button onClick={() => delMemo(m.id)} className="text-red-400">삭제</button></div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Team */}
        {tab === "team" && (
          <div className="space-y-3">
            <div className={C}>
              <h3 className="text-sm font-bold mb-3">👥 팀 멤버 추가</h3>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div><label className={L}>이름</label><input className={I} value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="홍길동" /></div>
                <div><label className={L}>역할</label><input className={I} value={teamForm.role} onChange={e => setTeamForm({ ...teamForm, role: e.target.value })} placeholder="개발자" /></div>
                <div><label className={L}>이메일</label><input className={I} value={teamForm.email} onChange={e => setTeamForm({ ...teamForm, email: e.target.value })} placeholder="email@company.com" /></div>
              </div>
              <button onClick={saveTeamMember} className={B}>추가</button>
            </div>
            {teamMembers.map(m => {
              const statusDot: Record<string, string> = { active: "bg-emerald-500", away: "bg-amber-400", offline: "bg-slate-300" };
              const statusLabel: Record<string, string> = { active: "활동", away: "자리비움", offline: "오프라인" };
              return (
                <div key={m.id} className={`${C} flex items-center gap-3`}>
                  <button onClick={() => toggleTeamStatus(m.id)} className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDot[m.status]}`} title={statusLabel[m.status]} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{m.name} <span className="text-xs text-slate-400 font-normal">{m.role}</span></p>
                    {m.email && <p className="text-[11px] text-slate-400">{m.email}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400">{statusLabel[m.status]}</span>
                  <button onClick={() => delTeamMember(m.id)} className="text-[10px] text-red-400">✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Timeline */}
        {tab === "timeline" && (() => {
          type TLItem = { time: string; icon: string; label: string; desc: string };
          const items: TLItem[] = [];
          metts.slice(0, 5).forEach(m => items.push({ time: m.created_at, icon: "🎯", label: "상황판단", desc: m.mission }));
          metrics.slice(0, 5).forEach(m => items.push({ time: m.date + "T00:00:00", icon: "📊", label: "KPI", desc: `매출 ${fmt(m.revenue)}원 / 순이익 ${fmt(m.profit)}원` }));
          goals.forEach(g => items.push({ time: g.start_date + "T00:00:00", icon: "🏆", label: `목표 [${ST[g.status]?.label ?? g.status}]`, desc: g.title }));
          tasks.filter(t => t.status === "completed").slice(0, 5).forEach(t => items.push({ time: t.deadline ? t.deadline + "T00:00:00" : new Date().toISOString(), icon: "✅", label: "태스크 완료", desc: t.title }));
          aars.slice(0, 5).forEach(a => items.push({ time: a.date + "T00:00:00", icon: "📝", label: "AAR", desc: a.goal }));
          notices.slice(0, 5).forEach(n => items.push({ time: n.date + "T00:00:00", icon: "📢", label: "공지", desc: n.title }));
          items.sort((a, b) => b.time.localeCompare(a.time));
          return (
            <div className="space-y-0">
              <h3 className="text-sm font-bold mb-4">🕐 활동 타임라인</h3>
              {items.length === 0 ? <p className="text-xs text-slate-400">데이터가 없습니다.</p> : (
                <div className="relative border-l-2 border-slate-200 ml-3">
                  {items.map((it, i) => (
                    <div key={i} className="relative pl-6 pb-5">
                      <span className="absolute -left-[11px] top-0.5 w-5 h-5 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-[10px]">{it.icon}</span>
                      <p className="text-[10px] text-slate-400 mb-0.5">{new Date(it.time).toLocaleDateString("ko-KR")} · {it.label}</p>
                      <p className="text-xs text-slate-800">{it.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </main>
    </div>
  );
}
