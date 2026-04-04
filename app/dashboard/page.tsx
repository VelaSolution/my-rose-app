"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { NotesWidget } from "@/app/notes/page";

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
type MenuCost   = { id:string; name:string; cost_rate:number; margin:number; price:number; };
type FeedPost   = { id:string; nickname:string; industry:string; title:string; net_profit:number; total_sales:number; };

export default function DashboardHome() {
  const [user, setUser]           = useState<User|null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [sims, setSims]           = useState<SimHistory[]>([]);
  const [menus, setMenus]         = useState<MenuCost[]>([]);
  const [feed, setFeed]           = useState<FeedPost[]>([]);
  const [loading, setLoading]     = useState(true);
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
        sb.from("menu_costs").select("id,name,cost_rate,margin,price").eq("user_id", user.id).order("cost_rate", { ascending: false }).limit(5),
        sb.from("simulation_shares").select("id,nickname,industry,title,net_profit,total_sales").order("created_at", { ascending: false }).limit(4),
      ]);
      setSnapshots((snaps ?? []) as Snapshot[]);
      setSims((simData ?? []) as SimHistory[]);
      setMenus((menuData ?? []) as MenuCost[]);
      setFeed((posts ?? []) as FeedPost[]);
      setLoading(false);
    });
  }, [sb]);

  const name = user?.user_metadata?.nickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "사장님";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "안녕하세요" : "오늘도 수고하셨어요";
  const latestSnap = snapshots[0];
  const avgCostRate = menus.length > 0 ? menus.reduce((a, m) => a + (m.cost_rate || 0), 0) / menus.length : 0;
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
            <Link href="/simulator" className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
              시뮬레이터 시작 →
            </Link>
          </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* 왼쪽 2/3 */}
            <div className="lg:col-span-2 space-y-5">

              {/* 월별 매출 차트 */}
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
                    <p className="text-slate-400 text-sm mb-3">아직 등록된 매출이 없어요</p>
                    <Link href="/dashboard" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">+ 매출 등록하기</Link>
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
                          <div className={`h-full rounded-full ${m.cost_rate > 40 ? "bg-red-400" : m.cost_rate > 30 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width:`${Math.min(m.cost_rate * 2, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-9 text-right flex-shrink-0 ${m.cost_rate > 40 ? "text-red-500" : "text-emerald-600"}`}>
                          {m.cost_rate?.toFixed(0)}%
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
