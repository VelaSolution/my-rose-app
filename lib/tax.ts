export interface TaxBracket {
  limit: number;
  rate: number;
  deduction: number;
}

/* 종합소득세 세율표 2024 */
export const INCOME_TAX_BRACKETS: TaxBracket[] = [
  { limit: 1400, rate: 0.06, deduction: 0 },
  { limit: 5000, rate: 0.15, deduction: 126 },
  { limit: 8800, rate: 0.24, deduction: 576 },
  { limit: 15000, rate: 0.35, deduction: 1544 },
  { limit: 30000, rate: 0.38, deduction: 1994 },
  { limit: 50000, rate: 0.40, deduction: 2594 },
  { limit: 100000, rate: 0.42, deduction: 3594 },
  { limit: Infinity, rate: 0.45, deduction: 6594 },
];

/* 법인세 세율표 2024 */
export const CORP_TAX_BRACKETS: TaxBracket[] = [
  { limit: 20000, rate: 0.09, deduction: 0 },
  { limit: 200000, rate: 0.19, deduction: 2000 },
  { limit: 300000, rate: 0.21, deduction: 6000 },
  { limit: Infinity, rate: 0.24, deduction: 15000 },
];

export function calcProgressiveTax(income: number, brackets: TaxBracket[]): number {
  for (const b of brackets) {
    if (income <= b.limit) return Math.max(0, Math.round(income * b.rate - b.deduction));
  }
  return 0;
}

export interface TaxComparison {
  personal: {
    incomeTax: number;
    localTax: number;
    healthIns: number;
    total: number;
  };
  corp: {
    corpTax: number;
    corpLocalTax: number;
    ceoIncomeTax: number;
    ceoLocalTax: number;
    ceo4Insurance: number;
    total: number;
  };
  saving: number;
}

export function compareTax(annualProfit: number, ceoSalary: number): TaxComparison {
  // 개인사업자
  const personalIncomeTax = calcProgressiveTax(annualProfit, INCOME_TAX_BRACKETS);
  const personalLocalTax = Math.round(personalIncomeTax * 0.1);
  const personalHealthIns = Math.max(0, Math.round(annualProfit * 0.0709));
  const personalTotal = personalIncomeTax + personalLocalTax + personalHealthIns;

  // 법인사업자
  const corpProfit = annualProfit - ceoSalary;
  const corpTax = calcProgressiveTax(Math.max(0, corpProfit), CORP_TAX_BRACKETS);
  const corpLocalTax = Math.round(corpTax * 0.1);
  const ceoIncomeTax = calcProgressiveTax(ceoSalary, INCOME_TAX_BRACKETS);
  const ceoLocalTax = Math.round(ceoIncomeTax * 0.1);
  const ceo4Insurance = Math.round(ceoSalary * 0.09);
  const corpTotal = corpTax + corpLocalTax + ceoIncomeTax + ceoLocalTax + ceo4Insurance;

  return {
    personal: { incomeTax: personalIncomeTax, localTax: personalLocalTax, healthIns: personalHealthIns, total: personalTotal },
    corp: { corpTax, corpLocalTax, ceoIncomeTax, ceoLocalTax, ceo4Insurance, total: corpTotal },
    saving: personalTotal - corpTotal,
  };
}
