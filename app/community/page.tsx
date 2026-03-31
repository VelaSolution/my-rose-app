"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type SharedSim = {
  id: string;
  title: string;
  description: string;
  industry: string;
  author_name: string;
  result: {
    totalSales: number;
    profit: number;
    netMargin: number;
    bep: number;
  };
  view_count: number;
  like_count: number;
  created_at: string;
  is_liked?: boolean;
};

const INDUSTRY_LABEL: Record<string, string> = {
  cafe: "☕ 카페",
  restaurant: "🍽️ 음식점",
  bar: "🍺 술집/바",
  finedining: "✨ 파인다이닝",
  gogi: "🥩 고깃집",
};

const fmt = (n: number) => {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 10_000)}만`;
  return n.toLocaleString("ko-KR");
};

export default function CommunityPage() {
  const supabase = createSupabaseBrowserClient();
  const [sims, setSims] = useState<SharedSim[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState("전체");
  const [sort, setSort] = useState<"latest" | "popular" | "profit">("latest");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("shared_simulations")
        .select("*")
        .eq("is_public", true);

      if (filter !== "전체") {
        const key = Object.entries(INDUSTRY_LABEL).find(([, v]) => v === filter)?.[0];
        if (key) query = query.eq("industry", key);
      }

      if (sort === "latest") query = query.order("created_at", { ascending: false });
      else if (sort === "popular") query = query.order("view_count", { ascending: false });
      else if (sort === "profit") query = query.order("like_count", { ascending: false });

      const { data } = await query.limit(20);

      if (data && userId) {
        const { data: likes } = await supabase
          .from("simulation_likes")
          .select("simulation_id")
          .eq("user_id", userId);
        const likedIds = new Set(likes?.map(l => l.simulation_id) ?? []);
        setSims(data.map(s => ({ ...s, is_liked: likedIds.has(s.id) })));
      } else {
        setSims(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [filter, sort, userId]);

  async function toggleLike(sim: SharedSim) {
    if (!userId) { window.location.href = "/login?next=/community"; return; }

    if (sim.is_liked) {
      await supabase.from("simulation_likes").delete()
        .eq("simulation_id", sim.id).eq("user_id", userId);
      await supabase.from("shared_simulations")
        .update({ like_count: sim.like_count - 1 }).eq("id", sim.id);
      setSims(prev => prev.map(s => s.id === sim.id
        ? { ...s, is_liked: false, like_count: s.like_count - 1 } : s));
    } else {
      await supabase.from("simulation_likes").insert({ simulation_id: sim.id, user_id: userId });
      await supabase.from("shared_simulations")
        .update({ like_count: sim.like_count + 1 }).eq("id", sim.id);
      setSims(prev => prev.map(s => s.id === sim.id
        ? { ...s, is_liked: true, like_count: s.like_count + 1 } : s));
    }
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:px-8">
        <div className="mx-auto max-w-4xl">

          {/* 헤더 */}
          <div className="flex items-end justify-between pt-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-2">
                👥 커뮤니티
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">사장님들의 수익 분석</h1>
              <p className="text-sm text-slate-400 mt-1">다른 사장님들의 시뮬레이션을 참고해보세요</p>
            </div>
            {userId && (
              <Link href="/simulator"
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition">
                내 분석 공유하기 →
              </Link>
            )}
          </div>

          {/* 필터 & 정렬 */}
          <div className="flex gap-3 mb-6 flex-wrap items-center">
            <div className="flex gap-1.5 flex-wrap">
              {["전체", ...Object.values(INDUSTRY_LABEL)].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
              className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400">
              <option value="latest">최신순</option>
              <option value="popular">조회순</option>
              <option value="profit">좋아요순</option>
            </select>
          </div>

          {/* 카드 목록 */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
          ) : sims.length === 0 ? (
            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-16 text-center">
              <p className="text-4xl mb-4">📊</p>
              <p className="font-bold text-slate-900 mb-2">아직 공유된 분석이 없어요</p>
              <p className="text-sm text-slate-400 mb-6">첫 번째로 시뮬레이션을 공유해보세요!</p>
              <Link href="/simulator"
                className="inline-block rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white hover:bg-slate-700 transition">
                시뮬레이터 시작하기 →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {sims.map(sim => {
                const isProfit = sim.result.profit >= 0;
                return (
                  <div key={sim.id}
                    className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                            {INDUSTRY_LABEL[sim.industry] ?? sim.industry}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isProfit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                          }`}>
                            {isProfit ? "✅ 흑자" : "❌ 적자"}
                          </span>
                        </div>
                        <h2 className="font-extrabold text-slate-900 text-lg leading-tight truncate">
                          {sim.title}
                        </h2>
                        {sim.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{sim.description}</p>
                        )}
                      </div>

                      <button onClick={() => toggleLike(sim)}
                        className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition ${
                          sim.is_liked ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        }`}>
                        <span className="text-lg">{sim.is_liked ? "❤️" : "🤍"}</span>
                        <span className="text-xs font-bold">{sim.like_count}</span>
                      </button>
                    </div>

                    {/* 수치 */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400 mb-1">월 총 매출</p>
                        <p className="font-extrabold text-slate-900 text-base">{fmt(sim.result.totalSales)}원</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400 mb-1">순이익</p>
                        <p className={`font-extrabold text-base ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                          {isProfit ? "+" : ""}{fmt(sim.result.profit)}원
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400 mb-1">순이익률</p>
                        <p className={`font-extrabold text-base ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                          {sim.result.netMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* 하단 */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {sim.author_name[0]}
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{sim.author_name}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(sim.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">👁 {sim.view_count}</span>
                        <Link
                          href={`/simulator?${Object.entries(sim.form as Record<string,string>).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join("&")}`}
                          className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition">
                          이 값으로 시뮬레이션 →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 비로그인 안내 */}
          {!userId && (
            <div className="mt-8 rounded-3xl bg-slate-900 p-6 text-center">
              <p className="text-white font-bold mb-2">내 분석을 공유하고 싶으신가요?</p>
              <p className="text-slate-400 text-sm mb-4">로그인하면 시뮬레이션 결과를 공유하고 다른 사장님들의 분석에 좋아요를 누를 수 있어요.</p>
              <Link href="/login?next=/community"
                className="inline-block rounded-2xl bg-white text-slate-900 px-8 py-3 text-sm font-bold hover:bg-slate-100 transition">
                로그인하기
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
