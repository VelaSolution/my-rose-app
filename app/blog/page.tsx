"use client";

import { useState } from "react";
import Link from "next/link";


type Category = "전체" | "원가관리" | "마케팅" | "세무" | "인사" | "트렌드";

type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: Exclude<Category, "전체">;
  date: string;
  readTime: string;
  emoji: string;
};

const ARTICLES: Article[] = [
  {
    slug: "restaurant-cost-rate-30",
    title: "외식업 원가율 30% 맞추는 5가지 방법",
    excerpt:
      "원가율은 외식업 수익의 핵심 지표입니다. 식재료 단가 협상부터 레시피 표준화, 로스율 관리까지 — 현실적으로 원가율 30%를 달성하고 유지하는 구체적인 실행 전략을 알려드립니다. 실제 매장 사례와 함께 원가율 관리 체크리스트도 포함했습니다.",
    category: "원가관리",
    date: "2026-03-28",
    readTime: "7분",
    emoji: "💰",
  },
  {
    slug: "naver-place-seo-2026",
    title: "네이버 플레이스 상위 노출 전략 2026",
    excerpt:
      "2026년 네이버 플레이스 알고리즘이 크게 변경되었습니다. 리뷰 수보다 리뷰 품질, 사진 등록 빈도, 예약 전환율이 더 중요해졌습니다. 최신 알고리즘에 맞춘 상위 노출 전략과 매장 프로필 최적화 방법을 단계별로 정리했습니다.",
    category: "마케팅",
    date: "2026-03-22",
    readTime: "8분",
    emoji: "🔍",
  },
  {
    slug: "small-business-tax-top10",
    title: "소상공인 절세 전략 TOP 10",
    excerpt:
      "부가세, 종합소득세, 간이과세 전환 등 소상공인이 반드시 알아야 할 절세 전략 10가지를 정리했습니다. 세금 신고 시즌 전에 준비하면 수백만 원을 절약할 수 있습니다. 2026년 개정된 세법 변경사항도 반영했습니다.",
    category: "세무",
    date: "2026-03-15",
    readTime: "10분",
    emoji: "🧾",
  },
  {
    slug: "hiring-difficulty-solutions",
    title: "알바 구인난 해결하는 3가지 방법",
    excerpt:
      "외식업 인력난은 갈수록 심화되고 있습니다. 급여 인상만이 답이 아닙니다. 근무 환경 개선, 유연 근무제 도입, 그리고 채용 채널 다각화를 통해 실제로 구인난을 해결한 매장의 사례를 소개합니다.",
    category: "인사",
    date: "2026-03-10",
    readTime: "6분",
    emoji: "👥",
  },
  {
    slug: "food-industry-ai-trend-2026",
    title: "2026 외식업 트렌드: AI와 자동화",
    excerpt:
      "AI 주문 시스템, 자동 재고 관리, 로봇 서빙까지 — 2026년 외식업에서 실제로 도입되고 있는 AI/자동화 기술을 분석합니다. 소규모 매장도 활용 가능한 현실적인 AI 도구와 비용 대비 효과를 비교 분석했습니다.",
    category: "트렌드",
    date: "2026-03-05",
    readTime: "9분",
    emoji: "🤖",
  },
  {
    slug: "delivery-app-commission-tips",
    title: "배달앱 수수료 줄이는 실전 팁",
    excerpt:
      "배달의민족, 쿠팡이츠, 요기요 등 주요 배달앱 수수료 구조를 비교하고, 실질적으로 수수료를 줄이는 방법을 정리했습니다. 자체 배달 전환, 포장 할인, 배달 전용 메뉴 설계 등 매출은 유지하면서 수수료 부담을 낮추는 전략입니다.",
    category: "마케팅",
    date: "2026-02-28",
    readTime: "7분",
    emoji: "🛵",
  },
  {
    slug: "cafe-startup-cost-guide",
    title: "카페 창업 비용 현실적 가이드",
    excerpt:
      "카페 창업을 꿈꾸시나요? 인테리어, 장비, 보증금부터 운영 자금까지 — 실제 카페 창업에 필요한 총 비용을 항목별로 상세히 분석합니다. 10평, 20평, 30평 규모별 예산과 1년차 손익분기 시나리오도 포함했습니다.",
    category: "원가관리",
    date: "2026-02-20",
    readTime: "12분",
    emoji: "☕",
  },
  {
    slug: "ingredient-cost-supplier-tips",
    title: "식재료 원가 절감 공급업체 활용법",
    excerpt:
      "도매시장, 산지 직거래, 공동구매 등 다양한 식재료 공급 채널의 장단점을 비교하고, 실질적으로 원가를 절감하는 공급업체 활용 전략을 공유합니다. 계절별 식재료 가격 변동 패턴과 비축 전략도 함께 다룹니다.",
    category: "원가관리",
    date: "2026-02-12",
    readTime: "8분",
    emoji: "🥬",
  },
  {
    slug: "instagram-marketing-restaurant",
    title: "인스타그램으로 매장 홍보하는 법",
    excerpt:
      "릴스, 스토리, 피드 최적화부터 해시태그 전략까지 — 외식업 매장을 위한 인스타그램 마케팅 실전 가이드입니다. 팔로워 수보다 중요한 것은 지역 고객의 방문 전환입니다. 월 광고비 10만원으로 효과를 극대화하는 방법을 알려드립니다.",
    category: "마케팅",
    date: "2026-02-05",
    readTime: "8분",
    emoji: "📸",
  },
];

const CATEGORIES: Category[] = ["전체", "원가관리", "마케팅", "세무", "인사", "트렌드"];

const CATEGORY_COLORS: Record<Exclude<Category, "전체">, string> = {
  원가관리: "bg-emerald-50 text-emerald-600",
  마케팅: "bg-blue-50 text-blue-600",
  세무: "bg-amber-50 text-amber-600",
  인사: "bg-rose-50 text-rose-600",
  트렌드: "bg-purple-50 text-purple-600",
};

export default function BlogPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("전체");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const filtered = ARTICLES.filter((a) => {
    const matchCategory = activeCategory === "전체" || a.category === activeCategory;
    const matchSearch =
      !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <>
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-slate-700 transition"
            >
              ← 홈
            </Link>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>📚</span> VELA Blog
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              외식업 경영 인사이트
            </h1>
            <p className="text-slate-500 text-sm">
              원가관리, 마케팅, 세무, 인사, 트렌드 — 외식업 사장님을 위한 실전 지식
            </p>
          </div>

          {/* Search */}
          <div className="mb-5">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="아티클 검색..."
                className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold transition ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Articles */}
          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-slate-400 text-sm">검색 결과가 없습니다.</p>
              </div>
            )}
            {filtered.map((article) => {
              const isExpanded = expandedSlug === article.slug;
              return (
                <article
                  key={article.slug}
                  className="bg-white ring-1 ring-slate-200 rounded-3xl p-6 hover:shadow-md hover:ring-slate-300 transition-all cursor-pointer"
                  onClick={() => setExpandedSlug(isExpanded ? null : article.slug)}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl shrink-0 mt-1">{article.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            CATEGORY_COLORS[article.category]
                          }`}
                        >
                          {article.category}
                        </span>
                        <span className="text-xs text-slate-400">{article.date}</span>
                        <span className="text-xs text-slate-400">
                          · {article.readTime} 읽기
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900 mb-1 leading-snug">
                        {article.title}
                      </h2>
                      <p
                        className={`text-sm text-slate-500 leading-relaxed ${
                          isExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {article.excerpt}
                      </p>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <Link
                            href={`/blog/${article.slug}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            전체 글 읽기 →
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 mt-2">
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Footer tip */}
          <div className="mt-8 rounded-2xl bg-slate-100 px-5 py-4 text-xs text-slate-500 leading-relaxed text-center">
            더 많은 외식업 경영 인사이트를 원하시나요?{" "}
            <Link href="/tools" className="text-purple-600 underline hover:text-purple-800">
              AI 도구 모음
            </Link>
            에서 원가 계산, 매출 분석 등을 직접 활용해 보세요.
          </div>
        </div>
      </main>
    </>
  );
}
