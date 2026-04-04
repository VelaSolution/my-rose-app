export type IndustryKey = "cafe" | "restaurant" | "bar" | "finedining" | "gogi";

// ─── 폼 상태 ────────────────────────────────────────────────────

// 1단계: 매출 정보
export type Step1Form = {
  industry: IndustryKey;
  seats: number;
  avgSpend: number;
  turnover: number;
  weekdayDays: number;
  weekendDays: number;
  weekendMultiplier: number;
  takeoutRatio: number;           // 포장/테이크아웃 비율 (%) — 홀 매출 중
  cashPaymentRate: number;        // 현금 결제 비율 (%) — 나머지는 카드
  deliveryEnabled: boolean;
  deliverySales: number;
  deliveryAppRate: number;
  deliveryDirectRate: number;
  deliveryPreference: "possible" | "impossible";
  lunchRatio: number;
  dinnerRatio: number;
  nightRatio: number;
};

// 2단계: 고정비 & 운영비
export type Step2Form = {
  laborType: "direct" | "calculate";
  labor: number;
  staffCount: number;
  hourlyWage: number;
  workHoursPerDay: number;
  workDaysPerMonth: number;
  rent: number;
  utilities: number;
  telecom: number;
  cogsRate: number;
  alcoholCogsRate: number;
  alcoholSalesRatio: number;
  wasteRate: number;              // 식자재 폐기율 (%) — 실질 원가율 = cogsRate + wasteRate
  franchiseEnabled: boolean;      // 프랜차이즈 여부
  franchiseRoyaltyRate: number;   // 매출 대비 로열티 (%)
  ownerType: "individual" | "corporation"; // 개인사업자 vs 법인
  deliveryFeeRate: number;
  cardFeeRate: number;
  marketing: number;
  supplies: number;
  maintenance: number;
  etc: number;
  incomeTaxRate: number;
  vatEnabled: boolean;
  insuranceRate: number;
};

// 3단계: 초기비용 & 부채
export type Step3Form = {
  businessType: "new" | "existing";
  deposit: number;
  premiumKey: number;
  interior: number;
  equipment: number;
  signage: number;
  franchiseFee: number;           // 가맹비
  trainingFee: number;            // 교육비
  otherSetup: number;
  loanEnabled: boolean;
  loanAmount: number;
  loanInterestRate: number;
  loanTermMonths: number;
  recoveryMonths: number;
  targetMonthlyProfit: number;
};

export type FullForm = Step1Form & Step2Form & Step3Form;

// ─── 히스토리 타입 ──────────────────────────────────────────────
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

// ─── 업종별 벤치마크 ────────────────────────────────────────────
export type IndustryBenchmark = {
  cogsRate: number;       // 평균 원가율 (%)
  laborRate: number;      // 평균 인건비율 (%)
  rentRate: number;       // 평균 임대료율 (%)
  netMargin: number;      // 평균 순이익률 (%)
};

export const INDUSTRY_BENCHMARK: Record<IndustryKey, IndustryBenchmark> = {
  cafe:       { cogsRate: 28, laborRate: 28, rentRate: 14, netMargin: 12 },
  restaurant: { cogsRate: 33, laborRate: 25, rentRate: 12, netMargin: 9  },
  bar:        { cogsRate: 22, laborRate: 22, rentRate: 11, netMargin: 16 },
  finedining: { cogsRate: 35, laborRate: 30, rentRate: 13, netMargin: 13 },
  gogi:       { cogsRate: 40, laborRate: 22, rentRate: 11, netMargin: 8  },
};

// ─── 업종별 설정 ────────────────────────────────────────────────
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
      takeoutRatio: 30, cashPaymentRate: 10,
      deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 15, deliveryDirectRate: 30,
      deliveryPreference: "possible",
      lunchRatio: 40, dinnerRatio: 40, nightRatio: 20,
    },
    defaultStep2: {
      laborType: "direct", labor: 3500000, staffCount: 2, hourlyWage: 10000, workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 1500000, utilities: 400000, telecom: 100000,
      cogsRate: 28, alcoholCogsRate: 0, alcoholSalesRatio: 0,
      wasteRate: 3, franchiseEnabled: false, franchiseRoyaltyRate: 0,
      ownerType: "individual",
      deliveryFeeRate: 15, cardFeeRate: 1.5,
      marketing: 200000, supplies: 150000, maintenance: 100000, etc: 100000,
      incomeTaxRate: 15, vatEnabled: false, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 30000000, premiumKey: 10000000, interior: 20000000, equipment: 10000000, signage: 2000000,
      franchiseFee: 0, trainingFee: 0, otherSetup: 3000000,
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
      takeoutRatio: 10, cashPaymentRate: 15,
      deliveryEnabled: true, deliverySales: 3000000, deliveryAppRate: 15, deliveryDirectRate: 20,
      deliveryPreference: "possible",
      lunchRatio: 40, dinnerRatio: 50, nightRatio: 10,
    },
    defaultStep2: {
      laborType: "direct", labor: 6500000, staffCount: 3, hourlyWage: 10000, workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 3500000, utilities: 900000, telecom: 150000,
      cogsRate: 32, alcoholCogsRate: 28, alcoholSalesRatio: 20,
      wasteRate: 5, franchiseEnabled: false, franchiseRoyaltyRate: 0,
      ownerType: "individual",
      deliveryFeeRate: 15, cardFeeRate: 1.5,
      marketing: 300000, supplies: 300000, maintenance: 200000, etc: 300000,
      incomeTaxRate: 24, vatEnabled: true, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 50000000, premiumKey: 30000000, interior: 40000000, equipment: 20000000, signage: 3000000,
      franchiseFee: 0, trainingFee: 0, otherSetup: 5000000,
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
      takeoutRatio: 0, cashPaymentRate: 20,
      deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 15, deliveryDirectRate: 0,
      deliveryPreference: "impossible",
      lunchRatio: 0, dinnerRatio: 40, nightRatio: 60,
    },
    defaultStep2: {
      laborType: "direct", labor: 4000000, staffCount: 2, hourlyWage: 10000, workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 2500000, utilities: 600000, telecom: 100000,
      cogsRate: 22, alcoholCogsRate: 18, alcoholSalesRatio: 70,
      wasteRate: 3, franchiseEnabled: false, franchiseRoyaltyRate: 0,
      ownerType: "individual",
      deliveryFeeRate: 0, cardFeeRate: 1.5,
      marketing: 300000, supplies: 200000, maintenance: 150000, etc: 200000,
      incomeTaxRate: 24, vatEnabled: true, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 30000000, premiumKey: 20000000, interior: 30000000, equipment: 10000000, signage: 2000000,
      franchiseFee: 0, trainingFee: 0, otherSetup: 3000000,
      loanEnabled: true, loanAmount: 30000000, loanInterestRate: 5, loanTermMonths: 36,
      recoveryMonths: 30, targetMonthlyProfit: 4000000,
    },
  },
  finedining: {
    label: "파인다이닝", icon: "✨",
    maxTurnover: 1.5, cogsWarnRate: 35, laborWarnRate: 30, netMarginWarn: 12,
    simPctMin: 0.10, simPctMax: 0.30, simSteps: 4,
    defaultStep1: {
      seats: 16, avgSpend: 80000, turnover: 0.9,
      weekdayDays: 18, weekendDays: 6, weekendMultiplier: 1.3,
      takeoutRatio: 0, cashPaymentRate: 5,
      deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 0, deliveryDirectRate: 0,
      deliveryPreference: "impossible",
      lunchRatio: 30, dinnerRatio: 65, nightRatio: 5,
    },
    defaultStep2: {
      laborType: "direct", labor: 8000000, staffCount: 5, hourlyWage: 12000, workHoursPerDay: 8, workDaysPerMonth: 22,
      rent: 5000000, utilities: 1200000, telecom: 200000,
      cogsRate: 34, alcoholCogsRate: 30, alcoholSalesRatio: 35,
      wasteRate: 8, franchiseEnabled: false, franchiseRoyaltyRate: 0,
      ownerType: "individual",
      deliveryFeeRate: 0, cardFeeRate: 1.5,
      marketing: 500000, supplies: 400000, maintenance: 300000, etc: 500000,
      incomeTaxRate: 35, vatEnabled: true, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 100000000, premiumKey: 50000000, interior: 100000000, equipment: 50000000, signage: 5000000,
      franchiseFee: 0, trainingFee: 0, otherSetup: 10000000,
      loanEnabled: true, loanAmount: 100000000, loanInterestRate: 4.5, loanTermMonths: 60,
      recoveryMonths: 48, targetMonthlyProfit: 8000000,
    },
  },
  gogi: {
    label: "고깃집", icon: "🥩",
    maxTurnover: 2.5, cogsWarnRate: 42, laborWarnRate: 25, netMarginWarn: 7,
    simPctMin: 0.05, simPctMax: 0.25, simSteps: 5,
    defaultStep1: {
      seats: 40, avgSpend: 45000, turnover: 1.4,
      weekdayDays: 22, weekendDays: 8, weekendMultiplier: 1.5,
      takeoutRatio: 0, cashPaymentRate: 10,
      deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 15, deliveryDirectRate: 0,
      deliveryPreference: "possible",
      lunchRatio: 30, dinnerRatio: 60, nightRatio: 10,
    },
    defaultStep2: {
      laborType: "direct", labor: 5000000, staffCount: 4, hourlyWage: 12000, workHoursPerDay: 8, workDaysPerMonth: 26,
      rent: 3000000, utilities: 400000, telecom: 50000,
      cogsRate: 40, alcoholCogsRate: 20, alcoholSalesRatio: 25,
      wasteRate: 4, franchiseEnabled: false, franchiseRoyaltyRate: 0,
      ownerType: "individual",
      deliveryFeeRate: 15, cardFeeRate: 1.5,
      marketing: 300000, supplies: 150000, maintenance: 100000, etc: 100000,
      incomeTaxRate: 3.3, vatEnabled: true, insuranceRate: 9,
    },
    defaultStep3: {
      businessType: "new",
      deposit: 50000000, premiumKey: 30000000, interior: 40000000, equipment: 30000000, signage: 3000000,
      franchiseFee: 0, trainingFee: 0, otherSetup: 5000000,
      loanEnabled: true, loanAmount: 50000000, loanInterestRate: 5, loanTermMonths: 48,
      recoveryMonths: 30, targetMonthlyProfit: 5000000,
    },
  },
};

export const VALID_INDUSTRIES: IndustryKey[] = ["cafe", "restaurant", "bar", "finedining", "gogi"];

/** 빈 폼 초기화 */
export function createEmptyForm(industry: IndustryKey = "restaurant"): FullForm {
  return {
    industry,
    seats: 0, avgSpend: 0, turnover: 0,
    weekdayDays: 0, weekendDays: 0, weekendMultiplier: 1.0,
    takeoutRatio: 0, cashPaymentRate: 10,
    deliveryEnabled: false, deliverySales: 0, deliveryAppRate: 15, deliveryDirectRate: 0,
    deliveryPreference: "possible",
    lunchRatio: 34, dinnerRatio: 33, nightRatio: 33,
    laborType: "direct", labor: 0,
    staffCount: 0, hourlyWage: 0, workHoursPerDay: 0, workDaysPerMonth: 0,
    rent: 0, utilities: 0, telecom: 0,
    cogsRate: 0, alcoholCogsRate: 0, alcoholSalesRatio: 0,
    wasteRate: 0, franchiseEnabled: false, franchiseRoyaltyRate: 0,
    ownerType: "individual",
    deliveryFeeRate: 15, cardFeeRate: 1.5,
    marketing: 0, supplies: 0, maintenance: 0, etc: 0,
    incomeTaxRate: 15, vatEnabled: false, insuranceRate: 9,
    businessType: "new",
    deposit: 0, premiumKey: 0, interior: 0, equipment: 0, signage: 0,
    franchiseFee: 0, trainingFee: 0, otherSetup: 0,
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
    seats:                num("seats", def.seats, 1, 10000),
    avgSpend:             num("avgSpend", def.avgSpend, 100, 10000000),
    turnover:             num("turnover", def.turnover, 0.1, 100),
    weekdayDays:          num("weekdayDays", def.weekdayDays, 0, 23),
    weekendDays:          num("weekendDays", def.weekendDays, 0, 8),
    weekendMultiplier:    num("weekendMultiplier", def.weekendMultiplier, 0.5, 5),
    takeoutRatio:         num("takeoutRatio", def.takeoutRatio ?? 0, 0, 100),
    cashPaymentRate:      num("cashPaymentRate", def.cashPaymentRate ?? 10, 0, 100),
    deliveryEnabled:      bool("deliveryEnabled", def.deliveryEnabled),
    deliverySales:        num("deliverySales", def.deliverySales, 0),
    deliveryAppRate:      num("deliveryAppRate", def.deliveryAppRate, 0, 40),
    deliveryDirectRate:   num("deliveryDirectRate", def.deliveryDirectRate, 0, 100),
    deliveryPreference:   str("deliveryPreference", def.deliveryPreference, ["possible", "impossible"]),
    lunchRatio:           num("lunchRatio", def.lunchRatio, 0, 100),
    dinnerRatio:          num("dinnerRatio", def.dinnerRatio, 0, 100),
    nightRatio:           num("nightRatio", def.nightRatio, 0, 100),
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
    wasteRate:            num("wasteRate", def.wasteRate ?? 0, 0, 30),
    franchiseEnabled:     bool("franchiseEnabled", def.franchiseEnabled ?? false),
    franchiseRoyaltyRate: num("franchiseRoyaltyRate", def.franchiseRoyaltyRate ?? 0, 0, 20),
    ownerType:            str("ownerType", def.ownerType ?? "individual", ["individual", "corporation"]),
    deliveryFeeRate:      num("deliveryFeeRate", def.deliveryFeeRate, 0, 40),
    cardFeeRate:          num("cardFeeRate", def.cardFeeRate, 0, 5),
    marketing:            num("marketing", def.marketing, 0),
    supplies:             num("supplies", def.supplies, 0),
    maintenance:          num("maintenance", def.maintenance, 0),
    etc:                  num("etc", def.etc, 0),
    incomeTaxRate:        num("incomeTaxRate", def.incomeTaxRate, 0, 50),
    vatEnabled:           bool("vatEnabled", def.vatEnabled),
    insuranceRate:        num("insuranceRate", def.insuranceRate, 0, 30),
    businessType:         str("businessType", def.businessType, ["new", "existing"]),
    deposit:              num("deposit", def.deposit, 0),
    premiumKey:           num("premiumKey", def.premiumKey, 0),
    interior:             num("interior", def.interior, 0),
    equipment:            num("equipment", def.equipment, 0),
    signage:              num("signage", def.signage, 0),
    franchiseFee:         num("franchiseFee", def.franchiseFee ?? 0, 0),
    trainingFee:          num("trainingFee", def.trainingFee ?? 0, 0),
    otherSetup:           num("otherSetup", def.otherSetup, 0),
    loanEnabled:          bool("loanEnabled", def.loanEnabled),
    loanAmount:           num("loanAmount", def.loanAmount, 0),
    loanInterestRate:     num("loanInterestRate", def.loanInterestRate, 0, 30),
    loanTermMonths:       num("loanTermMonths", def.loanTermMonths, 1, 360),
    recoveryMonths:       num("recoveryMonths", def.recoveryMonths, 1, 120),
    targetMonthlyProfit:  num("targetMonthlyProfit", def.targetMonthlyProfit, 0),
  };
}

// ─── 핵심 계산 ──────────────────────────────────────────────────
export type CalcResult = {
  hallSales: number;
  deliveryNetSales: number;
  totalSales: number;
  weekdaySales: number;
  weekendSales: number;
  laborCost: number;
  insuranceCost: number;
  foodCogs: number;
  alcoholCogs: number;
  cogs: number;
  cogsRatio: number;             // 실질 원가율 (폐기율 포함)
  effectiveCogsRate: number;     // 폐기율 포함 실질 원가율 (%)
  cardFee: number;
  royaltyCost: number;           // 프랜차이즈 로열티
  fixedCosts: number;
  totalCost: number;
  profit: number;
  bep: number;
  bepGap: number;
  laborRatio: number;
  rentRatio: number;             // 임대료율
  seatUtilization: number;
  netMargin: number;
  incomeTax: number;
  vatBurden: number;
  netProfit: number;
  netProfitMargin: number;
  monthlyLoanPayment: number;
  cashFlow: number;
  totalInitialCost: number;
  recoveryMonthsActual: number;
  // 비용 구조 (차트용)
  costBreakdown: {
    labor: number;
    cogs: number;
    rent: number;
    utilities: number;
    cardFee: number;
    royalty: number;
    marketing: number;
    other: number;
  };
};

export function calcResult(form: FullForm): CalcResult {
  const config = INDUSTRY_CONFIG[form.industry];

  // 홀 매출
  const weekdaySales = form.seats * form.avgSpend * form.turnover * form.weekdayDays;
  const weekendSales = form.seats * form.avgSpend * form.turnover * form.weekendMultiplier * form.weekendDays;
  const hallSales = weekdaySales + weekendSales;

  // 배달 매출
  const deliveryAppSales = form.deliveryEnabled ? form.deliverySales * (1 - form.deliveryDirectRate / 100) : 0;
  const deliveryDirectSales = form.deliveryEnabled ? form.deliverySales * (form.deliveryDirectRate / 100) : 0;
  const deliveryNetSales = form.deliveryEnabled
    ? deliveryAppSales * (1 - form.deliveryAppRate / 100) + deliveryDirectSales
    : 0;
  const totalSales = hallSales + deliveryNetSales;

  // 인건비
  const laborCost = form.laborType === "calculate"
    ? form.staffCount * form.hourlyWage * form.workHoursPerDay * form.workDaysPerMonth
    : form.labor;
  const insuranceCost = laborCost * (form.insuranceRate / 100);

  // 원가 계산 (폐기율 포함 실질 원가율)
  const alcoholSalesRatio = form.industry === "cafe" ? 0 : form.alcoholSalesRatio / 100;
  const foodSales = totalSales * (1 - alcoholSalesRatio);
  const alcoholSales = totalSales * alcoholSalesRatio;
  const effectiveFoodCogsRate = Math.min(form.cogsRate + (form.wasteRate ?? 0), 95);  // 폐기율 포함
  const foodCogs = foodSales * (effectiveFoodCogsRate / 100);
  const alcoholCogs = form.industry === "cafe" ? 0 : alcoholSales * (form.alcoholCogsRate / 100);
  const cogs = foodCogs + alcoholCogs;
  const cogsRatio = totalSales > 0 ? (cogs / totalSales) * 100 : 0;
  const effectiveCogsRate = effectiveFoodCogsRate * (1 - alcoholSalesRatio) + form.alcoholCogsRate * alcoholSalesRatio;

  // 카드 수수료 (현금 결제 비율 반영 — 홀 매출 중 카드 결제 부분에만 적용)
  const cardPaymentRate = 1 - (form.cashPaymentRate ?? 0) / 100;
  const cardFee = hallSales * cardPaymentRate * (form.cardFeeRate / 100);

  // 프랜차이즈 로열티
  const royaltyCost = form.franchiseEnabled
    ? totalSales * (form.franchiseRoyaltyRate / 100)
    : 0;

  // 고정비 합계
  const fixedCosts = laborCost + insuranceCost + form.rent + form.utilities + form.telecom
    + form.marketing + form.supplies + form.maintenance + form.etc;
  const totalCost = cogs + cardFee + royaltyCost + fixedCosts;
  const profit = totalSales - totalCost;

  // BEP
  const hallSalesRatio = totalSales > 0 ? hallSales / totalSales : 1;
  const variableRatio = cogsRatio / 100
    + (form.cardFeeRate / 100) * cardPaymentRate * hallSalesRatio
    + (form.franchiseEnabled ? form.franchiseRoyaltyRate / 100 : 0);
  const bep = variableRatio < 1 ? fixedCosts / (1 - variableRatio) : 0;
  const bepGap = totalSales - bep;

  // 비율
  const laborRatio = totalSales > 0 ? (laborCost / totalSales) * 100 : 0;
  const rentRatio = totalSales > 0 ? (form.rent / totalSales) * 100 : 0;
  const seatUtilization = Math.min((form.turnover / config.maxTurnover) * 100, 100);
  const netMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  // 세금
  const incomeTax = profit > 0 ? profit * (form.incomeTaxRate / 100) : 0;
  const vatDeductible = cogs + form.rent + form.utilities + form.telecom
    + form.supplies + form.maintenance + form.etc;
  const vatBurden = form.vatEnabled ? Math.max((totalSales - vatDeductible) / 11, 0) : 0;
  const netProfit = profit - incomeTax - vatBurden;
  const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // 부채 상환
  const monthlyRate = form.loanEnabled && form.loanInterestRate > 0
    ? form.loanInterestRate / 100 / 12 : 0;
  const monthlyLoanPayment = form.loanEnabled && form.loanAmount > 0
    ? monthlyRate > 0
      ? form.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, form.loanTermMonths)) / (Math.pow(1 + monthlyRate, form.loanTermMonths) - 1)
      : form.loanAmount / form.loanTermMonths
    : 0;

  const cashFlow = netProfit - monthlyLoanPayment;

  // 초기 투자비
  const totalInitialCost = form.deposit + form.premiumKey + form.interior
    + form.equipment + form.signage + (form.franchiseFee ?? 0) + (form.trainingFee ?? 0) + form.otherSetup;
  const recoveryMonthsActual = cashFlow > 0 ? Math.ceil(totalInitialCost / cashFlow) : 999;

  // 비용 구조 breakdown (차트용)
  const otherCosts = form.supplies + form.maintenance + form.etc + royaltyCost;
  const costBreakdown = {
    labor: laborCost + insuranceCost,
    cogs,
    rent: form.rent,
    utilities: form.utilities + form.telecom,
    cardFee,
    royalty: royaltyCost,
    marketing: form.marketing,
    other: otherCosts,
  };

  return {
    hallSales, deliveryNetSales, totalSales, weekdaySales, weekendSales,
    laborCost, insuranceCost, foodCogs, alcoholCogs, cogs, cogsRatio, effectiveCogsRate,
    cardFee, royaltyCost, fixedCosts, totalCost,
    profit, bep, bepGap, laborRatio, rentRatio, seatUtilization, netMargin,
    incomeTax, vatBurden, netProfit, netProfitMargin,
    monthlyLoanPayment, cashFlow, totalInitialCost, recoveryMonthsActual,
    costBreakdown,
  };
}

// ─── 목표 역산 ──────────────────────────────────────────────────
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
  const effectiveCogsRate = ((form.cogsRate + (form.wasteRate ?? 0)) * (1 - alcoholSalesRatio)
    + form.alcoholCogsRate * alcoholSalesRatio) / 100;

  const currentResult = calcResult(form);
  const hallRatio = currentResult.totalSales > 0
    ? currentResult.hallSales / currentResult.totalSales : 1;
  const cardPaymentRate = 1 - (form.cashPaymentRate ?? 0) / 100;
  const effectiveCardRate = (form.cardFeeRate / 100) * cardPaymentRate * hallRatio;
  const royaltyRate = form.franchiseEnabled ? form.franchiseRoyaltyRate / 100 : 0;
  const variableRatio = effectiveCogsRate + effectiveCardRate + royaltyRate;

  const totalDays = form.weekdayDays + form.weekendDays * form.weekendMultiplier;
  const targetProfit = targetNetProfit / Math.max(1 - taxRate, 0.3);

  const neededSales = variableRatio < 1 ? (targetProfit + fixedCosts) / (1 - variableRatio) : 0;
  const neededAvgSpend = totalDays > 0 && form.seats > 0 && form.turnover > 0
    ? neededSales / (form.seats * form.turnover * totalDays) : 0;
  const neededTurnover = totalDays > 0 && form.seats > 0 && form.avgSpend > 0
    ? neededSales / (form.seats * form.avgSpend * totalDays) : 0;

  const rawCogsRate = currentResult.totalSales > 0
    ? (1 - (targetProfit + fixedCosts) / currentResult.totalSales - effectiveCardRate - royaltyRate) * 100
    : null;
  const neededCogsRate = rawCogsRate !== null && rawCogsRate >= 0
    ? Math.min(95, rawCogsRate)
    : null;

  const currentEffectiveCogsRate = (form.cogsRate + (form.wasteRate ?? 0)) * (1 - form.alcoholSalesRatio / 100)
    + form.alcoholCogsRate * (form.alcoholSalesRatio / 100);

  return {
    neededAvgSpend: Math.round(neededAvgSpend),
    neededTurnover: Math.round(neededTurnover * 10) / 10,
    neededCogsRate: neededCogsRate !== null ? Math.round(neededCogsRate * 10) / 10 : null,
    avgSpendDiff: Math.round(neededAvgSpend - form.avgSpend),
    turnoverDiff: Math.round((neededTurnover - form.turnover) * 10) / 10,
    cogsRateDiff: neededCogsRate !== null ? Math.round((neededCogsRate - currentEffectiveCogsRate) * 10) / 10 : null,
  };
}

// ─── 시뮬레이션 ─────────────────────────────────────────────────
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

// ─── 전략 시뮬레이션 ────────────────────────────────────────────
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
  // 폐기율 개선 전략
  if ((form.wasteRate ?? 0) > 3) {
    simulate({ wasteRate: Math.max((form.wasteRate ?? 0) - 3, 0) }, `폐기율 -3%p 개선`, ["원가", "폐기"]);
  }
  const midPct = (simPctMin + simPctMax) / 2;
  simulate(
    { avgSpend: form.avgSpend + Math.round(form.avgSpend * midPct), cogsRate: Math.max(form.cogsRate - 2, 5) },
    `객단가 +${Math.round(midPct * 100)}% & 원가율 -2%p`, ["객단가", "원가", "복합"]
  );

  return scenarios.sort((a, b) => b.diff - a.diff).slice(0, 5);
}

// ─── 진단 분석 ──────────────────────────────────────────────────
export type AnalysisItem = { title: string; body: string; tone: "default" | "good" | "warn" | "bad" };

export function calcAnalysis(form: FullForm, result: CalcResult): AnalysisItem[] {
  const config = INDUSTRY_CONFIG[form.industry];
  const bench = INDUSTRY_BENCHMARK[form.industry];
  const items: AnalysisItem[] = [];

  items.push(result.profit >= 0
    ? { title: "현재 운영 상태", body: `세전 ${fmt(result.profit)}원, 세후 실수령 ${fmt(result.netProfit)}원입니다. 현금흐름(대출 상환 후) ${fmt(result.cashFlow)}원.`, tone: result.netMargin >= config.netMarginWarn ? "good" : "warn" }
    : { title: "현재 운영 상태", body: `세전 기준 월 ${fmt(Math.abs(result.profit))}원 적자입니다. 손익분기점까지 ${fmt(Math.abs(result.bepGap))}원 부족합니다.`, tone: "bad" }
  );

  // 업종 평균 대비 분석
  const cogsVsBench = result.cogsRatio - bench.cogsRate;
  if (Math.abs(cogsVsBench) >= 2) {
    items.push(cogsVsBench > 0
      ? { title: "원가율 (업종 평균 대비)", body: `실질 원가율 ${pct(result.cogsRatio)} — ${config.label} 평균(${pct(bench.cogsRate)})보다 ${pct(cogsVsBench)} 높습니다. 폐기율 포함 기준입니다.`, tone: "warn" }
      : { title: "원가율 (업종 평균 대비)", body: `실질 원가율 ${pct(result.cogsRatio)} — ${config.label} 평균(${pct(bench.cogsRate)})보다 ${pct(Math.abs(cogsVsBench))} 낮습니다. 원가 관리 우수합니다.`, tone: "good" }
    );
  }

  if (result.laborRatio >= config.laborWarnRate)
    items.push({ title: "인건비 과다", body: `인건비 비율 ${pct(result.laborRatio)}로 ${config.label} 기준(${config.laborWarnRate}%)을 초과합니다. 업종 평균은 ${pct(bench.laborRate)}입니다.`, tone: "warn" });

  if ((form.wasteRate ?? 0) > 5)
    items.push({ title: "폐기율 주의", body: `식자재 폐기율 ${pct(form.wasteRate)}로 높습니다. 실질 원가율에 ${pct(form.wasteRate)} 추가 부담이 발생합니다.`, tone: "warn" });

  if (result.seatUtilization < 50)
    items.push({ title: "좌석 가동률 저조", body: `좌석 가동률 ${pct(result.seatUtilization)}로 낮습니다. 최대 회전율 기준 ${config.maxTurnover}회.`, tone: "warn" });

  if (form.deliveryEnabled && result.deliveryNetSales > 0) {
    const deliveryRatio = (result.deliveryNetSales / result.totalSales) * 100;
    if (deliveryRatio > 40)
      items.push({ title: "배달 매출 과의존", body: `배달 매출 비중이 ${pct(deliveryRatio)}로 높습니다. 홀 매출 강화를 검토해보세요.`, tone: "warn" });
  }

  if (form.franchiseEnabled && result.royaltyCost > 0) {
    const royaltyRatio = (result.royaltyCost / result.totalSales) * 100;
    items.push({ title: "프랜차이즈 로열티", body: `월 로열티 ${fmt(result.royaltyCost)}원 (매출 대비 ${pct(royaltyRatio)}). 본사 지원 대비 적정성을 주기적으로 검토하세요.`, tone: royaltyRatio > 5 ? "warn" : "default" });
  }

  if (form.loanEnabled && result.monthlyLoanPayment > 0) {
    const loanBurden = result.cashFlow < 0
      ? "대출 상환 후 현금흐름이 마이너스입니다. 상환 기간 연장을 검토하세요."
      : `월 대출 상환액 ${fmt(result.monthlyLoanPayment)}원 반영 후 현금흐름 ${fmt(result.cashFlow)}원입니다.`;
    items.push({ title: "부채 상환 현황", body: loanBurden, tone: result.cashFlow < 0 ? "bad" : "default" });
  }

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

// ─── 히스토리 ───────────────────────────────────────────────────
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

// ─── 포맷 ───────────────────────────────────────────────────────
export const fmt = (n: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

export const pct = (n: number) => `${Number.isFinite(n) ? n.toFixed(1) : "0.0"}%`;
