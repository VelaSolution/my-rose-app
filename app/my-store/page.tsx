"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, ReferenceLine,
} from "recharts";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { fmt } from "@/lib/vela";

/* ── 타입 ─────────────────────────────────────────── */
type Snapshot = {
  id: string;
  month: string;           // "2025-03"
  monthly_sales: number;
  rent: number;
  labor_cost: number;
  food_cost: number;
  utilities: number;
  marketing: number;
  etc: number;
  profit: number | null;
  profit_margin: number | null;
};

type MenuCost = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  cost_rate: number;
  margin: number;
};

/* ── 유틸 ─────────────────────────────────────────── */
const fmtM = (n: number) => {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (Math.abs(n) >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return n.toLocaleString("ko-KR");
};
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return `${y.slice(2)}년 ${parseInt(mo)}월`;
};

/* ── 커스텀 툴팁 ──────────────────────────────────── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmt(p.value)}원
        </p>
      ))}
    </div>
  );
}

/* ── 메인 ─────────────────────────────────────────── */
export default function MyStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [menus, setMenus] = useState<MenuCost[]>([]);
  const [menuCategory, setMenuCategory] = useState("전체");
  const [activeChart, setActiveChart] = useState<"sales" | "profit" | "cost">("sales");

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login?next=/my-store"); return; }

      const [{ data: snaps }, { data: menuData }] = await Promise.all([
        supabase
          .from("monthly_snapshots")
          .select("*")
          .eq("user_id", user.id)
          .order("month", { ascending: true })
          .limit(12),
        supabase
          .from("menu_costs")
          .select("*")
          .eq("user_id", user.id)
          .order("cost_rate", { ascending: true }),
      ]);

      setSnapshots(snaps ?? []);
      setMenus(menuData ?? []);
      setLoading(false);
    }
    load();
  }, []);

  /* ── 계산 ── */
  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  const latestProfit = latest
    ? (latest.profit ?? latest.monthly_sales - latest.rent - latest.labor_cost - latest.food_cost - latest.utilities - latest.marketing - latest.etc)
    : 0;
  const momChange = latest && prev && prev.monthly_sales > 0
    ? ((latest.monthly_sales - prev.monthly_sales) / prev.monthly_sales * 100)
    : 0;

  const chartData = snapshots.map(s => {
    const totalCost = s.rent + s.labor_cost + s.food_cost + s.utilities + s.marketing + s.etc;
    const profit = s.profit ?? s.monthly_sales - totalCost;
    return {
      month: monthLabel(s.month),
      매출: s.monthly_sales,
      순이익: profit,
      인건비: s.labor_cost,
      원재료비: s.food_cost,
      임대료: s.rent,
      기타: s.utilities + s.marketing + s.etc,
    };
  });

  const avgCogsRate = menus.length > 0
    ? menus.reduce((s, m) => s + m.cost_rate, 0) / menus.length : 0;
  const categories = ["전체", ...Array.from(new Set(menus.map(m => m.category)))];
  const filteredMenus = menuCategory === "전체"
    ? menus : menus.filter(m => m.category === menuCategory);

  if (loading) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </main>
  );

  return (
    <>
      <main className="min-h-screen bg-slate-50 px-4 pt-20 pb-12 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">내 가게 현황</p>
              <h1 className="text-2xl font-extrabold text-slate-900">경영 한눈에 보기</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/monthly-input"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                📝 이번 달 입력
              </Link>
              <Link href="/tools/menu-cost"
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition">
                🧮 원가 계산
              </Link>
            </div>
          </div>

          {/* ── 요약 카드 4개 ── */}
          {latest ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "이번 달 매출",
                  value: `${fmtM(latest.monthly_sales)}원`,
                  sub: momChange !== 0 ? `전월 대비 ${momChange > 0 ? "+" : ""}${momChange.toFixed(1)}%` : "전월 데이터 없음",
                  good: momChange >= 0,
                  emoji: "📈",
                },
                {
                  label: "이번 달 순이익",
                  value: `${latestProfit >= 0 ? "+" : ""}${fmtM(latestProfit)}원`,
                  sub: `이익률 ${latest.profit_margin?.toFixed(1) ?? ((latestProfit / latest.monthly_sales) * 100).toFixed(1)}%`,
                  good: latestProfit >= 0,
                  emoji: "💰",
                },
                {
                  label: "평균 원가율",
                  value: `${avgCogsRate.toFixed(1)}%`,
                  sub: avgCogsRate <= 35 ? "양호한 수준" : avgCogsRate <= 50 ? "개선 권장" : "위험 수준",
                  good: avgCogsRate <= 35,
                  emoji: "🧮",
                },
                {
                  label: "등록된 메뉴",
                  value: `${menus.length}개`,
                  sub: menus.filter(m => m.cost_rate > 50).length > 0
                    ? `원가 위험 ${menus.filter(m => m.cost_rate > 50).length}개`
                    : "전 메뉴 양호",
                  good: menus.filter(m => m.cost_rate > 50).length === 0,
                  emoji: "📋",
                },
              ].map(card => (
                <div key={card.label} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-2">{card.emoji} {card.label}</p>
                  <p className={`text-xl font-extrabold ${card.good ? "text-slate-900" : "text-red-500"}`}>
                    {card.value}
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${card.good ? "text-emerald-500" : "text-amber-500"}`}>
                    {card.sub}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-8 text-center">
              <p className="text-3xl mb-3">📊</p>
              <p className="font-bold text-slate-900 mb-1">아직 매출 데이터가 없어요</p>
              <p className="text-sm text-slate-400 mb-4">이번 달 매출을 입력하면 여기에 분석이 표시됩니다.</p>
              <Link href="/monthly-input"
                className="inline-block rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition">
                이번 달 입력하기 →
              </Link>
            </div>
          )}

          {/* ── 매출 차트 ── */}
          {snapshots.length > 0 && (
            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-extrabold text-slate-900">월별 추이</h2>
                <div className="flex gap-1.5">
                  {(["sales", "profit", "cost"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveChart(tab)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                        activeChart === tab
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}>
                      {tab === "sales" ? "매출" : tab === "profit" ? "순이익" : "비용구조"}
                    </button>
                  ))}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                {activeChart === "sales" ? (
                  <BarChart data={chartData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9EA6B3" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 11, fill: "#9EA6B3" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="매출" fill="#191F28" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : activeChart === "profit" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9EA6B3" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 11, fill: "#9EA6B3" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={2} />
                    <Line dataKey="순이익" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: "#059669" }} />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9EA6B3" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 11, fill: "#9EA6B3" }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="인건비" fill="#334155" radius={[3, 3, 0, 0]} stackId="a" />
                    <Bar dataKey="원재료비" fill="#64748b" radius={[0, 0, 0, 0]} stackId="a" />
                    <Bar dataKey="임대료" fill="#94a3b8" radius={[0, 0, 0, 0]} stackId="a" />
                    <Bar dataKey="기타" fill="#cbd5e1" radius={[3, 3, 0, 0]} stackId="a" />
                  </BarChart>
                )}
              </ResponsiveContainer>

              {activeChart === "cost" && (
                <div className="flex gap-4 mt-3 justify-center flex-wrap">
                  {[
                    { label: "인건비", color: "#334155" },
                    { label: "원재료비", color: "#64748b" },
                    { label: "임대료", color: "#94a3b8" },
                    { label: "기타", color: "#cbd5e1" },
                  ].map(l => (
                    <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 원가 현황 ── */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-slate-900">메뉴 원가 현황</h2>
              <Link href="/tools/menu-cost/saved"
                className="text-xs text-slate-400 hover:text-slate-700 transition font-semibold">
                전체 보기 →
              </Link>
            </div>

            {menus.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-slate-400 text-sm mb-3">저장된 메뉴가 없어요</p>
                <Link href="/tools/menu-cost"
                  className="inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition">
                  원가 계산하러 가기
                </Link>
              </div>
            ) : (
              <>
                {/* 카테고리 필터 */}
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setMenuCategory(cat)}
                      className={`px-3 py-2.5 rounded-full text-xs font-semibold transition ${
                        menuCategory === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>

                {/* 원가율 바 */}
                <div className="space-y-2.5 mb-5">
                  {filteredMenus.slice(0, 8).map(menu => (
                    <div key={menu.id} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-24 truncate flex-shrink-0 font-medium">{menu.name}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            menu.cost_rate <= 35 ? "bg-emerald-400" :
                            menu.cost_rate <= 50 ? "bg-amber-400" : "bg-red-400"
                          }`}
                          style={{ width: `${Math.min(menu.cost_rate * 1.5, 100)}%` }}
                        />
                      </div>
                      <div className="text-right flex-shrink-0 w-28">
                        <span className={`text-xs font-bold ${
                          menu.cost_rate <= 35 ? "text-emerald-600" :
                          menu.cost_rate <= 50 ? "text-amber-500" : "text-red-500"
                        }`}>{menu.cost_rate.toFixed(1)}%</span>
                        <span className="text-xs text-slate-400 ml-2">+{fmt(menu.margin)}원</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 범례 */}
                <div className="flex gap-4 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> 35% 이하 양호
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> 35~50% 주의
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> 50% 초과 위험
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── 최근 월별 상세 ── */}
          {snapshots.length > 0 && (
            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-extrabold text-slate-900">월별 상세 내역</h2>
                <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-700 font-semibold transition">
                  대시보드 →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">월</th>
                      <th className="px-4 py-3 text-right">매출</th>
                      <th className="px-4 py-3 text-right">인건비</th>
                      <th className="px-4 py-3 text-right">원재료비</th>
                      <th className="px-4 py-3 text-right">임대료</th>
                      <th className="px-4 py-3 text-right">순이익</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...snapshots].reverse().slice(0, 6).map(s => {
                      const totalCost = s.rent + s.labor_cost + s.food_cost + s.utilities + s.marketing + s.etc;
                      const profit = s.profit ?? s.monthly_sales - totalCost;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-3.5 font-semibold text-slate-700">{monthLabel(s.month)}</td>
                          <td className="px-4 py-3.5 text-right text-slate-600">{fmtM(s.monthly_sales)}원</td>
                          <td className="px-4 py-3.5 text-right text-slate-500">{fmtM(s.labor_cost)}원</td>
                          <td className="px-4 py-3.5 text-right text-slate-500">{fmtM(s.food_cost)}원</td>
                          <td className="px-4 py-3.5 text-right text-slate-500">{fmtM(s.rent)}원</td>
                          <td className={`px-4 py-3.5 text-right font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {profit >= 0 ? "+" : ""}{fmtM(profit)}원
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
