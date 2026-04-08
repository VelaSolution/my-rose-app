"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type Tab = "mett" | "kpi" | "goal" | "task" | "aar";

type Mett = { id: string; mission: string; enemy: string; terrain: string; troops: string; time_constraint: string; civil: string; created_at: string };
type Metric = { id: string; date: string; revenue: number; users_count: number; conversion_rate: number; profit: number };
type Goal = { id: string; title: string; target_value: number; current_value: number; metric_type: string; start_date: string; end_date: string; status: string };
type Task = { id: string; goal_id: string | null; title: string; assignee: string; deadline: string; status: string; result: string };
type AAR = { id: string; date: string; goal: string; result: string; gap_reason: string; improvement: string };

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "mett", label: "METT-TC", icon: "🎯" },
  { key: "kpi", label: "KPI", icon: "📊" },
  { key: "goal", label: "목표", icon: "🏆" },
  { key: "task", label: "태스크", icon: "✅" },
  { key: "aar", label: "AAR", icon: "📝" },
];

const fmt = (n: number) => n.toLocaleString("ko-KR");
const STATUS_COLOR: Record<string, string> = {
  active: "bg-blue-50 text-blue-700", completed: "bg-emerald-50 text-emerald-700", failed: "bg-red-50 text-red-700",
  pending: "bg-slate-100 text-slate-600", in_progress: "bg-amber-50 text-amber-700",
};
const STATUS_LABEL: Record<string, string> = {
  active: "진행중", completed: "완료", failed: "실패", pending: "대기", in_progress: "진행중",
};

export default function HQPage() {
  const [tab, setTab] = useState<Tab>("mett");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Data
  const [metts, setMetts] = useState<Mett[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aars, setAars] = useState<AAR[]>([]);

  // Forms
  const [mettForm, setMettForm] = useState({ mission: "", enemy: "", terrain: "", troops: "", time_constraint: "", civil: "" });
  const [metricForm, setMetricForm] = useState({ date: new Date().toISOString().slice(0, 10), revenue: "", users_count: "", conversion_rate: "", profit: "" });
  const [goalForm, setGoalForm] = useState({ title: "", target_value: "", metric_type: "revenue", start_date: new Date().toISOString().slice(0, 10), end_date: "" });
  const [taskForm, setTaskForm] = useState({ title: "", assignee: "", deadline: "", goal_id: "" });
  const [aarForm, setAarForm] = useState({ date: new Date().toISOString().slice(0, 10), goal: "", result: "", gap_reason: "", improvement: "" });

  const sb = typeof window !== "undefined" ? createSupabaseBrowserClient() : null;

  useEffect(() => {
    if (!sb) return;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // 권한 확인 — admin 이메일 체크
      const { data: profile } = await sb.from("profiles").select("email, plan").eq("id", user.id).single();
      const adminEmails = ["mnhyuk@velaanalytics.com", "mnhyuk0213@gmail.com"];
      if (adminEmails.includes(user.email ?? "") || adminEmails.includes(profile?.email ?? "")) {
        setAuthorized(true);
      }

      // 데이터 로드
      const [m, met, g, t, a] = await Promise.all([
        sb.from("hq_mett").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        sb.from("hq_metrics").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
        sb.from("hq_goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        sb.from("hq_tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        sb.from("hq_aar").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(10),
      ]);
      setMetts((m.data ?? []) as Mett[]);
      setMetrics((met.data ?? []) as Metric[]);
      setGoals((g.data ?? []) as Goal[]);
      setTasks((t.data ?? []) as Task[]);
      setAars((a.data ?? []) as AAR[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" /></div>;
  if (!authorized) return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">접근 권한이 없습니다</h2>
        <p className="text-sm text-slate-500 mb-4">HQ는 관리자 전용 페이지입니다.</p>
        <Link href="/" className="rounded-xl bg-slate-900 text-white font-semibold px-5 py-2.5 text-sm">홈으로</Link>
      </div>
    </main>
  );

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white outline-none transition";
  const cardCls = "bg-white ring-1 ring-slate-200 rounded-3xl p-5 mb-4";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1";
  const btnCls = "rounded-xl bg-slate-900 text-white font-semibold px-5 py-2.5 text-sm hover:bg-slate-800 transition";

  const saveMett = async () => {
    if (!sb || !userId || !mettForm.mission.trim()) return;
    const { data } = await sb.from("hq_mett").insert({ user_id: userId, ...mettForm }).select().single();
    if (data) setMetts([data as Mett, ...metts]);
    setMettForm({ mission: "", enemy: "", terrain: "", troops: "", time_constraint: "", civil: "" });
  };

  const saveMetric = async () => {
    if (!sb || !userId) return;
    const payload = { user_id: userId, date: metricForm.date, revenue: Number(metricForm.revenue) || 0, users_count: Number(metricForm.users_count) || 0, conversion_rate: Number(metricForm.conversion_rate) || 0, profit: Number(metricForm.profit) || 0 };
    const { data } = await sb.from("hq_metrics").upsert(payload, { onConflict: "user_id,date" }).select().single();
    if (data) { setMetrics([data as Metric, ...metrics.filter(m => m.date !== metricForm.date)]); }
    setMetricForm({ date: new Date().toISOString().slice(0, 10), revenue: "", users_count: "", conversion_rate: "", profit: "" });
  };

  const saveGoal = async () => {
    if (!sb || !userId || !goalForm.title.trim()) return;
    if (goals.filter(g => g.status === "active").length >= 2) { alert("활성 목표는 최대 2개까지 가능합니다."); return; }
    const { data } = await sb.from("hq_goals").insert({ user_id: userId, ...goalForm, target_value: Number(goalForm.target_value) || 0 }).select().single();
    if (data) setGoals([data as Goal, ...goals]);
    setGoalForm({ title: "", target_value: "", metric_type: "revenue", start_date: new Date().toISOString().slice(0, 10), end_date: "" });
  };

  const saveTask = async () => {
    if (!sb || !userId || !taskForm.title.trim()) return;
    const { data } = await sb.from("hq_tasks").insert({ user_id: userId, ...taskForm, goal_id: taskForm.goal_id || null }).select().single();
    if (data) setTasks([data as Task, ...tasks]);
    setTaskForm({ title: "", assignee: "", deadline: "", goal_id: "" });
  };

  const updateTaskStatus = async (id: string, status: string) => {
    if (!sb) return;
    await sb.from("hq_tasks").update({ status }).eq("id", id);
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
  };

  const saveAAR = async () => {
    if (!sb || !userId || !aarForm.goal.trim()) return;
    const { data } = await sb.from("hq_aar").insert({ user_id: userId, ...aarForm }).select().single();
    if (data) setAars([data as AAR, ...aars]);
    setAarForm({ date: new Date().toISOString().slice(0, 10), goal: "", result: "", gap_reason: "", improvement: "" });
  };

  const updateGoalStatus = async (id: string, status: string) => {
    if (!sb) return;
    await sb.from("hq_goals").update({ status }).eq("id", id);
    setGoals(goals.map(g => g.id === id ? { ...g, status } : g));
  };

  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-2">
              🏛️ VELA HQ
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">운영 시스템</h1>
            <p className="text-xs text-slate-400 mt-0.5">METT-TC → KPI → Goal → Task → AAR</p>
          </div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-600">대시보드 →</Link>
        </div>

        {/* 탭 */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition ${tab === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* METT-TC */}
        {tab === "mett" && (
          <>
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-slate-900 mb-3">🎯 상황 판단 (METT-TC)</h3>
              <div className="space-y-3">
                {([["mission", "M — Mission (목표)"], ["enemy", "E — Enemy (문제/경쟁)"], ["terrain", "T — Terrain (시장/환경)"], ["troops", "T — Troops (자원)"], ["time_constraint", "T — Time (일정)"], ["civil", "C — Civil (고객 반응)"]] as const).map(([k, label]) => (
                  <div key={k}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputCls} value={mettForm[k]} onChange={e => setMettForm({ ...mettForm, [k]: e.target.value })} placeholder={label} />
                  </div>
                ))}
                <button onClick={saveMett} className={btnCls}>저장</button>
              </div>
            </div>
            {metts.map(m => (
              <div key={m.id} className={cardCls}>
                <p className="text-[11px] text-slate-400 mb-2">{new Date(m.created_at).toLocaleDateString("ko-KR")}</p>
                <div className="space-y-1 text-xs">
                  {([["M", m.mission], ["E", m.enemy], ["T", m.terrain], ["T", m.troops], ["T", m.time_constraint], ["C", m.civil]] as const).map(([k, v], i) => v && (
                    <p key={i}><b className="text-slate-700">{k}:</b> <span className="text-slate-600">{v}</span></p>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* KPI */}
        {tab === "kpi" && (
          <>
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-slate-900 mb-3">📊 KPI 입력</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className={labelCls}>날짜</label><input type="date" className={inputCls} value={metricForm.date} onChange={e => setMetricForm({ ...metricForm, date: e.target.value })} /></div>
                <div><label className={labelCls}>매출 (원)</label><input className={inputCls} inputMode="numeric" value={metricForm.revenue} onChange={e => setMetricForm({ ...metricForm, revenue: e.target.value })} /></div>
                <div><label className={labelCls}>사용자 수</label><input className={inputCls} inputMode="numeric" value={metricForm.users_count} onChange={e => setMetricForm({ ...metricForm, users_count: e.target.value })} /></div>
                <div><label className={labelCls}>전환율 (%)</label><input className={inputCls} inputMode="decimal" value={metricForm.conversion_rate} onChange={e => setMetricForm({ ...metricForm, conversion_rate: e.target.value })} /></div>
                <div><label className={labelCls}>순이익 (원)</label><input className={inputCls} inputMode="numeric" value={metricForm.profit} onChange={e => setMetricForm({ ...metricForm, profit: e.target.value })} /></div>
              </div>
              <button onClick={saveMetric} className={btnCls}>저장</button>
            </div>
            {metrics.length > 0 && (
              <div className={cardCls}>
                <h3 className="text-sm font-bold text-slate-900 mb-3">📈 최근 KPI</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-slate-400 border-b border-slate-100"><th className="py-2 text-left">날짜</th><th className="py-2 text-right">매출</th><th className="py-2 text-right">사용자</th><th className="py-2 text-right">전환율</th><th className="py-2 text-right">순이익</th></tr></thead>
                    <tbody>{metrics.slice(0, 10).map(m => (
                      <tr key={m.id} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-700">{m.date}</td>
                        <td className="py-1.5 text-right font-semibold">{fmt(m.revenue)}</td>
                        <td className="py-1.5 text-right">{m.users_count}</td>
                        <td className="py-1.5 text-right">{m.conversion_rate}%</td>
                        <td className={`py-1.5 text-right font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(m.profit)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Goal */}
        {tab === "goal" && (
          <>
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-slate-900 mb-1">🏆 목표 설정</h3>
              <p className="text-[11px] text-slate-400 mb-3">활성 목표는 최대 2개. 집중하세요.</p>
              <div className="space-y-3">
                <div><label className={labelCls}>목표</label><input className={inputCls} value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="예: 전환율 5% → 8%" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>목표 수치</label><input className={inputCls} value={goalForm.target_value} onChange={e => setGoalForm({ ...goalForm, target_value: e.target.value })} placeholder="8" /></div>
                  <div><label className={labelCls}>지표</label>
                    <select className={inputCls} value={goalForm.metric_type} onChange={e => setGoalForm({ ...goalForm, metric_type: e.target.value })}>
                      <option value="revenue">매출</option><option value="users">사용자수</option><option value="conversion">전환율</option><option value="profit">순이익</option><option value="custom">기타</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>시작일</label><input type="date" className={inputCls} value={goalForm.start_date} onChange={e => setGoalForm({ ...goalForm, start_date: e.target.value })} /></div>
                  <div><label className={labelCls}>마감일</label><input type="date" className={inputCls} value={goalForm.end_date} onChange={e => setGoalForm({ ...goalForm, end_date: e.target.value })} /></div>
                </div>
                <button onClick={saveGoal} disabled={goals.filter(g => g.status === "active").length >= 2} className={`${btnCls} disabled:opacity-40`}>목표 추가</button>
              </div>
            </div>
            {goals.map(g => (
              <div key={g.id} className={cardCls}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900">{g.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_COLOR[g.status]}`}>{STATUS_LABEL[g.status]}</span>
                </div>
                <div className="flex gap-4 text-xs text-slate-500 mb-2">
                  <span>목표: {g.target_value}</span><span>현재: {g.current_value}</span><span>{g.start_date} ~ {g.end_date}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full mb-2">
                  <div className={`h-full rounded-full ${g.status === "completed" ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.min(g.target_value > 0 ? g.current_value / g.target_value * 100 : 0, 100)}%` }} />
                </div>
                {g.status === "active" && (
                  <div className="flex gap-2">
                    <button onClick={() => updateGoalStatus(g.id, "completed")} className="text-[11px] text-emerald-600 font-semibold">완료</button>
                    <button onClick={() => updateGoalStatus(g.id, "failed")} className="text-[11px] text-red-500 font-semibold">실패</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Task */}
        {tab === "task" && (
          <>
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-slate-900 mb-3">✅ 태스크 추가</h3>
              <div className="space-y-3">
                <div><label className={labelCls}>할 일</label><input className={inputCls} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="구체적인 실행 항목" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelCls}>담당자</label><input className={inputCls} value={taskForm.assignee} onChange={e => setTaskForm({ ...taskForm, assignee: e.target.value })} /></div>
                  <div><label className={labelCls}>마감일</label><input type="date" className={inputCls} value={taskForm.deadline} onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })} /></div>
                  <div><label className={labelCls}>연결 목표</label>
                    <select className={inputCls} value={taskForm.goal_id} onChange={e => setTaskForm({ ...taskForm, goal_id: e.target.value })}>
                      <option value="">없음</option>
                      {goals.filter(g => g.status === "active").map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={saveTask} className={btnCls}>추가</button>
              </div>
            </div>
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className={`${cardCls} flex items-center gap-3`}>
                  <button onClick={() => updateTaskStatus(t.id, t.status === "completed" ? "pending" : "completed")}
                    className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs ${t.status === "completed" ? "bg-emerald-500 text-white" : "ring-1 ring-slate-200"}`}>
                    {t.status === "completed" ? "✓" : ""}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${t.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"}`}>{t.title}</p>
                    <div className="flex gap-2 text-[11px] text-slate-400 mt-0.5">
                      {t.assignee && <span>👤 {t.assignee}</span>}
                      {t.deadline && <span>📅 {t.deadline}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* AAR */}
        {tab === "aar" && (
          <>
            <div className={cardCls}>
              <h3 className="text-sm font-bold text-slate-900 mb-1">📝 AAR (After Action Review)</h3>
              <p className="text-[11px] text-slate-400 mb-3">목표 → 결과 → 차이 원인 → 개선안</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>날짜</label><input type="date" className={inputCls} value={aarForm.date} onChange={e => setAarForm({ ...aarForm, date: e.target.value })} /></div>
                  <div><label className={labelCls}>목표</label><input className={inputCls} value={aarForm.goal} onChange={e => setAarForm({ ...aarForm, goal: e.target.value })} placeholder="무엇을 달성하려 했나" /></div>
                </div>
                <div><label className={labelCls}>결과</label><input className={inputCls} value={aarForm.result} onChange={e => setAarForm({ ...aarForm, result: e.target.value })} placeholder="실제 결과는" /></div>
                <div><label className={labelCls}>차이 원인</label><textarea className={`${inputCls} h-16`} value={aarForm.gap_reason} onChange={e => setAarForm({ ...aarForm, gap_reason: e.target.value })} placeholder="왜 차이가 발생했는가" /></div>
                <div><label className={labelCls}>개선안</label><textarea className={`${inputCls} h-16`} value={aarForm.improvement} onChange={e => setAarForm({ ...aarForm, improvement: e.target.value })} placeholder="다음에는 어떻게 할 것인가" /></div>
                <button onClick={saveAAR} className={btnCls}>저장</button>
              </div>
            </div>
            {aars.map(a => (
              <div key={a.id} className={cardCls}>
                <p className="text-[11px] text-slate-400 mb-2">{a.date}</p>
                <div className="space-y-1.5 text-xs">
                  <p><b className="text-slate-700">목표:</b> {a.goal}</p>
                  <p><b className="text-slate-700">결과:</b> {a.result}</p>
                  {a.gap_reason && <p><b className="text-amber-600">차이 원인:</b> {a.gap_reason}</p>}
                  {a.improvement && <p><b className="text-blue-600">개선안:</b> {a.improvement}</p>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
