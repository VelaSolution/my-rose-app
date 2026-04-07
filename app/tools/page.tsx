"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSimulatorData } from "@/lib/useSimulatorData";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { fmt } from "@/lib/vela";

type Tool = { href: string; emoji: string; title: string; desc: string; color: string; bg: string; badge: string | null; paid?: boolean };
const CATEGORIES: { key: string; label: string; desc: string; tools: Tool[] }[] = [
  {
    key: "calc", label: "💰 경영 분석", desc: "매출·원가·인건비·세금 계산",
    tools: [
      { href: "/tools/menu-cost", emoji: "🧮", title: "메뉴별 원가 계산기", desc: "식재료 원가 입력 → 원가율·건당 순익 자동 계산", color: "#059669", bg: "#ECFDF5", badge: null },
      { href: "/tools/labor", emoji: "👥", title: "인건비 스케줄러", desc: "직원별 시급·근무시간 설정 → 주간·월간 인건비 예측", color: "#3182F6", bg: "#EBF3FF", badge: null },
      { href: "/tools/tax", emoji: "🧾", title: "세금 계산기", desc: "매출 기반 부가세·종합소득세 예상액 자동 산출", color: "#D97706", bg: "#FFFBEB", badge: null },
      { href: "/tools/pl-report", emoji: "📄", title: "손익계산서 PDF", desc: "시뮬레이션 데이터로 월별 P&L 리포트 PDF 출력", color: "#7C3AED", bg: "#F5F3FF", badge: null },
      { href: "/benchmark", emoji: "📊", title: "경쟁 매장 비교", desc: "내 매장 vs 업계 평균 4개 지표 비교 분석", color: "#3182F6", bg: "#EBF3FF", badge: null },
    ],
  },
  {
    key: "ai", label: "🤖 AI 도구", desc: "AI가 자동으로 생성·분석",
    tools: [
      { href: "/tools/sns-content", emoji: "📱", title: "SNS 콘텐츠 생성기", desc: "메뉴·이벤트 정보 입력 → 인스타 캡션 AI 자동 생성", color: "#DB2777", bg: "#FDF2F8", badge: "AI", paid: true },
      { href: "/tools/review-reply", emoji: "💬", title: "리뷰 답변 생성기", desc: "고객 리뷰 붙여넣기 → AI가 맞춤 답변 초안 작성", color: "#EA580C", bg: "#FFF7ED", badge: "AI", paid: true },
      { href: "/tools/area-analysis", emoji: "🗺️", title: "상권 분석 도우미", desc: "입지 조건 입력 → AI 상권 적합도 평가 리포트", color: "#65A30D", bg: "#F7FEE7", badge: "AI", paid: true },
      { href: "/tools/delivery-menu", emoji: "🛵", title: "배달앱 메뉴 최적화", desc: "배민·쿠팡이츠용 매력적인 메뉴 설명 AI 생성", color: "#0891B2", bg: "#ECFEFF", badge: "AI", paid: true },
      { href: "/tools/promo-generator", emoji: "🎉", title: "프로모션 문구 생성기", desc: "이벤트·할인 → 전단지·SNS·문자 문구 AI 생성", color: "#7C3AED", bg: "#F5F3FF", badge: "AI", paid: true },
      { href: "/tools/menu-pricing", emoji: "💰", title: "AI 메뉴 가격 추천", desc: "원가 + 경쟁 가격대 → 적정 메뉴 가격 AI 추천", color: "#6D28D9", bg: "#F5F3FF", badge: "AI", paid: true },
      { href: "/tools/review-analysis", emoji: "📊", title: "리뷰 감정 분석", desc: "고객 리뷰 붙여넣기 → 감정·키워드·개선점 AI 분석", color: "#EC4899", bg: "#FDF2F8", badge: "AI", paid: true },
      { href: "/tools/delivery-analysis", emoji: "🛵", title: "배달앱 매출 분석기", desc: "배민·쿠팡이츠 정산서 업로드 → 수수료·실매출 분석", color: "#F97316", bg: "#FFF7ED", badge: "AI", paid: true },
    ],
  },
  {
    key: "marketing", label: "📣 마케팅", desc: "매장 홍보·고객 유치 전략",
    tools: [
      { href: "/tools/naver-place", emoji: "🔍", title: "네이버 플레이스 최적화", desc: "검색 노출을 위한 15가지 체크리스트 가이드", color: "#059669", bg: "#ECFDF5", badge: null },
      { href: "/tools/marketing-calendar", emoji: "📅", title: "시즌 마케팅 캘린더", desc: "월별 이벤트·시즌 + 추천 마케팅 전략", color: "#D97706", bg: "#FFFBEB", badge: null },
    ],
  },
  {
    key: "startup", label: "🚀 창업 도우미", desc: "사업계획·자금·세무·채용 올인원",
    tools: [
      { href: "/tools/business-plan", emoji: "📝", title: "사업계획서 도우미", desc: "단계별 사업계획서 작성 + 미리보기 + 복사", color: "#4F46E5", bg: "#EEF2FF", badge: "NEW" },
      { href: "/tools/gov-support", emoji: "🏛️", title: "정부 지원사업 매칭", desc: "내 조건에 맞는 정부 지원금·대출·보증 자동 매칭", color: "#059669", bg: "#ECFDF5", badge: "NEW" },
      { href: "/tools/incorporation", emoji: "🏢", title: "법인 설립 가이드", desc: "개인 vs 법인 세금 비교 + 설립 절차 + 비용 시뮬레이터", color: "#7C3AED", bg: "#F5F3FF", badge: "NEW" },
      { href: "/tools/financial-sim", emoji: "📈", title: "재무 시뮬레이션", desc: "런웨이·BEP·현금흐름 12개월 시뮬레이션", color: "#3182F6", bg: "#EBF3FF", badge: "NEW" },
      { href: "/tools/fundraising", emoji: "💎", title: "투자 유치 도구", desc: "밸류에이션 계산 + IR 덱 가이드 + 투자자 미팅 준비", color: "#D97706", bg: "#FFFBEB", badge: "NEW" },
      { href: "/tools/tax-guide", emoji: "🧾", title: "세무·회계 가이드", desc: "세금 캘린더 + 부가세·소득세·4대보험 계산기 + 절세 전략", color: "#EA580C", bg: "#FFF7ED", badge: "NEW" },
      { href: "/tools/hiring", emoji: "👥", title: "인력 채용 도구", desc: "급여 계산기 + 근로계약서 생성 + 채용공고 템플릿", color: "#0D9488", bg: "#F0FDFA", badge: "NEW" },
    ],
  },
  {
    key: "ops", label: "🏪 매장 운영", desc: "일일 관리·식재료·창업 준비",
    tools: [
      { href: "/checklist", emoji: "📋", title: "매장 일일 체크리스트", desc: "오픈·마감 체크리스트 (날짜별 자동 저장)", color: "#6366F1", bg: "#EEF2FF", badge: null },
      { href: "/ingredient-tracker", emoji: "🥬", title: "식재료 가격 트래커", desc: "주요 식재료 가격 기록 · 변동 추이 확인", color: "#10B981", bg: "#ECFDF5", badge: null },
      { href: "/tools/startup-checklist", emoji: "✅", title: "창업 체크리스트", desc: "업종별 인허가·준비물·타임라인 단계별 가이드", color: "#0891B2", bg: "#ECFEFF", badge: null },
      { href: "/tools/daily-sales", emoji: "📝", title: "일일 매출 기록", desc: "매일 매출·고객수 입력 → 월간 자동 집계 + 요일 패턴", color: "#3B82F6", bg: "#EFF6FF", badge: null },
      { href: "/tools/labor-law", emoji: "⚖️", title: "인건비 계산기 (법정)", desc: "주휴수당·야간수당·4대보험 자동 반영 실제 인건비", color: "#14B8A6", bg: "#F0FDFA", badge: "NEW" },
      { href: "/tools/card-sales", emoji: "💳", title: "카드매출 자동 수집", desc: "사업자번호 → 여신금융협회 카드사별 매출 자동 조회", color: "#6366F1", bg: "#EEF2FF", badge: "SOON" },
      { href: "/tools/integrations", emoji: "🔗", title: "외부 서비스 연동", desc: "POS·배달앱·카드매출 연동 관리", color: "#64748B", bg: "#F8FAFC", badge: null },
      { href: "/tools/competitor-pricing", emoji: "🔍", title: "경쟁매장 가격 조사", desc: "주변 매장 메뉴 가격 기록 → 내 가격 포지셔닝", color: "#D97706", bg: "#FFFBEB", badge: "NEW" },
      { href: "/tools/handover", emoji: "🔄", title: "인수인계 체크리스트", desc: "매장 양도양수 시 필수 점검 36개 항목", color: "#0891B2", bg: "#ECFEFF", badge: "NEW" },
      { href: "/tools/tax-advisor", emoji: "🧾", title: "세무사 연결", desc: "외식업 전문 세무사 매칭 · 첫 상담 무료", color: "#059669", bg: "#ECFDF5", badge: "SOON" },
      { href: "/tools/group-buy", emoji: "🤝", title: "식자재 공동구매", desc: "같은 동네 사장님끼리 공동구매 매칭", color: "#84CC16", bg: "#F7FEE7", badge: "SOON" },
    ],
  },
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOLS = CATEGORIES.flatMap(c => c.tools) as any[];

export default function ToolsPage() {
  const simData = useSimulatorData();
  const [plan, setPlan] = useState<string>("free");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  const industryLabel: Record<string, string> = {
    cafe: "카페", restaurant: "음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
  };
  return (
    <>
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mt-6 mb-10">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              🛠️ VELA 도구 모음
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              사업에 필요한 모든 도구
            </h1>
            <p className="text-slate-500 text-sm">
              외식업 창업과 운영에 필요한 계산기·AI 도구를 모두 모았습니다.
            </p>
          </div>

          {/* 시뮬레이터 연계 배너 (로그인 시에만) */}
          {isLoggedIn && simData ? (
            <div className="rounded-2xl bg-slate-900 px-5 py-4 mb-6 flex items-center gap-4 flex-wrap">
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">
                  🔗 시뮬레이터 마지막 데이터 연결됨 · {industryLabel[simData.industry] ?? simData.industry}
                </p>
                <div className="flex gap-4 flex-wrap">
                  <span className="text-white text-sm">
                    월매출 <b className="text-blue-300">{fmt(simData.totalSales)}원</b>
                  </span>
                  <span className="text-white text-sm">
                    순이익 <b className={simData.profit >= 0 ? "text-emerald-300" : "text-red-400"}>{fmt(simData.profit)}원</b>
                  </span>
                  <span className="text-white text-sm">
                    순이익률 <b className="text-slate-300">{simData.netMargin}%</b>
                  </span>
                </div>
              </div>
              <Link href="/simulator" className="flex-shrink-0 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 transition">
                시뮬레이터 →
              </Link>
            </div>
          ) : isLoggedIn ? (
            <div className="rounded-2xl bg-slate-100 px-5 py-4 mb-6 flex items-center gap-3">
              <span className="text-slate-400 text-sm">💡 시뮬레이터를 먼저 실행하면 도구들과 데이터가 연결됩니다.</span>
              <Link href="/simulator" className="ml-auto flex-shrink-0 rounded-xl bg-slate-900 text-white text-xs font-semibold px-3 py-2">
                시뮬레이터 →
              </Link>
            </div>
          ) : null}

          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-extrabold text-slate-900">{cat.label}</h2>
                <span className="text-xs text-slate-400">{cat.desc}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.tools.map((tool) => {
                  const locked = !!(tool as { paid?: boolean }).paid && plan === "free";
                  const cardClass = `group rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5 flex gap-3 items-start transition-all duration-200 ${
                    locked ? "opacity-70 cursor-not-allowed" : "hover:shadow-md hover:-translate-y-0.5"
                  }`;
                  const inner = (
                    <>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: tool.bg }}>
                        {locked ? "🔒" : tool.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-slate-900 text-sm">{tool.title}</span>
                          {tool.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: tool.bg, color: tool.color }}>{tool.badge}</span>}
                        </div>
                        {locked ? (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">{tool.desc}</p>
                            <Link href="/pricing" className="text-[11px] font-semibold text-blue-600">업그레이드 →</Link>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 leading-relaxed">{tool.desc}</p>
                        )}
                      </div>
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

          <div className="mt-8 rounded-2xl bg-slate-900 px-6 py-5 flex items-center gap-4">
            <span className="text-3xl">🚀</span>
            <div>
              <p className="text-white font-bold text-sm">수익 시뮬레이터도 함께 사용해보세요</p>
              <p className="text-slate-400 text-xs mt-0.5">매장 전체 수익 구조를 한눈에 시뮬레이션</p>
            </div>
            <Link
              href="/simulator"
              className="ml-auto flex-shrink-0 rounded-xl bg-white text-slate-900 text-sm font-bold px-4 py-2 hover:bg-slate-100 transition"
            >
              시작 →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
