"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { NotesWidget } from "@/app/notes/page";
import PlanGate from "@/components/PlanGate";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const IND: Record<string, string> = { cafe:"☕", restaurant:"🍽️", bar:"🍺", finedining:"✨", gogi:"🥩" };
const IND_LABEL: Record<string, string> = { cafe:"카페", restaurant:"음식점", bar:"술집/바", finedining:"파인다이닝", gogi:"고깃집" };

const TOOLS = [
  { icon:"🧮", label:"원가 계산기",    href:"/tools/menu-cost" },
  { icon:"👥", label:"인건비 스케줄러", href:"/tools/labor" },
  { icon:"🧾", label:"세금 계산기",    href:"/tools/tax" },
  { icon:"📄", label:"손익계산서 PDF", href:"/tools/pl-report" },
  { icon:"✅", label:"창업 체크리스트", href:"/tools/startup-checklist" },
  { icon:"📱", label:"SNS 콘텐츠",     href:"/tools/sns-content" },
  { icon:"💬", label:"리뷰 답변",      href:"/tools/review-reply" },
  { icon:"🗺️", label:"상권 분석",     href:"/tools/area-analysis" },
];

type Snapshot   = { id:string; month:string; industry:string; total_sales:number; net_profit:number; cogs:number; };
type SimHistory = { id:string; label:string; created_at:string; result:{totalSales:number;netProfit:number;netMargin:number}; form:{industry:string}; };
type MenuCost   = { id:string; name:string; cogs_rate:number; margin:number; sell_price:number; };
type FeedPost   = { id:string; nickname:string; industry:string; title:string; net_profit:number; total_sales:number; };

export default function DashboardHome() {
  const [user, setUser]           = useState<User|null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [sims, setSims]           = useState<SimHistory[]>([]);
  const [menus, setMenus]         = useState<MenuCost[]>([]);
  const [feed, setFeed]           = useState<FeedPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [monthlyGoal, setMonthlyGoal] = useState<number|null>(null);
  const [goalInput, setGoalInput]     = useState("");
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [todaySales, setTodaySales] = useState("");
  const [todaySaved, setTodaySaved] = useState(false);
  const sb = typeof window !== "undefined" ? createSupabaseBrowserClient() : null;

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(async ({ data }: { data: { user: User | null } }) => {
      const user = data.user;
      setUser(user);
      if (!user) { setLoading(false); return; }
      const [{ data: snaps }, { data: simData }, { data: menuData }, { data: posts }] = await Promise.all([
        sb.from("monthly_snapshots").select("id,month,industry,total_sales,net_profit,cogs").eq("user_id", user.id).order("month", { ascending: false }).limit(6),
        sb.from("simulation_history").select("id,label,created_at,result,form").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        sb.from("menu_costs").select("id,name,cogs_rate,margin,sell_price").eq("user_id", user.id).order("cogs_rate", { ascending: false }).limit(5),
        sb.from("simulation_shares").select("id,nickname,industry,title,net_profit,total_sales").order("created_at", { ascending: false }).limit(4),
      ]);
      setSnapshots((snaps ?? []) as Snapshot[]);
      setSims((simData ?? []) as SimHistory[]);
      setMenus((menuData ?? []) as MenuCost[]);
      setFeed((posts ?? []) as FeedPost[]);
      setLoading(false);
    });
  }, [sb]);

  // 목표 달성 게이지: localStorage에서 목표 불러오기
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("vela-monthly-goal");
    if (saved) setMonthlyGoal(Number(saved));
  }, []);

  // 오늘의 매출: localStorage에서 불러오기
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const saved = JSON.parse(localStorage.getItem("vela-today-sales") ?? "{}");
      if (saved.date === today) { setTodaySales(String(saved.sales)); setTodaySaved(true); }
    } catch { /* */ }
  }, []);

  const handleSetGoal = () => {
    const val = Number(goalInput.replace(/[^0-9]/g, ""));
    if (val > 0) {
      localStorage.setItem("vela-monthly-goal", String(val));
      setMonthlyGoal(val);
      setShowGoalModal(false);
      setGoalInput("");
    }
  };

  // 알림 센터: 알림 생성
  const generateAlerts = () => {
    const alerts: { type: "warning"|"critical"|"good"; message: string }[] = [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const hasCurrentMonth = snapshots.some(s => s.month === currentMonth);

    if (!hasCurrentMonth) {
      alerts.push({ type: "warning", message: "📋 이번 달 매출을 아직 등록하지 않았어요" });
    }

    if (latestSnap) {
      const costRate = latestSnap.cogs / (latestSnap.total_sales || 1) * 100;
      const benchmarkCostRate = 35;
      if (costRate > benchmarkCostRate) {
        alerts.push({ type: "critical", message: "⚠️ 원가율이 업계 평균보다 높습니다" });
      }
    }

    const sorted = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
    if (sorted.length >= 3) {
      const last3 = sorted.slice(-3);
      if (last3[2].net_profit < last3[1].net_profit && last3[1].net_profit < last3[0].net_profit) {
        alerts.push({ type: "critical", message: "📉 순이익이 2개월 연속 감소 중입니다" });
      }
    }

    if (alerts.length === 0) {
      alerts.push({ type: "good", message: "✅ 매장이 건강하게 운영되고 있어요" });
    }

    return alerts.slice(0, 3);
  };

  // 매출 예측: 선형 회귀
  const generatePredictions = () => {
    const sorted = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
    if (sorted.length < 3) return null;
    const n = sorted.length;
    const xs = sorted.map((_, i) => i);
    const salesYs = sorted.map(s => s.total_sales);
    const profitYs = sorted.map(s => s.net_profit);

    const linearRegress = (ys: number[]) => {
      const xMean = xs.reduce((a, b) => a + b, 0) / n;
      const yMean = ys.reduce((a, b) => a + b, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) { num += (xs[i] - xMean) * (ys[i] - yMean); den += (xs[i] - xMean) ** 2; }
      const slope = den === 0 ? 0 : num / den;
      const intercept = yMean - slope * xMean;
      return { slope, intercept };
    };

    const salesReg = linearRegress(salesYs);
    const profitReg = linearRegress(profitYs);

    const predictions: { month: string; sales: number; profit: number }[] = [];
    const lastMonth = sorted[sorted.length - 1].month;
    const [ly, lm] = lastMonth.split("-").map(Number);

    for (let i = 1; i <= 3; i++) {
      const mi = lm + i;
      const y = ly + Math.floor((mi - 1) / 12);
      const m = ((mi - 1) % 12) + 1;
      const idx = n - 1 + i;
      predictions.push({
        month: `${y}-${String(m).padStart(2, "0")}`,
        sales: Math.max(0, Math.round(salesReg.slope * idx + salesReg.intercept)),
        profit: Math.round(profitReg.slope * idx + profitReg.intercept),
      });
    }
    return predictions;
  };

  const name = user?.user_metadata?.nickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "사장님";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "안녕하세요" : "오늘도 수고하셨어요";
  const latestSnap = snapshots[0];
  const avgCostRate = menus.length > 0 ? menus.reduce((a, m) => a + (m.cogs_rate || 0), 0) / menus.length : 0;
  const totalRevenue = snapshots.reduce((a, s) => a + s.total_sales, 0);
  const maxSales = Math.max(...[...snapshots].reverse().map(s => s.total_sales), 1);

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-2xl w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-3xl" />
        <div className="h-48 bg-slate-200 rounded-3xl" />
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <p className="text-xl font-bold text-slate-900">로그인 후 이용하세요</p>
        <Link href="/login" className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white">로그인</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      
      <main className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* 인사말 헤더 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-slate-400">{new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric", weekday:"long" })}</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{greeting}, {name}! 👋</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/simulator" className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">시뮬레이터 →</Link>
            </div>
          </div>

          {/* 알림 센터 */}
          {(() => {
            const alerts = generateAlerts();
            return (
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <div key={i} className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                    alert.type === "critical" ? "bg-red-50 text-red-700 ring-1 ring-red-200" :
                    alert.type === "warning" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" :
                    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  }`}>
                    {alert.message}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 핵심 지표 4개 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:"최근 월 매출",   value: latestSnap ? fmt(latestSnap.total_sales)+"원" : "—",   sub: latestSnap?.month ?? "등록 필요", color:"text-slate-900" },
              { label:"최근 월 순이익", value: latestSnap ? fmt(latestSnap.net_profit)+"원" : "—",    sub: latestSnap ? (latestSnap.net_profit>=0?"흑자 ✓":"적자 ✗") : "", color: !latestSnap ? "text-slate-900" : latestSnap.net_profit>=0?"text-emerald-600":"text-red-500" },
              { label:"누적 총 매출",   value: totalRevenue > 0 ? fmt(totalRevenue)+"원" : "—",         sub: `${snapshots.length}개월 합계`, color:"text-blue-600" },
              { label:"평균 원가율",    value: menus.length > 0 ? avgCostRate.toFixed(1)+"%" : "—",    sub: `메뉴 ${menus.length}개 기준`, color: avgCostRate > 40 ? "text-red-500" : menus.length > 0 ? "text-emerald-600" : "text-slate-900" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                {s.sub && <p className="text-xs text-slate-400 mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* 오늘의 매출 퀵 입력 */}
          {(() => {
            const todayKey = "vela-today-sales";
            const today = new Date().toISOString().slice(0, 10);
            const dailyGoal = monthlyGoal ? Math.round(monthlyGoal / 26) : 0;
            const todayNum = Number(todaySales.replace(/[^0-9]/g, "")) || 0;
            const goalPct = dailyGoal > 0 ? Math.min(Math.round((todayNum / dailyGoal) * 100), 100) : 0;
            return (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-900">📊 오늘의 매출</h2>
                  <span className="text-xs text-slate-400">{today}</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text" inputMode="numeric" value={todaySaved ? fmt(todayNum) : todaySales}
                    onChange={(e) => { setTodaySales(e.target.value.replace(/[^0-9]/g, "")); setTodaySaved(false); }}
                    placeholder="오늘 매출 입력"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={() => {
                    if (!todaySales) return;
                    localStorage.setItem(todayKey, JSON.stringify({ date: today, sales: todayNum }));
                    setTodaySaved(true);
                  }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">{todaySaved ? "저장됨 ✓" : "저장"}</button>
                </div>
                {dailyGoal > 0 && todayNum > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>일 목표 {fmt(dailyGoal)}원</span>
                      <span className={goalPct >= 100 ? "text-emerald-500 font-semibold" : ""}>{goalPct}% 달성</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full transition-all ${goalPct >= 100 ? "bg-emerald-500" : goalPct >= 70 ? "bg-blue-500" : "bg-amber-400"}`} style={{ width: `${goalPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 목표 달성 게이지 */}
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">🎯 월 매출 목표</h2>
              <button
                onClick={() => { setGoalInput(monthlyGoal ? String(monthlyGoal) : ""); setShowGoalModal(true); }}
                className="text-xs text-blue-500 font-semibold hover:text-blue-700"
              >
                목표 설정
              </button>
            </div>
            {monthlyGoal ? (
              (() => {
                const current = latestSnap?.total_sales ?? 0;
                const pct = Math.min(Math.round((current / monthlyGoal) * 100), 999);
                return (
                  <div>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-2xl font-bold text-slate-900">{pct}%</span>
                      <span className="text-xs text-slate-400">목표 {fmt(monthlyGoal)}원</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-amber-400"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {latestSnap ? `${latestSnap.month} 매출 기준` : "매출 데이터 없음"}
                      {pct >= 100 ? " · 🎉 목표 달성!" : ` · 남은 금액 ${fmt(Math.max(0, monthlyGoal - current))}원`}
                    </p>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-slate-400">월 매출 목표를 설정하면 달성률을 확인할 수 있어요</p>
            )}
            {showGoalModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowGoalModal(false)}>
                <div className="bg-white rounded-3xl p-6 w-80 shadow-xl ring-1 ring-slate-200" onClick={e => e.stopPropagation()}>
                  <h3 className="text-base font-bold text-slate-900 mb-3">월 매출 목표 설정</h3>
                  <input
                    type="text"
                    placeholder="예: 30000000"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => e.key === "Enter" && handleSetGoal()}
                  />
                  <p className="text-xs text-slate-400 mb-4">{goalInput ? `${fmt(Number(goalInput.replace(/[^0-9]/g, "")))}원` : "숫자만 입력하세요"}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowGoalModal(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">취소</button>
                    <button onClick={handleSetGoal} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">저장</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* 왼쪽 2/3 */}
            <div className="lg:col-span-2 space-y-5">

              {/* 월별 매출 차트 — 스탠다드 이상 */}
              <PlanGate>
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-slate-900">📈 월별 매출 현황</h2>
                  <div className="flex gap-2">
                    {snapshots.length > 0 && (
                      <button onClick={() => {
                        const header = "월,매출,순이익,순이익률\n";
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const rows = snapshots.map((s:any) => `${s.month},${s.total_sales},${s.net_profit},${s.net_margin ?? 0}`).join("\n");
                        const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
                        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "VELA_월별매출.csv"; a.click();
                      }} className="text-xs text-slate-400 font-semibold hover:text-slate-600">CSV ↓</button>
                    )}
                    <Link href="/monthly-input" className="text-xs text-blue-500 font-semibold hover:text-blue-700">상세보기 →</Link>
                  </div>
                </div>
                {snapshots.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">📊</p>
                    <p className="text-slate-400 text-sm mb-3">매출을 등록하면 여기에 차트가 표시됩니다</p>
                    <Link href="/monthly-input" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">매출 입력 →</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-end gap-2 h-32">
                      {[...snapshots].reverse().map(s => (
                        <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${s.net_profit>=0?"text-emerald-600":"text-red-500"}`} style={{fontSize:"9px"}}>
                            {s.net_profit>=0?"+":""}{Math.round(s.net_profit/10000)}만
                          </span>
                          <div className={`w-full rounded-t-lg ${s.net_profit>=0?"bg-blue-500":"bg-red-400"}`}
                            style={{ height:`${Math.max(4, (s.total_sales/maxSales)*100)}px` }} />
                          <span className="text-slate-400 text-center" style={{fontSize:"9px"}}>{s.month.slice(2).replace("-","/")}월</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {snapshots.slice(0, 2).map(s => (
                        <div key={s.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <p className="text-xs text-slate-400">{s.month} {IND[s.industry]}</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">{fmt(s.total_sales)}원</p>
                          <p className={`text-xs font-semibold mt-0.5 ${s.net_profit>=0?"text-emerald-600":"text-red-500"}`}>
                            순이익 {s.net_profit>=0?"+":""}{fmt(s.net_profit)}원
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </PlanGate>

              {/* 월별 추이 LineChart — 스탠다드 이상 */}
              {snapshots.length >= 2 && (
              <PlanGate>
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <h2 className="text-base font-bold text-slate-900 mb-4">📊 매출·순이익 추이</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={[...snapshots].reverse().map(s => ({
                    month: s.month.slice(2).replace("-", "/"),
                    매출: Math.round(s.total_sales / 10000),
                    순이익: Math.round(s.net_profit / 10000),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v: number) => `${v}만`} />
                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}만원`]} />
                    <Legend />
                    <Line type="monotone" dataKey="매출" stroke="#3182F6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="순이익" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              </PlanGate>
              )}

              {/* 매출 예측 — 스탠다드 이상 */}
              <PlanGate>
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <h2 className="text-base font-bold text-slate-900 mb-4">🔮 매출 예측</h2>
                {(() => {
                  const predictions = generatePredictions();
                  if (!predictions) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-3xl mb-2">📈</p>
                        <p className="text-slate-400 text-sm">3개월 이상 매출 데이터가 있으면 예측이 가능합니다</p>
                      </div>
                    );
                  }
                  const allData = [
                    ...[...snapshots].sort((a, b) => a.month.localeCompare(b.month)).slice(-3).map(s => ({ month: s.month, sales: s.total_sales, profit: s.net_profit, predicted: false })),
                    ...predictions.map(p => ({ month: p.month, sales: p.sales, profit: p.profit, predicted: true })),
                  ];
                  const predMax = Math.max(...allData.map(d => d.sales), 1);
                  return (
                    <div className="space-y-4">
                      <div className="flex items-end gap-2 h-32">
                        {allData.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-slate-500" style={{ fontSize: "9px" }}>
                              {Math.round(d.sales / 10000)}만
                            </span>
                            <div
                              className={`w-full rounded-t-lg ${d.predicted ? "bg-purple-300 border-2 border-dashed border-purple-400" : "bg-blue-500"}`}
                              style={{ height: `${Math.max(4, (d.sales / predMax) * 100)}px` }}
                            />
                            <span className="text-slate-400 text-center" style={{ fontSize: "9px" }}>
                              {d.month.slice(2).replace("-", "/")}월
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> 실제</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-300 border border-dashed border-purple-400 inline-block" /> 예측</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {predictions.map((p, i) => (
                          <div key={i} className="rounded-xl bg-purple-50 px-3 py-2.5 text-center">
                            <p className="text-xs text-purple-400">{p.month}</p>
                            <p className="text-sm font-bold text-purple-700">{fmt(p.sales)}원</p>
                            <p className={`text-xs font-semibold ${p.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              순이익 {p.profit >= 0 ? "+" : ""}{fmt(p.profit)}원
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              </PlanGate>

              {/* 최근 시뮬레이션 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">📊 최근 시뮬레이션</h2>
                  <Link href="/profile" className="text-xs text-blue-500 font-semibold hover:text-blue-700">전체보기 →</Link>
                </div>
                {sims.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-3">시뮬레이션 기록이 없어요</p>
                    <Link href="/simulator" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">시뮬레이터 시작</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sims.map(h => (
                      <Link key={h.id} href={`/result?historyId=${h.id}`}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 hover:bg-slate-100 transition">
                        <span className="text-xl">{IND[h.form?.industry] ?? "📊"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{h.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(h.created_at).toLocaleDateString("ko-KR",{month:"short",day:"numeric"})}
                            {" · "}{IND_LABEL[h.form?.industry] ?? ""}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-slate-800">{fmt(h.result?.totalSales||0)}원</p>
                          <p className={`text-xs font-semibold ${(h.result?.netProfit||0)>=0?"text-emerald-600":"text-red-500"}`}>
                            {(h.result?.netProfit||0)>=0?"+":""}{fmt(h.result?.netProfit||0)}원
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* 오른쪽 1/3 */}
            <div className="space-y-5">

              {/* 도구 바로가기 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <h2 className="text-base font-bold text-slate-900 mb-4">🛠️ 도구 바로가기</h2>
                <div className="grid grid-cols-2 gap-2">
                  {TOOLS.map(t => (
                    <Link key={t.href} href={t.href}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 hover:bg-slate-100 transition text-xs font-medium text-slate-700">
                      <span>{t.icon}</span><span className="truncate">{t.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 원가 현황 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">🧮 메뉴 원가</h2>
                  <Link href="/tools/menu-cost" className="text-xs text-blue-500 font-semibold hover:text-blue-700">관리 →</Link>
                </div>
                {menus.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-slate-400 text-xs mb-2">등록된 메뉴가 없어요</p>
                    <Link href="/tools/menu-cost" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">등록하기</Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {menus.slice(0, 5).map(m => (
                      <div key={m.id} className="flex items-center gap-2">
                        <span className="text-sm text-slate-700 truncate flex-1 min-w-0">{m.name}</span>
                        <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                          <div className={`h-full rounded-full ${m.cogs_rate > 40 ? "bg-red-400" : m.cogs_rate > 30 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width:`${Math.min(m.cogs_rate * 2, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-9 text-right flex-shrink-0 ${m.cogs_rate > 40 ? "text-red-500" : "text-emerald-600"}`}>
                          {m.cogs_rate?.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 커뮤니티 피드 */}
              <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">👥 커뮤니티</h2>
                  <Link href="/community" className="text-xs text-blue-500 font-semibold hover:text-blue-700">더보기 →</Link>
                </div>
                {feed.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-4">공유된 수익이 없어요</p>
                ) : (
                  <div className="space-y-2">
                    {feed.map(p => (
                      <Link key={p.id} href="/community"
                        className="block rounded-xl bg-slate-50 px-3 py-2.5 hover:bg-slate-100 transition">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span>{IND[p.industry] ?? "🏪"}</span>
                          <span className="text-xs text-slate-400">{IND_LABEL[p.industry]}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.title}</p>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">{(p.total_sales/10000).toFixed(0)}만원</span>
                          <span className={`text-xs font-semibold ${p.net_profit>=0?"text-emerald-600":"text-red-500"}`}>
                            순이익 {(p.net_profit/10000).toFixed(0)}만
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 노트 */}
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">📝 노트</h2>
              <Link href="/notes" className="text-xs text-blue-500 font-semibold hover:text-blue-700">전체보기 →</Link>
            </div>
            <NotesWidget />
          </div>

        </div>
      </main>
    </div>
  );
}
