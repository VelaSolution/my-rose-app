"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { fmt } from "@/lib/vela";

/* ── Types ── */
type IndexData = { price: string; date: string } | null;
type NewsItem = { title: string; summary: string; source: string; url: string; tag?: string; insight?: string; date?: string };

/* ── Constants ── */
const NEWS_TAGS = [
  { key: "all", label: "전체" },
  { key: "외식업", label: "🍽️ 외식업" },
  { key: "경제", label: "📈 경제" },
  { key: "정책", label: "📋 정책" },
  { key: "트렌드", label: "🔥 트렌드" },
];
const TAG_COLORS: Record<string, string> = {
  "외식업": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "경제": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "정책": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "트렌드": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const QUICK_ACTIONS = [
  { icon: "🔮", label: "시뮬레이터", href: "/simulator", color: "bg-blue-600 text-white" },
  { icon: "📒", label: "가계부", href: "/tools/cashbook", color: "bg-emerald-600 text-white" },
  { icon: "📊", label: "매출 입력", href: "/sales-connect", color: "bg-white dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700" },
  { icon: "🛠️", label: "도구 모음", href: "/tools", color: "bg-white dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-700" },
];

/* ── 시즌 팁 ── */
function getSeasonTip(month: number, date: number) {
  const tips: Record<number, string[]> = {
    1: ["연초 메뉴 리뉴얼 시기입니다. 하위 20% 메뉴를 정리하세요.", "난방비가 최고인 달. 에어커튼으로 열손실 20% 줄일 수 있어요."],
    2: ["비수기에 원가율 1% 낮추면 연간 수백만원 절약.", "발렌타인데이 특별 메뉴를 2주 전부터 SNS에 노출하세요."],
    3: ["제철 식재료(냉이, 달래) 활용하면 원가를 낮출 수 있어요.", "테라스 정비하세요. 4월부터 회전율 2배."],
    4: ["4월은 외식 지출 연중 최고. 신메뉴 출시 골든타임.", "네이버 플레이스 리뷰 관리 집중. 봄 검색량 급증."],
    5: ["어버이날 코스 메뉴가 객단가 50% 올립니다.", "5월 매출이 BEP 달성 여부를 결정합니다."],
    6: ["장마 전 배달 메뉴 강화. 비 오면 배달 1.5배.", "에어컨 점검. 여름 전기료 월 50만원+ 증가 가능."],
    7: ["식자재 온도 매일 체크. 선입선출 철저히.", "파트타이머 7월 초에 확보해야 8월 안정적."],
    8: ["사장님도 3일이라도 쉬세요.", "8월 식재료 가격 연중 최고. 메뉴 가격 조정 고려."],
    9: ["추석 선물세트가 의외의 매출원.", "런치 세트 재정비. 9월부터 점심 매출 회복."],
    10: ["올해 목표 매출 달성률 체크하세요.", "식재료비 재협상 적기."],
    11: ["12월 송년회 예약 11월부터 받으세요.", "겨울 메뉴 11월 중순 출시가 이상적."],
    12: ["예약 노쇼 방지 예약금 제도 도입.", "매출 20%는 1월 비수기 대비 유보."],
  };
  const monthTips = tips[month] ?? tips[4];
  return monthTips[date % monthTips.length];
}

const DAILY_TIPS: Record<number, string> = {
  0: "일요일: 가족 단위 세트 메뉴가 객단가를 올립니다.",
  1: "월요일: 식재료 발주·재고 정리에 집중하세요.",
  2: "화요일: 신메뉴 테스트 적합일. 직원과 시식 평가해보세요.",
  3: "수요일: 주말 이벤트를 SNS에 미리 올려두세요.",
  4: "목요일: 주말 식재료 준비 시작. 금요일 발주는 늦어요.",
  5: "금요일: 예약 vs 워크인 비율 체크. 회전율이 핵심.",
  6: "토요일: 매출 최고일. 재고 수시 확인.",
};

/* ── Page ── */
export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<{ kospi: IndexData; kosdaq: IndexData; usdkrw: IndexData } | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoad, setNewsLoad] = useState(true);
  const [newsFilter, setNewsFilter] = useState("all");
  const [snap, setSnap] = useState<{ total_sales: number; net_profit: number; month: string } | null>(null);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(async ({ data }: { data: { user: User | null } }) => {
      if (!data.user) { router.replace("/login"); return; }
      setUser(data.user);
      const m = new Date().toISOString().slice(0, 7);
      const { data: s } = await sb.from("monthly_snapshots")
        .select("total_sales,net_profit,month").eq("user_id", data.user.id).eq("month", m).maybeSingle();
      if (s) setSnap(s);
      setLoading(false);
    });
  }, [router]);

  // 지수와 뉴스를 독립적으로 로드 (지수 먼저, 뉴스 나중에)
  useEffect(() => {
    // 지수: 빠르게
    fetch("/api/home?only=stocks")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (d.stocks) setStocks(d.stocks); })
      .catch((e) => console.error("API error:", e));
    // 뉴스: 느릴 수 있음
    fetch("/api/home?only=news")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (d.news) setNews(d.news); })
      .catch((e) => console.error("API error:", e))
      .finally(() => setNewsLoad(false));
  }, []);

  const name = user?.user_metadata?.nickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "사장님";
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "늦은 밤이에요" : hour < 12 ? "좋은 아침이에요" : hour < 18 ? "안녕하세요" : "오늘도 수고하셨어요";
  const now = new Date();
  const filteredNews = newsFilter === "all" ? news : news.filter(n => n.tag === newsFilter);

  const indexCards = [
    { label: "KOSPI", icon: "📈", data: stocks?.kospi },
    { label: "KOSDAQ", icon: "📊", data: stocks?.kosdaq },
    { label: "달러/원", icon: "💵", data: stocks?.usdkrw },
  ];

  if (loading) return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-5 pt-16 pb-24 md:px-8">
      <div className="mx-auto max-w-4xl space-y-4">

        {/* 인사말 */}
        <div className="pt-2">
          <p className="text-sm text-slate-400">{now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</p>
          <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-white mt-0.5 tracking-tight">{greeting}, {name}님!</h1>
        </div>

        {/* 이번 달 매출 요약 */}
        {snap && (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
            <p className="text-xs text-slate-400 mb-2">{snap.month} 매출 현황</p>
            <p className="text-2xl font-extrabold tracking-tight">{fmt(snap.total_sales)}<span className="text-sm font-bold text-slate-400 ml-0.5">원</span></p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-sm font-bold ${snap.net_profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                순이익 {snap.net_profit >= 0 ? "+" : ""}{fmt(snap.net_profit)}원
              </span>
            </div>
          </div>
        )}

        {/* 빠른 실행 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.href} href={a.href}
              className={`${a.color} rounded-2xl p-4 text-center active:scale-[0.96] transition-all duration-150`}>
              <p className="text-2xl mb-2">{a.icon}</p>
              <p className="text-[13px] font-bold">{a.label}</p>
            </Link>
          ))}
        </div>

        {/* 경제 지표 */}
        <div>
          <div className="grid grid-cols-3 gap-2.5">
            {indexCards.map(({ label, icon, data }) => (
              <div key={label} className="rounded-2xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 px-3 py-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm">{icon}</span>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                </div>
                {!stocks ? (
                  <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded w-16 animate-pulse" />
                ) : data ? (
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{data.price}</p>
                ) : (
                  <p className="text-xs text-slate-400">—</p>
                )}
              </div>
            ))}
          </div>
          {stocks && (() => {
            const d = stocks.kospi?.date || stocks.kosdaq?.date || stocks.usdkrw?.date;
            return d ? <p className="text-xs text-slate-400 mt-1.5 text-right">{d} 기준</p> : null;
          })()}
        </div>

        {/* 경영 팁 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1">💡 이번 달 팁</p>
            <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">{getSeasonTip(now.getMonth() + 1, now.getDate())}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">📋 오늘의 할 일</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{DAILY_TIPS[now.getDay()]}</p>
          </div>
        </div>

        {/* 뉴스 */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">📰 오늘의 뉴스</h2>
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-semibold">AI 요약</span>
            </div>
            <button onClick={() => { setNewsLoad(true); fetch("/api/home?only=news").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { if (d.news) setNews(d.news); }).catch(() => {}).finally(() => setNewsLoad(false)); }}
              className="text-xs text-slate-400 hover:text-[#3182F6] font-semibold transition active:scale-95">
              🔄 새로고침
            </button>
          </div>

          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
            {NEWS_TAGS.map(t => (
              <button key={t.key} onClick={() => setNewsFilter(t.key)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                  newsFilter === t.key
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {newsLoad ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredNews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">해당 카테고리 뉴스가 없어요.</p>
          ) : (
            <div className="space-y-3">
              {/* 헤드라인 (첫 번째 뉴스 크게) */}
              {filteredNews.length > 0 && (
                <a href={filteredNews[0].url || "#"} target="_blank" rel="noopener noreferrer"
                  className="block rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-600 p-5 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[4rem]" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      {filteredNews[0].tag && <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white/80">{filteredNews[0].tag}</span>}
                      <span className="text-[11px] text-white/50">{filteredNews[0].source}</span>
                      {filteredNews[0].date && <span className="text-[11px] text-white/40">{filteredNews[0].date.slice(5).replace("-", "/")}</span>}
                    </div>
                    <p className="text-base font-bold text-white leading-snug group-hover:text-blue-300 transition">{filteredNews[0].title}</p>
                    <p className="text-sm text-white/60 mt-1.5 leading-relaxed">{filteredNews[0].summary}</p>
                    {filteredNews[0].insight && (
                      <div className="mt-3 flex items-start gap-2 bg-white/10 rounded-xl px-3 py-2.5">
                        <span className="text-sm flex-shrink-0">💡</span>
                        <p className="text-xs text-white/80 font-medium">{filteredNews[0].insight}</p>
                      </div>
                    )}
                  </div>
                </a>
              )}

              {/* 나머지 뉴스 */}
              {filteredNews.slice(1, 8).map((n, i) => (
                <a key={i} href={n.url || "#"} target="_blank" rel="noopener noreferrer"
                  className="flex gap-3 rounded-xl border border-slate-100 dark:border-slate-700 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {n.tag && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[n.tag] ?? "bg-slate-100 text-slate-600"}`}>{n.tag}</span>}
                      <span className="text-[10px] text-slate-400">{n.source}</span>
                      {n.date && <span className="text-[10px] text-slate-300 dark:text-slate-500">{n.date.slice(5).replace("-", "/")}</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 transition line-clamp-2">{n.title}</p>
                    {n.insight && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 font-medium">💡 {n.insight}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center">
                    <span className="text-slate-300 group-hover:text-blue-400 transition text-xs">→</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
