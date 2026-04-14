"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSimulatorData } from "@/lib/useSimulatorData";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { fmt } from "@/lib/vela";
import MonthlyTipCard from "@/components/MonthlyTipCard";
import TaxReminder from "@/components/TaxReminder";
import OnboardingModal from "@/components/OnboardingModal";
import { t, getLocale } from "@/lib/i18n";
import type { SimulatorSnapshot } from "@/lib/useSimulatorData";

/* ── 데이터 소스 선택 배너 ── */
type SourceItem = { id: string; label: string; sub: string; industry: string; totalSales: number; profit: number; netMargin: number };

function DataSourceBanner({ simData, industryLabel }: { simData: SimulatorSnapshot | null; industryLabel: Record<string, string> }) {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [selected, setSelected] = useState<string>("current");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const all: SourceItem[] = [];

      // 로컬 시뮬레이터
      if (simData) {
        all.push({ id: "current", label: "현재 시뮬레이션", sub: "로컬 저장", industry: simData.industry, totalSales: simData.totalSales, profit: simData.profit, netMargin: simData.netMargin });
      }

      // Supabase 데이터
      try {
        const sb = createSupabaseBrowserClient();
        if (!sb) { setLoaded(true); setSources(all); return; }
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setLoaded(true); setSources(all); return; }

        // 시뮬레이션 기록
        const { data: simRows } = await sb.from("simulation_history").select("id, label, created_at, result, form")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
        if (simRows) {
          for (const row of simRows) {
            const r = (row.result || {}) as Record<string, number>;
            const f = (row.form || {}) as Record<string, string>;
            const ts = r.totalSales || 0;
            if (ts === 0) continue;
            const date = new Date(row.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
            all.push({ id: "sim-" + row.id, label: `☁️ ${row.label}`, sub: date, industry: String(f.industry || "restaurant"), totalSales: ts, profit: r.netProfit || r.profit || 0, netMargin: ts > 0 ? Math.round((r.netProfit || r.profit || 0) / ts * 1000) / 10 : 0 });
          }
        }

        // 월별 매출
        const { data: monthRows } = await sb.from("monthly_snapshots").select("id, month, industry, total_sales, net_profit")
          .eq("user_id", user.id).order("month", { ascending: false }).limit(6);
        if (monthRows) {
          for (const row of monthRows) {
            const ts = Number(row.total_sales || 0);
            const np = Number(row.net_profit || 0);
            if (ts === 0) continue;
            all.push({ id: "month-" + row.id, label: `📈 ${row.month}`, sub: "월별매출", industry: row.industry || "restaurant", totalSales: ts, profit: np, netMargin: ts > 0 ? Math.round(np / ts * 1000) / 10 : 0 });
          }
        }
      } catch { /* noop */ }

      setSources(all);
      if (all.length > 0) setSelected(all[0].id);
      setLoaded(true);
    })();
  }, [simData]);

  const active = sources.find(s => s.id === selected) ?? (simData ? { id: "current", label: "현재 시뮬레이션", sub: "", industry: simData.industry, totalSales: simData.totalSales, profit: simData.profit, netMargin: simData.netMargin } : null);

  if (!loaded) return null;

  if (!active && sources.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 px-6 py-5 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-lg flex-shrink-0">💡</div>
        <span className="text-slate-500 text-sm">시뮬레이터를 먼저 실행하면 도구들과 데이터가 연결됩니다.</span>
        <Link href="/simulator" className="ml-auto flex-shrink-0 rounded-xl bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 hover:bg-slate-800 transition">
          무료로 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 mb-8 shadow-xl shadow-slate-900/20 ring-1 ring-white/5">
      {/* 상단: 현재 선택된 데이터 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              데이터 연결됨
            </span>
            <span className="text-xs text-slate-500">{active ? (industryLabel[active.industry] ?? active.industry) : ""}</span>
            {sources.length > 1 && (
              <button onClick={() => setOpen(!open)} className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition ml-1">
                {open ? "▲ 닫기" : `▼ 소스 변경 (${sources.length})`}
              </button>
            )}
          </div>
          {active && (
            <div className="flex gap-6 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500 mb-0.5">월매출</span>
                <span className="text-white text-sm font-bold">{fmt(active.totalSales)}<span className="text-blue-300 text-xs ml-0.5">원</span></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500 mb-0.5">순이익</span>
                <span className={`text-sm font-bold ${active.profit >= 0 ? "text-emerald-300" : "text-red-400"}`}>{fmt(active.profit)}<span className="text-xs ml-0.5">원</span></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500 mb-0.5">순이익률</span>
                <span className="text-slate-200 text-sm font-bold">{active.netMargin}<span className="text-xs ml-0.5">%</span></span>
              </div>
            </div>
          )}
        </div>
        <Link href="/simulator" className="flex-shrink-0 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 transition ring-1 ring-white/10">
          무료로 시작하기
        </Link>
      </div>

      {/* 소스 선택 드롭다운 */}
      {open && (
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sources.map(src => (
            <button
              key={src.id}
              onClick={() => { setSelected(src.id); setOpen(false); }}
              className={`text-left px-3 py-2.5 rounded-xl text-xs transition ${
                selected === src.id
                  ? "bg-white/15 ring-1 ring-blue-400/50 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <p className="font-semibold">{src.label}</p>
              <p className="text-[10px] opacity-60 mt-0.5">{industryLabel[src.industry] ?? src.industry} · {fmt(src.totalSales)}원 · {src.sub}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Tool = { href: string; emoji: string; title: string; desc: string; color: string; bg: string; badge: string | null; paid?: boolean; i18nKey?: string };
const CATEGORIES: { key: string; label: string; desc: string; tools: Tool[] }[] = [
  {
    key: "revenue", label: "💰 수익 분석", desc: "매출·원가·인건비·세금 시뮬레이션",
    tools: [
      { href: "/tools/menu-cost", emoji: "🧮", title: "메뉴별 원가 계산기", desc: "식재료 원가 입력 → 원가율·건당 순익 자동 계산", color: "#059669", bg: "#ECFDF5", badge: null },
      { href: "/tools/labor", emoji: "👥", title: "인건비 스케줄러", desc: "직원별 시급·근무시간 설정 → 주간·월간 인건비 예측", color: "#3182F6", bg: "#EBF3FF", badge: null },
      { href: "/tools/tax", emoji: "🧾", title: "세금 계산기", desc: "매출 기반 부가세·종합소득세 예상액 자동 산출", color: "#D97706", bg: "#FFFBEB", badge: null },
      { href: "/tools/pl-report", emoji: "📄", title: "손익계산서 PDF", desc: "시뮬레이션 데이터로 월별 P&L 리포트 PDF 출력", color: "#7C3AED", bg: "#F5F3FF", badge: null },
      { href: "/tools/financial-sim", emoji: "📈", title: "재무 시뮬레이션", desc: "런웨이·BEP·현금흐름 12개월 시뮬레이션", color: "#3182F6", bg: "#EBF3FF", badge: null, i18nKey: "financialSim" },
      { href: "/tools/daily-sales", emoji: "📝", title: "일일 매출 기록", desc: "매일 매출·고객수 입력 → 월간 자동 집계 + 요일 패턴", color: "#3182F6", bg: "#EFF6FF", badge: null },
      { href: "/tools/labor-law", emoji: "⚖️", title: "인건비 계산기 (법정)", desc: "주휴수당·야간수당·4대보험 자동 반영 실제 인건비", color: "#14B8A6", bg: "#F0FDFA", badge: null },
      { href: "/tools/competitor-pricing", emoji: "🔍", title: "경쟁매장 가격 조사", desc: "주변 매장 메뉴 가격 기록 → 내 가격 포지셔닝", color: "#D97706", bg: "#FFFBEB", badge: null },
      { href: "/benchmark", emoji: "📊", title: "경쟁 매장 비교", desc: "내 매장 vs 업계 평균 4개 지표 비교 분석", color: "#3182F6", bg: "#EBF3FF", badge: null },
    ],
  },
  {
    key: "startup", label: "🚀 창업 준비", desc: "사업계획·자금·법인·인수인계",
    tools: [
      { href: "/tools/startup-checklist", emoji: "✅", title: "창업 체크리스트", desc: "업종별 인허가·준비물·타임라인 단계별 가이드", color: "#0891B2", bg: "#ECFEFF", badge: null },
      { href: "/tools/business-plan", emoji: "📝", title: "사업계획서 도우미", desc: "단계별 사업계획서 작성 + 미리보기 + 복사", color: "#4F46E5", bg: "#EEF2FF", badge: null, i18nKey: "businessPlan" },
      { href: "/tools/gov-support", emoji: "🏛️", title: "정부 지원사업 매칭", desc: "내 조건에 맞는 정부 지원금·대출·보증 자동 매칭", color: "#059669", bg: "#ECFDF5", badge: null, i18nKey: "govSupport" },
      { href: "/tools/incorporation", emoji: "🏢", title: "법인 설립 가이드", desc: "개인 vs 법인 세금 비교 + 설립 절차 + 비용 시뮬레이터", color: "#7C3AED", bg: "#F5F3FF", badge: null, i18nKey: "incorporation" },
      { href: "/tools/fundraising", emoji: "💎", title: "투자 유치 도구", desc: "밸류에이션 계산 + IR 덱 가이드 + 투자자 미팅 준비", color: "#D97706", bg: "#FFFBEB", badge: null, i18nKey: "fundraising" },
      { href: "/tools/area-analysis", emoji: "🗺️", title: "상권 분석 도우미", desc: "입지 조건 입력 → AI 상권 적합도 평가 리포트", color: "#65A30D", bg: "#F7FEE7", badge: "AI", paid: true },
      { href: "/tools/handover", emoji: "🔄", title: "인수인계 체크리스트", desc: "매장 양도양수 시 필수 점검 36개 항목", color: "#0891B2", bg: "#ECFEFF", badge: null },
    ],
  },
  {
    key: "ai", label: "🤖 AI 도구", desc: "AI가 자동으로 생성·분석",
    tools: [
      { href: "/tools/sns-content", emoji: "📱", title: "SNS 콘텐츠 생성기", desc: "메뉴·이벤트 정보 입력 → 인스타 캡션 AI 자동 생성", color: "#DB2777", bg: "#FDF2F8", badge: "AI", paid: true },
      { href: "/tools/review-reply", emoji: "💬", title: "리뷰 답변 생성기", desc: "고객 리뷰 붙여넣기 → AI가 맞춤 답변 초안 작성", color: "#EA580C", bg: "#FFF7ED", badge: "AI", paid: true },
      { href: "/tools/delivery-menu", emoji: "🛵", title: "배달앱 메뉴 최적화", desc: "배민·쿠팡이츠용 매력적인 메뉴 설명 AI 생성", color: "#0891B2", bg: "#ECFEFF", badge: "AI", paid: true },
      { href: "/tools/promo-generator", emoji: "🎉", title: "프로모션 문구 생성기", desc: "이벤트·할인 → 전단지·SNS·문자 문구 AI 생성", color: "#7C3AED", bg: "#F5F3FF", badge: "AI", paid: true },
      { href: "/tools/menu-pricing", emoji: "💰", title: "AI 메뉴 가격 추천", desc: "원가 + 경쟁 가격대 → 적정 메뉴 가격 AI 추천", color: "#6D28D9", bg: "#F5F3FF", badge: "AI", paid: true },
      { href: "/tools/review-analysis", emoji: "📊", title: "리뷰 감정 분석", desc: "고객 리뷰 붙여넣기 → 감정·키워드·개선점 AI 분석", color: "#EC4899", bg: "#FDF2F8", badge: "AI", paid: true },
      { href: "/tools/delivery-analysis", emoji: "🛵", title: "배달앱 매출 분석기", desc: "배민·쿠팡이츠 정산서 업로드 → 수수료·실매출 분석", color: "#F97316", bg: "#FFF7ED", badge: "AI", paid: true },
      { href: "/tools/tax-guide", emoji: "🧾", title: "세무·회계 가이드", desc: "세금 캘린더 + 부가세·소득세·4대보험 계산기 + 절세 전략", color: "#EA580C", bg: "#FFF7ED", badge: "AI", i18nKey: "taxGuide" },
      { href: "/tools/hiring", emoji: "👥", title: "인력 채용 도구", desc: "급여 계산기 + 근로계약서 생성 + 채용공고 템플릿", color: "#0D9488", bg: "#F0FDFA", badge: "AI", i18nKey: "hiring" },
    ],
  },
  {
    key: "marketing", label: "📣 마케팅·운영", desc: "매장 홍보·고객 유치·일일 관리",
    tools: [
      { href: "/tools/naver-place", emoji: "🔍", title: "네이버 플레이스 최적화", desc: "검색 노출을 위한 15가지 체크리스트 가이드", color: "#059669", bg: "#ECFDF5", badge: null },
      { href: "/tools/marketing-calendar", emoji: "📅", title: "시즌 마케팅 캘린더", desc: "월별 이벤트·시즌 + 추천 마케팅 전략", color: "#D97706", bg: "#FFFBEB", badge: null },
      { href: "/checklist", emoji: "📋", title: "매장 일일 체크리스트", desc: "오픈·마감 체크리스트 (날짜별 자동 저장)", color: "#6366F1", bg: "#EEF2FF", badge: null },
      { href: "/ingredient-tracker", emoji: "🥬", title: "식재료 가격 트래커", desc: "주요 식재료 가격 기록 · 변동 추이 확인", color: "#10B981", bg: "#ECFDF5", badge: null },
      { href: "/tools/integrations", emoji: "🔗", title: "외부 서비스 연동", desc: "POS·배달앱·카드매출 연동 관리", color: "#64748B", bg: "#F8FAFC", badge: null },
    ],
  },
  {
    key: "soon", label: "🕐 준비 중", desc: "곧 출시 예정",
    tools: [
      { href: "/tools/card-sales", emoji: "💳", title: "카드매출 자동 수집", desc: "사업자번호 → 여신금융협회 카드사별 매출 자동 조회", color: "#6366F1", bg: "#EEF2FF", badge: "SOON" },
      { href: "/tools/tax-advisor", emoji: "🧾", title: "세무사 연결", desc: "외식업 전문 세무사 매칭 · 첫 상담 무료", color: "#059669", bg: "#ECFDF5", badge: "SOON" },
      { href: "/tools/group-buy", emoji: "🤝", title: "식자재 공동구매", desc: "같은 동네 사장님끼리 공동구매 매칭", color: "#84CC16", bg: "#F7FEE7", badge: "SOON" },
    ],
  },
];
const CATEGORY_ICONS: Record<string, string> = {
  revenue: "💰",
  startup: "🚀",
  ai: "🤖",
  marketing: "📣",
  soon: "🕐",
};

const BADGE_STYLES: Record<string, string> = {
  NEW: "bg-gradient-to-r from-violet-500 to-indigo-500 text-white",
  AI: "bg-gradient-to-r from-pink-500 to-rose-500 text-white",
  SOON: "bg-slate-200 text-slate-500",
};

const resolveTitle = (tool: Tool, locale?: Parameters<typeof t>[1]) =>
  tool.i18nKey ? t(`tool.${tool.i18nKey}.title`, locale) : tool.title;
const resolveDesc = (tool: Tool, locale?: Parameters<typeof t>[1]) =>
  tool.i18nKey ? t(`tool.${tool.i18nKey}.descLong`, locale) : tool.desc;

export default function ToolsPage() {
  const simData = useSimulatorData();
  const [plan, setPlan] = useState<string>("free");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [search, setSearch] = useState("");
  const locale = typeof window !== "undefined" ? getLocale() : "ko";

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) return;
      setIsLoggedIn(true);
      sb.from("payments").select("plan").eq("user_id", user.id).eq("status", "done")
        .order("created_at", { ascending: false }).limit(1)
        .then(({ data }: { data: { plan: string }[] | null }) => {
          if (data && data.length > 0) setPlan(data[0].plan);
        });
    });
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.trim().toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      tools: cat.tools.filter(
        (tool) => resolveTitle(tool, locale).toLowerCase().includes(q) || resolveDesc(tool, locale).toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.tools.length > 0);
  }, [search, locale]);

  const totalTools = CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0);

  const industryLabel: Record<string, string> = {
    cafe: "카페", restaurant: "음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
  };

  return (
    <>
      <OnboardingModal />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-5xl">
          {/* Hero header */}
          <div className="mt-6 mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-4 shadow-lg shadow-slate-900/10">
              🛠️ VELA 도구 모음
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              사업에 필요한 모든 도구
            </h1>
            <p className="text-slate-500 text-base">
              외식업 창업과 운영에 필요한 계산기·AI 도구를 모두 모았습니다.
              <span className="ml-2 text-slate-400 font-medium">총 {totalTools}개</span>
            </p>
          </div>

          {/* Search bar */}
          <div role="search" className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="도구 검색"
              placeholder="도구 이름이나 키워드로 검색..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 데이터 소스 선택 배너 */}
          {isLoggedIn && <DataSourceBanner simData={simData} industryLabel={industryLabel} />}

          {/* No results */}
          {search.trim() && filteredCategories.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-500 text-sm">검색 결과가 없습니다.</p>
              <button onClick={() => setSearch("")} className="mt-2 text-sm text-slate-900 font-semibold hover:underline">
                전체 보기
              </button>
            </div>
          )}

          {/* 월간 AI 시즌 팁 */}
          {isLoggedIn && !search.trim() && <div className="mb-8"><MonthlyTipCard /></div>}

          {/* 세금 신고 마감 리마인더 */}
          {!search.trim() && <div className="mb-8"><TaxReminder /></div>}

          {/* Categories */}
          {filteredCategories.map((cat) => (
            <div key={cat.key} className="mb-10">
              {/* Category header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                  {CATEGORY_ICONS[cat.key] ?? "📦"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-extrabold text-slate-900">{cat.label}</h2>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{cat.tools.length}개</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-slate-200 via-slate-200 to-transparent mb-5" />

              {/* Tool cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.tools.map((tool) => {
                  const locked = !!(tool as { paid?: boolean }).paid && plan === "free";
                  const cardClass = [
                    "group relative rounded-2xl bg-white ring-1 ring-slate-200/80 p-5 flex gap-4 items-start transition-all duration-200",
                    locked
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 hover:ring-slate-300",
                  ].join(" ");

                  const inner = (
                    <>
                      {/* Icon circle */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-110"
                        style={{ background: tool.bg }}
                      >
                        {locked ? "🔒" : tool.emoji}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-slate-900 text-sm leading-tight">{resolveTitle(tool, locale)}</span>
                          {tool.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${BADGE_STYLES[tool.badge] ?? "bg-slate-100 text-slate-500"}`}>
                              {tool.badge}
                            </span>
                          )}
                        </div>
                        {locked ? (
                          <div>
                            <p className="text-xs text-slate-400 leading-relaxed mb-1.5">{resolveDesc(tool, locale)}</p>
                            <Link href="/pricing" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition">업그레이드 →</Link>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 leading-relaxed">{resolveDesc(tool, locale)}</p>
                        )}
                      </div>
                      {/* Arrow indicator on hover */}
                      {!locked && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-sm font-medium">
                          →
                        </span>
                      )}
                    </>
                  );

                  return locked ? (
                    <div key={tool.href} className={cardClass}>{inner}</div>
                  ) : (
                    <Link key={tool.href} href={tool.href} className={cardClass}>{inner}</Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Bottom CTA */}
          <div className="mt-10 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-6 py-7 shadow-xl shadow-slate-900/20 ring-1 ring-white/5 relative overflow-hidden">
            {/* Decorative blurred circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-5 flex-wrap">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl flex-shrink-0 ring-1 ring-white/10">
                🚀
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-base mb-1">수익 시뮬레이터도 함께 사용해보세요</p>
                <p className="text-slate-400 text-sm">매장 전체 수익 구조를 한눈에 시뮬레이션</p>
              </div>
              <Link
                href="/simulator"
                className="flex-shrink-0 rounded-xl bg-white text-slate-900 text-sm font-bold px-5 py-3 hover:bg-slate-100 transition shadow-lg shadow-white/10"
              >
                무료로 시작하기
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
