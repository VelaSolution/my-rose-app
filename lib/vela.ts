export type IndustryKey = "cafe" | "restaurant" | "bar" | "finedining" | "gogi";

// ─── 폼 상태 (4단계 분리) ──────────────────────────────────────

// 1단계: 매출 정보
export type Step1Form = {
  industry: IndustryKey;
  seats: number;
  avgSpend: number;
  turnover: number;
  weekdayDays: number;
  weekendDays: number;
  weekendMultiplier: number;
  // 배달 매출
  deliveryEnabled: boolean;
  deliverySales: number;
  deliveryAppRate: number;
  deliveryDirectRate: number;
  // 배달 운영 의향 (AI 전략 제안에 반영)
  deliveryPreference: "possible" | "impossible"; // possible=배달 추천 허용, impossible=배달 추천 금지
  // 시간대별 매출 비중
  lunchRatio: number;
  dinnerRatio: number;
  nightRatio: number;
};

// 2단계: 고정비 & 운영비
export type Step2Form = {
  // 인건비
  laborType: "direct" | "calculate"; // 직접입력 or 인원×시급 계산
  labor: number;                  // 직접 입력 시
  staffCount: number;             // 직원 수
  hourlyWage: number;             // 시간당 임금
  workHoursPerDay: number;        // 1인 하루 근무시간
  workDaysPerMonth: number;       // 월 근무일
  // 임대 & 시설
  rent: number;                   // 월 임대료
  utilities: number;              // 공과금
  telecom: number;                // 통신비 (인터넷/전화)
  // 원가 (카페: 식자재만 / 나머지: 식자재 + 주류 분리)
  cogsRate: number;               // 식자재 원가율 (%)
  alcoholCogsRate: number;        // 주류 원가율 (%) — 카페는 0 고정
  alcoholSalesRatio: number;      // 매출 중 주류 매출 비중 (%) — 카페는 0 고정
  // 수수료
  deliveryFeeRate: number;        // 배달앱 평균 수수료율 (%)
  cardFeeRate: number;            // 카드 수수료율 (%)
  // 마케팅 & 기타
  marketing: number;              // 광고/마케팅비
  supplies: number;               // 소모품비
  maintenance: number;            // 시설 유지보수비
  etc: number;                    // 기타 운영비
  // 세금
  incomeTaxRate: number;
  vatEnabled: boolean;
  insuranceRate: number;
};

// 3단계: 초기비용 & 부채
export type Step3Form = {
  businessType: "new" | "existing"; // 창업 예정 or 이미 운영 중
  // 초기 투자비용
  deposit: number;                // 보증금
  premiumKey: number;             // 권리금
  interior: number;               // 인테리어 비용
  equipment: number;              // 주방기기/집기
  signage: number;                // 간판/홍보물
  otherSetup: number;             // 기타 초기비용
  // 부채
  loanEnabled: boolean;
  loanAmount: number;             // 대출금
  loanInterestRate: number;       // 연 이자율 (%)
  loanTermMonths: number;         // 상환 기간 (개월)
  // 목표
  recoveryMonths: number;         // 투자금 회수 목표 (개월)
  targetMonthlyProfit: number;    // 목표 월 순이익
};

// 전체 폼
export type FullForm = Step1Form & Step2Form & Step3Form;

// ─── 히스토리 타입 ─────────────────────────────────────────────
export type HistoryRecord = {
  id: string;
  label: string;
  form: FullForm;
  result: {
    totalSales: number;
    profit: number;
    netProfit: number;
    netMargin: number;
    bep: number;
    recoveryMonthsActual: number;
  };
  savedAt: string;
};

// ─── 업종별 설정 ───────────────────────────────────────────────
export const INDUSTRY_CONFIG: Record<
  IndustryKey,
  {
    label: string;
    icon: string;
    maxTurnover: number;
    cogsWarnRate: number;
    laborWarnRate: number;
    netMarginWarn: number;
    simPctMin: number;
    simPctMax: number;
    simSteps: number;
    defaultStep1: Omit<Step1Form, "industry">;
    defaultStep2: Step2Form;
    defaultStep3: Step3Form;
  }
> = {
  cafe: {
    label: "카페", icon: "☕",
    maxTurnover: 8, cogsWarnRate: 30, laborWarnRate: 30, netMarginWarn: 10,
    simPctMin: 0.05, simPctMax: 0.20, simSteps: 4,
    defaultStep1: {
      seats: 20, avgSpend: 6000, turnover: 4,
      weekdayDays: 20, weekendDays: 8, weekendMultiplier: 1.5,
      deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 15, deliveryDirectRate: 30,
      deliveryPreference: "possible",
      lunchRatio: 40, dinnerRatio: 40, nightRatio: 20,
    },
    defaultStep2: {
      laborType: "direct", labor: 3500000, staffCount: 2, hourlyWage: 10000, workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 1500000, utilities: 400000, telecom: 100000,
      cogsRate: 28, alcoholCogsRate: 0, alcoholSalesRatio: 0,
      deliveryFeeRate: 15, cardFeeRate: 1.5,
      marketing: 200000, supplies: 150000, maintenance: 100000, etc: 100000,
      incomeTaxRate: 15, vatEnabled: false, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 30000000, premiumKey: 10000000, interior: 20000000, equipment: 10000000, signage: 2000000, otherSetup: 3000000,
      loanEnabled: false, loanAmount: 0, loanInterestRate: 5, loanTermMonths: 36,
      recoveryMonths: 24, targetMonthlyProfit: 3000000,
    },
  },
  restaurant: {
    label: "일반 음식점", icon: "🍽️",
    maxTurnover: 3, cogsWarnRate: 35, laborWarnRate: 25, netMarginWarn: 8,
    simPctMin: 0.05, simPctMax: 0.25, simSteps: 5,
    defaultStep1: {
      seats: 36, avgSpend: 25000, turnover: 1.6,
      weekdayDays: 20, weekendDays: 6, weekendMultiplier: 1.4,
      deliveryEnabled: true, deliverySales: 3000000, deliveryAppRate: 15, deliveryDirectRate: 20,
      deliveryPreference: "possible",
      lunchRatio: 40, dinnerRatio: 50, nightRatio: 10,
    },
    defaultStep2: {
      laborType: "direct", labor: 6500000, staffCount: 3, hourlyWage: 10000, workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 3500000, utilities: 900000, telecom: 150000,
      cogsRate: 32, alcoholCogsRate: 28, alcoholSalesRatio: 20,
      deliveryFeeRate: 15, cardFeeRate: 1.5,
      marketing: 300000, supplies: 300000, maintenance: 200000, etc: 300000,
      incomeTaxRate: 24, vatEnabled: true, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 50000000, premiumKey: 30000000, interior: 40000000, equipment: 20000000, signage: 3000000, otherSetup: 5000000,
      loanEnabled: true, loanAmount: 50000000, loanInterestRate: 5, loanTermMonths: 48,
      recoveryMonths: 36, targetMonthlyProfit: 5000000,
    },
  },
  bar: {
    label: "술집 / 바", icon: "🍺",
    maxTurnover: 2, cogsWarnRate: 25, laborWarnRate: 20, netMarginWarn: 15,
    simPctMin: 0.05, simPctMax: 0.20, simSteps: 4,
    defaultStep1: {
      seats: 24, avgSpend: 35000, turnover: 1.2,
      weekdayDays: 16, weekendDays: 8, weekendMultiplier: 2.0,
      deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 15, deliveryDirectRate: 0,
      deliveryPreference: "impossible",
      lunchRatio: 0, dinnerRatio: 40, nightRatio: 60,
    },
    defaultStep2: {
      laborType: "direct", labor: 4000000, staffCount: 2, hourlyWage: 10000, workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 2500000, utilities: 600000, telecom: 100000,
      cogsRate: 22, alcoholCogsRate: 18, alcoholSalesRatio: 70,
      deliveryFeeRate: 0, cardFeeRate: 1.5,
      marketing: 300000, supplies: 200000, maintenance: 150000, etc: 200000,
      incomeTaxRate: 24, vatEnabled: true, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 30000000, premiumKey: 20000000, interior: 30000000, equipment: 10000000, signage: 2000000, otherSetup: 3000000,
      loanEnabled: true, loanAmount: 30000000, loanInterestRate: 5, loanTermMonths: 36,
      recoveryMonths: 30, targetMonthlyProfit: 4000000,
    },
  },
  gogi: {
    label: "🥩 고깃집",
    defaultStep1: {
      seats: 30, avgSpend: 35000, turnover: 2.0,
      weekdayDays: 22, weekendDays: 8, weekendMultiplier: 1.5,
      deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 70, deliveryDirectRate: 30,
      deliveryPreference: "possible",
      lunchRatio: 20, dinnerRatio: 60, nightRatio: 20,
    },
    defaultStep2: {
      laborType: "direct", labor: 5000000, staffCount: 4, hourlyWage: 12000,
      workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 2500000, utilities: 500000, telecom: 100000,
      cogsRate: 45, alcoholCogsRate: 30, alcoholSalesRatio: 20,
      deliveryFeeRate: 15, cardFeeRate: 1.5,
      marketing: 300000, supplies: 200000, maintenance: 150000,
      etc: 200000,
      incomeTaxRate: 24, vatEnabled: true, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "operating",
      deposit: 50000000, premium: 30000000, interior: 40000000, equipment: 20000000,
      loanAmount: 50000000, loanRate: 5.5, loanTerm: 60,
      recoveryMonths: 24,
      incomeTaxRate: 15,
      isDualBiz: true, meatCostRatio: 40, biz2Name: "정육점",
    },
  },
  finedining: {
    label: "파인다이닝", icon: "✨",
    maxTurnover: 1.5, cogsWarnRate: 35, laborWarnRate: 30, netMarginWarn: 12,
    simPctMin: 0.10, simPctMax: 0.30, simSteps: 4,
    defaultStep1: {
      seats: 16, avgSpend: 80000, turnover: 0.9,
      weekdayDays: 18, weekendDays: 6, weekendMultiplier: 1.3,
      deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 0, deliveryDirectRate: 0,
      deliveryPreference: "impossible",
      lunchRatio: 30, dinnerRatio: 65, nightRatio: 5,
    },
    defaultStep2: {
      laborType: "direct", labor: 8000000, staffCount: 5, hourlyWage: 12000, workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 5000000, utilities: 1200000, telecom: 200000,
      cogsRate: 34, alcoholCogsRate: 30, alcoholSalesRatio: 35,
      deliveryFeeRate: 0, cardFeeRate: 1.5,
      marketing: 500000, supplies: 400000, maintenance: 300000, etc: 500000,
      incomeTaxRate: 35, vatEnabled: true, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 100000000, premiumKey: 50000000, interior: 100000000, equipment: 50000000, signage: 5000000, otherSetup: 10000000,
      loanEnabled: true, loanAmount: 100000000, loanInterestRate: 4.5, loanTermMonths: 60,
      recoveryMonths: 48, targetMonthlyProfit: 8000000,
    },
  },
};

export const VALID_INDUSTRIES: IndustryKey[] = ["cafe", "restaurant", "bar", "finedining", "gogi"];

/** 모든 수치를 0으로 초기화한 빈 폼 — 시뮬레이터 최초 진입 시 사용 */
export function createEmptyForm(industry: IndustryKey = "restaurant"): FullForm {
  return {
    industry,
    // Step1
    seats: 0, avgSpend: 0, turnover: 0,
    weekdayDays: 0, weekendDays: 0, weekendMultiplier: 1.0,
    deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 15, deliveryDirectRate: 0,
    deliveryPreference: "possible",
    lunchRatio: 34, dinnerRatio: 33, nightRatio: 33,
    // Step2
    laborType: "direct", labor: 0,
    staffCount: 0, hourlyWage: 0, workHoursPerDay: 0, workDaysPerMonth: 0,
    rent: 0, utilities: 0, telecom: 0,
    cogsRate: 0, alcoholCogsRate: 0, alcoholSalesRatio: 0,
    deliveryFeeRate: 15, cardFeeRate: 1.5,
    marketing: 0, supplies: 0, maintenance: 0, etc: 0,
    incomeTaxRate: 15, vatEnabled: false, insuranceRate: 9,
    // Step3
    businessType: "new",
    deposit: 0, premiumKey: 0, interior: 0, equipment: 0, signage: 0, otherSetup: 0,
    loanEnabled: false, loanAmount: 0, loanInterestRate: 5, loanTermMonths: 36,
    recoveryMonths: 24, targetMonthlyProfit: 0,
  };
}

// ─── sanitize ──────────────────────────────────────────────────
export function sanitizeFullForm(raw: Record<string, unknown>): FullForm {
  const industry: IndustryKey = VALID_INDUSTRIES.includes(raw.industry as IndustryKey)
    ? (raw.industry as IndustryKey) : "restaurant";
  const cfg = INDUSTRY_CONFIG[industry];
  const def = { ...cfg.defaultStep1, industry, ...cfg.defaultStep2, ...cfg.defaultStep3 };

  const num = (k: string, fallback: number, min = -Infinity, max = Infinity) => {
    const v = Number(raw[k]);
    return !isNaN(v) && v >= min && v <= max ? v : fallback;
  };
  const bool = (k: string, fallback: boolean) =>
    raw[k] === "true" || raw[k] === true ? true : raw[k] === "false" || raw[k] === false ? false : fallback;
  const str = <T extends string>(k: string, fallback: T, options: T[]) =>
    options.includes(raw[k] as T) ? (raw[k] as T) : fallback;

  return {
    industry,
    // Step1
    seats:                num("seats", def.seats, 1, 10000),
    avgSpend:             num("avgSpend", def.avgSpend, 100, 10000000),
    turnover:             num("turnover", def.turnover, 0.1, 100),
    weekdayDays:          num("weekdayDays", def.weekdayDays, 0, 23),
    weekendDays:          num("weekendDays", def.weekendDays, 0, 8),
    weekendMultiplier:    num("weekendMultiplier", def.weekendMultiplier, 0.5, 5),
    deliveryEnabled:      bool("deliveryEnabled", def.deliveryEnabled),
    deliverySales:        num("deliverySales", def.deliverySales, 0),
    deliveryAppRate:      num("deliveryAppRate", def.deliveryAppRate, 0, 40),
    deliveryDirectRate:   num("deliveryDirectRate", def.deliveryDirectRate, 0, 100),
    deliveryPreference:   str("deliveryPreference", def.deliveryPreference, ["possible", "impossible"]),
    lunchRatio:           num("lunchRatio", def.lunchRatio, 0, 100),
    dinnerRatio:          num("dinnerRatio", def.dinnerRatio, 0, 100),
    nightRatio:           num("nightRatio", def.nightRatio, 0, 100),
    // Step2
    laborType:            str("laborType", def.laborType, ["direct", "calculate"]),
    labor:                num("labor", def.labor, 0),
    staffCount:           num("staffCount", def.staffCount, 0, 100),
    hourlyWage:           num("hourlyWage", def.hourlyWage, 0),
    workHoursPerDay:      num("workHoursPerDay", def.workHoursPerDay, 0, 24),
    workDaysPerMonth:     num("workDaysPerMonth", def.workDaysPerMonth, 0, 31),
    rent:                 num("rent", def.rent, 0),
    utilities:            num("utilities", def.utilities, 0),
    telecom:              num("telecom", def.telecom, 0),
    cogsRate:             num("cogsRate", def.cogsRate, 1, 95),
    alcoholCogsRate:      num("alcoholCogsRate", def.alcoholCogsRate, 0, 95),
    alcoholSalesRatio:    num("alcoholSalesRatio", def.alcoholSalesRatio, 0, 100),
    deliveryFeeRate:      num("deliveryFeeRate", def.deliveryFeeRate, 0, 40),
    cardFeeRate:          num("cardFeeRate", def.cardFeeRate, 0, 5),
    marketing:            num("marketing", def.marketing, 0),
    supplies:             num("supplies", def.supplies, 0),
    maintenance:          num("maintenance", def.maintenance, 0),
    etc:                  num("etc", def.etc, 0),
    incomeTaxRate:        num("incomeTaxRate", def.incomeTaxRate, 0, 50),
    vatEnabled:           bool("vatEnabled", def.vatEnabled),
    insuranceRate:        num("insuranceRate", def.insuranceRate, 0, 30),
    // Step3
    businessType:         str("businessType", def.businessType, ["new", "existing"]),
    deposit:              num("deposit", def.deposit, 0),
    premiumKey:           num("premiumKey", def.premiumKey, 0),
    interior:             num("interior", def.interior, 0),
    equipment:            num("equipment", def.equipment, 0),
    signage:              num("signage", def.signage, 0),
    otherSetup:           num("otherSetup", def.otherSetup, 0),
    loanEnabled:          bool("loanEnabled", def.loanEnabled),
    loanAmount:           num("loanAmount", def.loanAmount, 0),
    loanInterestRate:     num("loanInterestRate", def.loanInterestRate, 0, 30),
    loanTermMonths:       num("loanTermMonths", def.loanTermMonths, 1, 360),
    recoveryMonths:       num("recoveryMonths", def.recoveryMonths, 1, 120),
    targetMonthlyProfit:  num("targetMonthlyProfit", def.targetMonthlyProfit, 0),
  };
}

// ─── 핵심 계산 ─────────────────────────────────────────────────
export type CalcResult = {
  // 매출
  hallSales: number;          // 홀 매출
  deliveryNetSales: number;   // 배달 순매출 (수수료 차감)
  totalSales: number;         // 총 매출
  weekdaySales: number;
  weekendSales: number;
  // 비용
  laborCost: number;
  insuranceCost: number;
  foodCogs: number;         // 식자재 원가
  alcoholCogs: number;      // 주류 원가
  cogs: number;             // 총 원가 (식자재 + 주류)
  cogsRatio: number;        // 총 원가율
  cardFee: number;
  fixedCosts: number;
  totalCost: number;
  // 세전 수익
  profit: number;
  bep: number;
  bepGap: number;
  laborRatio: number;
  seatUtilization: number;
  netMargin: number;
  // 세금
  incomeTax: number;
  vatBurden: number;
  // 세후 수익
  netProfit: number;
  netProfitMargin: number;
  // 부채 & 투자 회수
  monthlyLoanPayment: number;   // 월 대출 상환액
  cashFlow: number;             // 실제 현금흐름 (세후 - 대출상환)
  totalInitialCost: number;     // 총 초기 투자비
  recoveryMonthsActual: number; // 실제 투자금 회수 기간
};

export function calcResult(form: FullForm): CalcResult {
  const config = INDUSTRY_CONFIG[form.industry];

  // 홀 매출 (주말/평일 분리)
  const weekdaySales = form.seats * form.avgSpend * form.turnover * form.weekdayDays;
  const weekendSales = form.seats * form.avgSpend * form.turnover * form.weekendMultiplier * form.weekendDays;
  const hallSales = weekdaySales + weekendSales;

  // 배달 매출 (수수료 차감)
  const deliveryAppSales = form.deliveryEnabled ? form.deliverySales * (1 - form.deliveryDirectRate / 100) : 0;
  const deliveryDirectSales = form.deliveryEnabled ? form.deliverySales * (form.deliveryDirectRate / 100) : 0;
  const deliveryNetSales = form.deliveryEnabled
    ? deliveryAppSales * (1 - form.deliveryAppRate / 100) + deliveryDirectSales
    : 0;
  const totalSales = hallSales + deliveryNetSales;

  // 인건비 계산
  const laborCost = form.laborType === "calculate"
    ? form.staffCount * form.hourlyWage * form.workHoursPerDay * form.workDaysPerMonth
    : form.labor;
  const insuranceCost = laborCost * (form.insuranceRate / 100);

  // 원가 계산 (식자재 + 주류 분리)
  const alcoholSalesRatio = form.industry === "cafe" ? 0 : form.alcoholSalesRatio / 100;
  const foodSales = totalSales * (1 - alcoholSalesRatio);
  const alcoholSales = totalSales * alcoholSalesRatio;
  const foodCogs = foodSales * (form.cogsRate / 100);
  const alcoholCogs = form.industry === "cafe" ? 0 : alcoholSales * (form.alcoholCogsRate / 100);
  const cogs = foodCogs + alcoholCogs;
  const cogsRatio = totalSales > 0 ? (cogs / totalSales) * 100 : 0;

  // 카드 수수료 — 홀 매출에만 적용 (배달 순매출은 앱 정산 구조라 별도 카드수수료 없음)
  const cardFee = hallSales * (form.cardFeeRate / 100);

  // 고정비 합계
  const fixedCosts = laborCost + insuranceCost + form.rent + form.utilities + form.telecom
    + form.marketing + form.supplies + form.maintenance + form.etc;
  const totalCost = cogs + cardFee + fixedCosts;
  const profit = totalSales - totalCost;

  // BEP — 변동비율도 홀 매출 기준 카드수수료로 수정
  const hallSalesRatio = totalSales > 0 ? hallSales / totalSales : 1;
  const variableRatio = cogsRatio / 100 + (form.cardFeeRate / 100) * hallSalesRatio;
  const bep = variableRatio < 1 ? fixedCosts / (1 - variableRatio) : 0;
  const bepGap = totalSales - bep;

  // 비율
  const laborRatio = totalSales > 0 ? (laborCost / totalSales) * 100 : 0;
  const seatUtilization = Math.min((form.turnover / config.maxTurnover) * 100, 100);
  const netMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  // 세금
  const incomeTax = profit > 0 ? profit * (form.incomeTaxRate / 100) : 0;
  // 부가세 납부액 = (매출세액 - 매입세액)
  // 매입세액 공제 대상: 원가 + 임대료 + 공과금 + 통신비 + 소모품 + 유지보수 + 기타 (인건비·마케팅 제외)
  const vatDeductible = cogs + form.rent + form.utilities + form.telecom
    + form.supplies + form.maintenance + form.etc;
  const vatBurden = form.vatEnabled ? Math.max((totalSales - vatDeductible) / 11, 0) : 0;
  const netProfit = profit - incomeTax - vatBurden;
  const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // 부채 상환 (원리금 균등 상환)
  const monthlyRate = form.loanEnabled && form.loanInterestRate > 0
    ? form.loanInterestRate / 100 / 12 : 0;
  const monthlyLoanPayment = form.loanEnabled && form.loanAmount > 0
    ? monthlyRate > 0
      ? form.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, form.loanTermMonths)) / (Math.pow(1 + monthlyRate, form.loanTermMonths) - 1)
      : form.loanAmount / form.loanTermMonths
    : 0;

  const cashFlow = netProfit - monthlyLoanPayment;

  // 총 초기 투자비 & 회수 기간
  const totalInitialCost = form.deposit + form.premiumKey + form.interior + form.equipment + form.signage + form.otherSetup;
  const recoveryMonthsActual = cashFlow > 0 ? Math.ceil(totalInitialCost / cashFlow) : 999;

  return {
    hallSales, deliveryNetSales, totalSales, weekdaySales, weekendSales,
    laborCost, insuranceCost, foodCogs, alcoholCogs, cogs, cogsRatio, cardFee, fixedCosts, totalCost,
    profit, bep, bepGap, laborRatio, seatUtilization, netMargin,
    incomeTax, vatBurden, netProfit, netProfitMargin,
    monthlyLoanPayment, cashFlow, totalInitialCost, recoveryMonthsActual,
  };
}

// ─── 목표 역산 ─────────────────────────────────────────────────
export type ReverseCalcResult = {
  neededAvgSpend: number;
  neededTurnover: number;
  neededCogsRate: number | null;
  avgSpendDiff: number;
  turnoverDiff: number;
  cogsRateDiff: number | null;
};

export function calcReverse(form: FullForm, targetNetProfit: number): ReverseCalcResult {
  const taxRate = form.incomeTaxRate / 100;
  const laborCost = form.laborType === "calculate"
    ? form.staffCount * form.hourlyWage * form.workHoursPerDay * form.workDaysPerMonth
    : form.labor;
  const insuranceCost = laborCost * (form.insuranceRate / 100);
  const fixedCosts = laborCost + insuranceCost + form.rent + form.utilities + form.telecom
    + form.marketing + form.supplies + form.maintenance + form.etc;

  const alcoholSalesRatio = form.industry === "cafe" ? 0 : form.alcoholSalesRatio / 100;
  const effectiveCogsRate = (form.cogsRate * (1 - alcoholSalesRatio) + form.alcoholCogsRate * alcoholSalesRatio) / 100;

  // 카드수수료는 홀 매출 비중만큼만 적용 (배달 제외)
  // 역산 시점에는 홀/배달 비율을 현재 값 기준으로 추정
  const currentResult = calcResult(form);
  const hallRatio = currentResult.totalSales > 0
    ? currentResult.hallSales / currentResult.totalSales : 1;
  const effectiveCardRate = (form.cardFeeRate / 100) * hallRatio;
  const variableRatio = effectiveCogsRate + effectiveCardRate;

  const totalDays = form.weekdayDays + form.weekendDays * form.weekendMultiplier;

  // VAT 납부액을 역산에 반영: 세후목표 = 세전이익 - 소득세 - VAT
  // VAT ≈ (매출 - 공제가능비용) / 11 → 매출에 비례하므로 targetProfit 역산에 포함
  // 단순화: 세전이익 역산 후 VAT는 근사치로 처리 (반복계산 회피)
  const targetProfit = targetNetProfit / Math.max(1 - taxRate, 0.3);

  const neededSales = variableRatio < 1 ? (targetProfit + fixedCosts) / (1 - variableRatio) : 0;
  const neededAvgSpend = totalDays > 0 && form.seats > 0 && form.turnover > 0
    ? neededSales / (form.seats * form.turnover * totalDays) : 0;
  const neededTurnover = totalDays > 0 && form.seats > 0 && form.avgSpend > 0
    ? neededSales / (form.seats * form.avgSpend * totalDays) : 0;

  // 최대 허용 통합 원가율 (현재 매출 기준)
// 매출이 0이거나 목표이익+고정비가 매출을 초과하면 의미없는 값 → null 처리
const rawCogsRate = currentResult.totalSales > 0
  ? (1 - (targetProfit + fixedCosts) / currentResult.totalSales - effectiveCardRate) * 100
  : null;
const neededCogsRate = rawCogsRate !== null && rawCogsRate >= 0
  ? Math.min(95, rawCogsRate)
  : null;

  // 현재 통합 원가율 (diff 비교 기준)
  const currentEffectiveCogsRate = form.industry === "cafe"
    ? form.cogsRate
    : form.cogsRate * (1 - form.alcoholSalesRatio / 100) + form.alcoholCogsRate * (form.alcoholSalesRatio / 100);

  return {
    neededAvgSpend: Math.round(neededAvgSpend),
    neededTurnover: Math.round(neededTurnover * 10) / 10,
    neededCogsRate: neededCogsRate !== null ? Math.round(neededCogsRate * 10) / 10 : null,
    avgSpendDiff: Math.round(neededAvgSpend - form.avgSpend),
    turnoverDiff: Math.round((neededTurnover - form.turnover) * 10) / 10,
    cogsRateDiff: neededCogsRate !== null
      ? Math.round((neededCogsRate - currentEffectiveCogsRate) * 10) / 10
      : null,
  };
}

// ─── 시뮬레이션 ────────────────────────────────────────────────
export type SimItem = { label: string; sales: number; profit: number; netProfit: number; cashFlow: number };

export function calcSimulation(form: FullForm): SimItem[] {
  const config = INDUSTRY_CONFIG[form.industry];
  const { simPctMin, simPctMax, simSteps } = config;
  const step = (simPctMax - simPctMin) / (simSteps - 1);
  return Array.from({ length: simSteps }, (_, i) => {
    const p = simPctMin + step * i;
    const plus = Math.round(form.avgSpend * p);
    const r = calcResult({ ...form, avgSpend: form.avgSpend + plus });
    return { label: `+${Math.round(p * 100)}%`, sales: r.totalSales, profit: r.profit, netProfit: r.netProfit, cashFlow: r.cashFlow };
  });
}

// ─── 전략 시뮬레이션 ───────────────────────────────────────────
export type StrategyItem = { label: string; profit: number; netProfit: number; cashFlow: number; diff: number; tags: string[] };

export function calcStrategies(form: FullForm, baseProfit: number): StrategyItem[] {
  const config = INDUSTRY_CONFIG[form.industry];
  const scenarios: StrategyItem[] = [];

  const simulate = (changes: Partial<FullForm>, label: string, tags: string[]) => {
    const r = calcResult({ ...form, ...changes });
    scenarios.push({ label, profit: r.profit, netProfit: r.netProfit, cashFlow: r.cashFlow, diff: r.profit - baseProfit, tags });
  };

  const { simPctMin, simPctMax, simSteps } = config;
  const step = (simPctMax - simPctMin) / (simSteps - 1);
  Array.from({ length: simSteps }, (_, i) => {
    const p = simPctMin + step * i;
    simulate({ avgSpend: form.avgSpend + Math.round(form.avgSpend * p) }, `객단가 +${Math.round(p * 100)}%`, ["객단가"]);
  });
  [0.1, 0.2, 0.3].forEach((plus) =>
    simulate({ turnover: Number((form.turnover + plus).toFixed(1)) }, `회전율 +${plus.toFixed(1)}회`, ["회전율"])
  );
  [0.05, 0.10].forEach((ratio) =>
    simulate({ labor: Math.round((form.laborType === "calculate" ? form.staffCount * form.hourlyWage * form.workHoursPerDay * form.workDaysPerMonth : form.labor) * (1 - ratio)) }, `운영 효율화 -${Math.round(ratio * 100)}%`, ["효율화"])
  );
  if (!form.deliveryEnabled && form.deliveryPreference !== "impossible") {
    simulate({ deliveryEnabled: true, deliverySales: Math.round(form.seats * form.avgSpend * 0.3) }, "배달 채널 추가", ["배달"]);
  }
  const midPct = (simPctMin + simPctMax) / 2;
  simulate(
    { avgSpend: form.avgSpend + Math.round(form.avgSpend * midPct), cogsRate: Math.max(form.cogsRate - 2, 5) },
    `객단가 +${Math.round(midPct * 100)}% & 원가율 -2%p`, ["객단가", "원가", "복합"]
  );

  return scenarios.sort((a, b) => b.diff - a.diff).slice(0, 5);
}

// ─── 진단 분석 ─────────────────────────────────────────────────
export type AnalysisItem = { title: string; body: string; tone: "default" | "good" | "warn" | "bad" };

export function calcAnalysis(form: FullForm, result: CalcResult): AnalysisItem[] {
  const config = INDUSTRY_CONFIG[form.industry];
  const items: AnalysisItem[] = [];

  // 운영 상태
  items.push(result.profit >= 0
    ? { title: "현재 운영 상태", body: `세전 ${fmt(result.profit)}원, 세후 실수령 ${fmt(result.netProfit)}원입니다. 현금흐름(대출 상환 후) ${fmt(result.cashFlow)}원.`, tone: result.netMargin >= config.netMarginWarn ? "good" : "warn" }
    : { title: "현재 운영 상태", body: `세전 기준 월 ${fmt(Math.abs(result.profit))}원 적자입니다. 손익분기점까지 ${fmt(Math.abs(result.bepGap))}원 부족합니다.`, tone: "bad" }
  );

  if (result.laborRatio >= config.laborWarnRate)
    items.push({ title: "인건비 과다", body: `인건비 비율 ${pct(result.laborRatio)}로 ${config.label} 기준(${config.laborWarnRate}%)을 초과합니다.`, tone: "warn" });
  if (form.cogsRate >= config.cogsWarnRate)
    items.push({ title: "원가율 과다", body: `원가율 ${pct(form.cogsRate)}로 ${config.label} 기준(${config.cogsWarnRate}%)을 초과합니다.`, tone: "warn" });
  if (result.seatUtilization < 50)
    items.push({ title: "좌석 가동률 저조", body: `좌석 가동률 ${pct(result.seatUtilization)}로 낮습니다. 최대 회전율 기준 ${config.maxTurnover}회.`, tone: "warn" });

  // 배달 분석
  if (form.deliveryEnabled && result.deliveryNetSales > 0) {
    const deliveryRatio = (result.deliveryNetSales / result.totalSales) * 100;
    if (deliveryRatio > 40)
      items.push({ title: "배달 매출 과의존", body: `배달 매출 비중이 ${pct(deliveryRatio)}로 높습니다. 홀 매출 강화를 검토해보세요.`, tone: "warn" });
  }

  // 부채 분석
  if (form.loanEnabled && result.monthlyLoanPayment > 0) {
    const loanBurden = result.cashFlow < 0
      ? "대출 상환 후 현금흐름이 마이너스입니다. 상환 기간 연장을 검토하세요."
      : `월 대출 상환액 ${fmt(result.monthlyLoanPayment)}원 반영 후 현금흐름 ${fmt(result.cashFlow)}원입니다.`;
    items.push({ title: "부채 상환 현황", body: loanBurden, tone: result.cashFlow < 0 ? "bad" : "default" });
  }

  // 투자 회수
  if (result.totalInitialCost > 0) {
    items.push(
      result.recoveryMonthsActual <= form.recoveryMonths
        ? { title: "투자금 회수", body: `현재 현금흐름 기준 약 ${result.recoveryMonthsActual}개월 후 투자금 회수 가능합니다. 목표(${form.recoveryMonths}개월) 달성 가능합니다.`, tone: "good" }
        : result.recoveryMonthsActual === 999
        ? { title: "투자금 회수", body: "현재 현금흐름으로는 투자금 회수가 불가능합니다. 수익 구조 개선이 시급합니다.", tone: "bad" }
        : { title: "투자금 회수", body: `현재 기준 약 ${result.recoveryMonthsActual}개월 후 회수 가능합니다. 목표(${form.recoveryMonths}개월)보다 ${result.recoveryMonthsActual - form.recoveryMonths}개월 초과됩니다.`, tone: "warn" }
    );
  }

  items.push(result.bepGap >= 0
    ? { title: "손익분기점", body: `손익분기점(${fmt(result.bep)}원) 대비 ${fmt(result.bepGap)}원 초과 달성 중입니다.`, tone: "good" }
    : { title: "손익분기점", body: `손익분기점(${fmt(result.bep)}원)까지 월 ${fmt(Math.abs(result.bepGap))}원 부족합니다.`, tone: "bad" }
  );

  return items;
}

// ─── 히스토리 ──────────────────────────────────────────────────
const HISTORY_KEY = "vela-history-v2";
const MAX_HISTORY = 12;

export function saveHistory(form: FullForm, result: CalcResult): void {
  if (typeof window === "undefined") return;
  const now = new Date();
  const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getTime()}`;
  const label = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const record: HistoryRecord = {
    id, label, form,
    result: { totalSales: result.totalSales, profit: result.profit, netProfit: result.netProfit, netMargin: result.netMargin, bep: result.bep, recoveryMonthsActual: result.recoveryMonthsActual },
    savedAt: now.toISOString(),
  };
  const updated = [record, ...loadHistory().filter((r) => r.id !== id)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function loadHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}

export function deleteHistory(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter((r) => r.id !== id)));
}

// ─── 포맷 ──────────────────────────────────────────────────────
export const fmt = (n: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

export const pct = (n: number) => `${Number.isFinite(n) ? n.toFixed(1) : "0.0"}%`;