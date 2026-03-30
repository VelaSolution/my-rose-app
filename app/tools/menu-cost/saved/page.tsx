"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import ToolNav from "@/components/ToolNav";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type MenuItem = {
  id: string;
  name: string;
  category: string;
  industry: string;
  sell_price: number;
  cost: number;
  cogs_rate: number;
  margin: number;
  ingredients: { name: string; amount: string; cost: number }[];
  memo: string;
  created_at: string;
};

const fmt = (n: number) => n.toLocaleString("ko-KR");

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "음료": { bg: "bg-blue-50", text: "text-blue-600" },
  "푸드": { bg: "bg-orange-50", text: "text-orange-600" },
  "디저트": { bg: "bg-pink-50", text: "text-pink-600" },
  "주류": { bg: "bg-purple-50", text: "text-purple-600" },
  "육류": { bg: "bg-red-50", text: "text-red-600" },
  "기타": { bg: "bg-slate-50", text: "text-slate-500" },
};

export default function MenuCostSavedPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState<"cogs_rate" | "margin" | "sell_price" | "created_at">("created_at");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login?next=/tools/menu-cost/saved"); return; }

      const { data } = await supabase
        .from("menu_costs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setMenus(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function deleteMenu(id: string) {
    setDeleting(id);
    await supabase.from("menu_costs").delete().eq("id", id);
    setMenus(prev => prev.filter(m => m.id !== id));
    setDeleting(null);
  }

  const categories = ["전체", ...Array.from(new Set(menus.map(m => m.category)))];

  const filtered = menus
    .filter(m => selectedCategory === "전체" || m.category === selectedCategory)
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "cogs_rate") return a.cogs_rate - b.cogs_rate;
      if (sortBy === "margin") return b.margin - a.margin;
      if (sortBy === "sell_price") return b.sell_price - a.sell_price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // 통계
  const avgCogsRate = menus.length > 0
    ? menus.reduce((s, m) => s + m.cogs_rate, 0) / menus.length : 0;
  const bestMargin = menus.length > 0
    ? menus.reduce((best, m) => m.margin > best.margin ? m : best, menus[0]) : null;
  const worstCogsRate = menus.length > 0
    ? menus.reduce((worst, m) => m.cogs_rate > worst.cogs_rate ? m : worst, menus[0]) : null;

  if (loading) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </main>
  );

  return (
    <>
      <NavBar />
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-4xl">

          <div className="flex items-center justify-between mt-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-2">
                🧮 메뉴 원가 현황
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">저장된 메뉴 원가</h1>
              <p className="text-slate-500 text-sm mt-0.5">총 {menus.length}개 메뉴</p>
            </div>
            <Link href="/tools/menu-cost"
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 transition">
              + 메뉴 추가
            </Link>
          </div>

          {menus.length === 0 ? (
            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-16 text-center">
              <div className="text-5xl mb-4">🧮</div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">아직 저장된 메뉴가 없어요</h2>
              <p className="text-slate-500 text-sm mb-6">원가 계산기에서 메뉴를 계산하고 저장해보세요.</p>
              <Link href="/tools/menu-cost"
                className="inline-block rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white hover:bg-slate-700 transition">
                원가 계산하러 가기 →
              </Link>
            </div>
          ) : (
            <>
              {/* 요약 카드 */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">평균 원가율</p>
                  <p className={`text-2xl font-extrabold ${avgCogsRate <= 35 ? "text-emerald-600" : avgCogsRate <= 45 ? "text-amber-500" : "text-red-500"}`}>
                    {avgCogsRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">권장 35% 이하</p>
                </div>
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">최고 마진 메뉴</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{bestMargin?.name ?? "-"}</p>
                  <p className="text-xs text-emerald-600 mt-0.5 font-semibold">
                    {bestMargin ? `+${fmt(bestMargin.margin)}원` : "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
                  <p className="text-xs text-slate-400 mb-1">원가율 높은 메뉴</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{worstCogsRate?.name ?? "-"}</p>
                  <p className="text-xs text-red-500 mt-0.5 font-semibold">
                    {worstCogsRate ? `${worstCogsRate.cogs_rate.toFixed(1)}%` : "-"}
                  </p>
                </div>
              </div>

              {/* 필터 */}
              <div className="flex gap-3 mb-4 flex-wrap items-center">
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="메뉴 검색..."
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-slate-400 transition w-40"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        selectedCategory === cat ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-slate-400">정렬</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400">
                    <option value="created_at">최근 순</option>
                    <option value="cogs_rate">원가율 낮은 순</option>
                    <option value="margin">마진 높은 순</option>
                    <option value="sell_price">판매가 높은 순</option>
                  </select>
                </div>
              </div>

              {/* 메뉴 목록 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                      <th className="px-5 py-3 text-left">메뉴명</th>
                      <th className="px-4 py-3 text-right">판매가</th>
                      <th className="px-4 py-3 text-right">원가</th>
                      <th className="px-4 py-3 text-right">원가율</th>
                      <th className="px-4 py-3 text-right">건당 마진</th>
                      <th className="px-4 py-3 text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(menu => {
                      const catStyle = CATEGORY_COLORS[menu.category] ?? CATEGORY_COLORS["기타"];
                      const isGood = menu.cogs_rate <= 35;
                      const isBad = menu.cogs_rate > 50;
                      return (
                        <>
                          <tr key={menu.id}
                            className="hover:bg-slate-50 transition cursor-pointer"
                            onClick={() => setExpandedId(expandedId === menu.id ? null : menu.id)}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${catStyle.bg} ${catStyle.text}`}>
                                  {menu.category}
                                </span>
                                <span className="font-semibold text-slate-900">{menu.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right text-slate-600">{fmt(menu.sell_price)}원</td>
                            <td className="px-4 py-3.5 text-right text-slate-600">{fmt(menu.cost)}원</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className={`font-bold ${isGood ? "text-emerald-600" : isBad ? "text-red-500" : "text-amber-500"}`}>
                                {menu.cogs_rate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">
                              +{fmt(menu.margin)}원
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={e => { e.stopPropagation(); deleteMenu(menu.id); }}
                                disabled={deleting === menu.id}
                                className="text-xs text-slate-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40">
                                {deleting === menu.id ? "삭제 중..." : "삭제"}
                              </button>
                            </td>
                          </tr>

                          {/* 상세 펼치기 */}
                          {expandedId === menu.id && (
                            <tr key={`${menu.id}-detail`} className="bg-slate-50">
                              <td colSpan={6} className="px-5 py-4">
                                <div className="flex gap-6 flex-wrap">
                                  {menu.ingredients?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">재료 구성</p>
                                      <div className="flex flex-wrap gap-2">
                                        {menu.ingredients.map((ing, i) => (
                                          <span key={i} className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600">
                                            {ing.name} {ing.amount} — {fmt(ing.cost)}원
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {menu.memo && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">메모</p>
                                      <p className="text-sm text-slate-600">{menu.memo}</p>
                                    </div>
                                  )}
                                  <div className="ml-auto text-right">
                                    <p className="text-xs text-slate-400 mb-1">원가율 평가</p>
                                    <p className={`text-sm font-bold ${isGood ? "text-emerald-600" : isBad ? "text-red-500" : "text-amber-500"}`}>
                                      {isGood ? "✅ 양호" : isBad ? "❌ 개선 필요" : "⚠️ 주의"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {isGood ? "원가율이 적정 수준이에요" : isBad ? "원가율이 너무 높아요" : "원가 절감을 고려해보세요"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    검색 결과가 없어요
                  </div>
                )}
              </div>

              {/* 원가율 분포 */}
              {menus.length >= 3 && (
                <div className="mt-4 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h2 className="font-bold text-slate-900 mb-4">원가율 분포</h2>
                  <div className="space-y-2.5">
                    {filtered.map(menu => (
                      <div key={menu.id} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-28 truncate flex-shrink-0">{menu.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              menu.cogs_rate <= 35 ? "bg-emerald-400" :
                              menu.cogs_rate <= 50 ? "bg-amber-400" : "bg-red-400"
                            }`}
                            style={{ width: `${Math.min(menu.cogs_rate * 1.5, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-12 text-right flex-shrink-0 ${
                          menu.cogs_rate <= 35 ? "text-emerald-600" :
                          menu.cogs_rate <= 50 ? "text-amber-500" : "text-red-500"
                        }`}>{menu.cogs_rate.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0"/> 35% 이하 (양호)
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0"/> 35~50% (주의)
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0"/> 50% 초과 (위험)
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
