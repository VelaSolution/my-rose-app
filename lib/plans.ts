export const PLANS = [
  {
    id: "free",
    plan: "무료",
    price: "0",
    priceNum: 0,
    unit: "원/월",
    desc: "시뮬레이터를 체험하고 싶은 예비 창업자",
    features: [
      { text: "수익 시뮬레이터 (월 10회)", included: true },
      { text: "기본 도구 5개 (원가/인건비/세금/체크리스트)", included: true },
      { text: "커뮤니티 접근", included: true },
      { text: "결과 저장 1개", included: true },
      { text: "AI 브리핑 & 전략 추천", included: false },
      { text: "AI 도구 (SNS/리뷰/상권)", included: false },
      { text: "POS 분석 · PDF · 대시보드", included: false },
    ],
    landingFeatures: ["수익 시뮬레이터 (월 10회)", "기본 도구 5개", "커뮤니티 접근", "결과 저장 1개"],
    btn: "무료로 시작",
    cls: "pricing-btn-gray",
    href: "/signup",
    popular: false,
  },
  {
    id: "standard",
    plan: "프로",
    price: "29,900",
    priceNum: 29900,
    unit: "원/월",
    annualPrice: "24,900",
    annualPriceNum: 24900,
    annualUnit: "원/월 (연간 결제)",
    desc: "매출부터 전략까지, 제대로 관리하고 싶은 사장님",
    features: [
      { text: "수익 시뮬레이터 (무제한)", included: true },
      { text: "전체 도구 무제한 이용", included: true },
      { text: "AI 브리핑 & 전략 추천 (무제한)", included: true },
      { text: "AI 도구 (SNS/리뷰/상권 무제한)", included: true },
      { text: "POS 파일 분석", included: true },
      { text: "손익계산서 PDF 출력", included: true },
      { text: "대시보드 월별 매출 관리", included: true },
      { text: "CSV 내보내기 · 12개월 히스토리", included: true },
    ],
    landingFeatures: ["모든 도구 무제한", "AI 브리핑·전략 무제한", "POS·PDF·대시보드·CSV", "우선 고객 지원"],
    btn: "프로 시작",
    cls: "pricing-btn-blue",
    href: "/pricing",
    popular: true,
  },
];

// 플랜별 기능 제한 상수
export const PLAN_LIMITS = {
  free: {
    simulatorPerMonth: 10,
    historyMax: 1,
    aiEnabled: false,
    posEnabled: false,
    pdfEnabled: false,
    dashboardEnabled: false,
    csvEnabled: false,
  },
  standard: {
    simulatorPerMonth: Infinity,
    historyMax: 100,
    aiEnabled: true,
    posEnabled: true,
    pdfEnabled: true,
    dashboardEnabled: true,
    csvEnabled: true,
  },
} as const;

export type PlanId = "free" | "standard";

/** 플랜별 결제 가격 (원) — 결제 검증에 사용 */
export const PLAN_PRICES: Record<string, number> = Object.fromEntries(
  PLANS.filter((p) => p.priceNum > 0).map((p) => [p.id, p.priceNum])
);
