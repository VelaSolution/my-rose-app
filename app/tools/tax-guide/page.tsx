"use client";

import { useState } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import SimDataPicker from "@/components/SimDataPicker";
import type { SimulatorSnapshot } from "@/lib/useSimulatorData";

const TABS = ["세금 캘린더", "부가세", "종합소득세", "4대보험", "절세 전략"] as const;
type Tab = (typeof TABS)[number];
const fmt = (n: number) => n.toLocaleString("ko-KR");

const TAX_CALENDAR = [
  { month: 1, items: [{ name: "부가세 확정신고·납부", due: "1/25", target: "공통", desc: "전년 하반기 부가가치세 신고", penalty: "무신고 가산세 20%, 납부불성실 가산세 연 8.03%" }] },
  { month: 2, items: [{ name: "사업장현황신고", due: "2/10", target: "면세사업자", desc: "면세사업자 전년도 수입금액 신고", penalty: "수입금액의 0.5% 가산세" }] },
  { month: 3, items: [{ name: "법인세 신고·납부", due: "3/31", target: "법인", desc: "12월 결산법인 법인세 신고", penalty: "무신고 20%, 과소신고 10%" }] },
  { month: 4, items: [{ name: "부가세 예정신고", due: "4/25", target: "법인", desc: "1분기 부가세 예정신고 (개인은 고지납부)", penalty: "예정신고 미이행 시 가산세" }] },
  { month: 5, items: [
    { name: "종합소득세 확정신고", due: "5/31", target: "개인", desc: "전년도 종합소득에 대한 소득세 신고. 외식업 사장님 가장 중요한 세금!", penalty: "무신고 20%, 납부불성실 연 8.03%" },
    { name: "개인지방소득세", due: "5/31", target: "개인", desc: "소득세의 10%를 지방자치단체에 신고·납부", penalty: "소득세 가산세와 동일 기준" },
  ] },
  { month: 6, items: [{ name: "성실신고 확인대상 소득세", due: "6/30", target: "개인", desc: "수입금액 일정 규모 이상 사업자 (외식업 7.5억 이상)", penalty: "무신고 시 추가 가산세" }] },
  { month: 7, items: [
    { name: "부가세 확정신고·납부", due: "7/25", target: "공통", desc: "상반기 부가가치세 신고·납부", penalty: "무신고 20%, 납부불성실 연 8.03%" },
    { name: "재산세 1기", due: "7/31", target: "건물주", desc: "건물·토지 재산세 1기분 납부", penalty: "3% 가산금" },
  ] },
  { month: 8, items: [{ name: "주민세 사업소분", due: "8/31", target: "공통", desc: "사업소 소재지 기준 주민세 납부 (기본 5~20만원)", penalty: "3% 가산금" }] },
  { month: 9, items: [{ name: "재산세 2기", due: "9/30", target: "건물주", desc: "재산세 2기분 납부", penalty: "3% 가산금" }] },
  { month: 10, items: [{ name: "부가세 예정신고", due: "10/25", target: "법인", desc: "3분기 부가세 예정신고", penalty: "예정신고 미이행 시 가산세" }] },
  { month: 11, items: [{ name: "종합소득세 중간예납", due: "11/30", target: "개인", desc: "직전 소득세의 1/2 중간예납 (고지서 발송)", penalty: "미납 시 가산금 3%" }] },
  { month: 12, items: [{ name: "연말정산 준비", due: "12/31", target: "공통", desc: "직원 연말정산 자료 수집 시작. 의료비·교육비·기부금 영수증 정리", penalty: "-" }] },
];

/* 소득세 세율표 */
const INCOME_BRACKETS = [
  { limit: 1400, rate: 6, deduction: 0 },
  { limit: 5000, rate: 15, deduction: 126 },
  { limit: 8800, rate: 24, deduction: 576 },
  { limit: 15000, rate: 35, deduction: 1544 },
  { limit: 30000, rate: 38, deduction: 1994 },
  { limit: 50000, rate: 40, deduction: 2594 },
  { limit: 100000, rate: 42, deduction: 3594 },
  { limit: Infinity, rate: 45, deduction: 6594 },
];

const EXPENSE_RATES = [
  { code: "한식 일반 (552101)", simple: 91.8, standard: 18.7 },
  { code: "중식 (552102)", simple: 90.5, standard: 17.8 },
  { code: "일식 (552103)", simple: 89.2, standard: 16.5 },
  { code: "양식 (552104)", simple: 88.6, standard: 15.9 },
  { code: "카페 (552304)", simple: 88.4, standard: 15.2 },
  { code: "주점 (552201)", simple: 90.1, standard: 20.1 },
  { code: "치킨전문점 (552105)", simple: 92.3, standard: 19.2 },
  { code: "분식 (552106)", simple: 91.5, standard: 18.1 },
  { code: "고깃집 (552107)", simple: 91.0, standard: 18.5 },
];

const INSURANCE_RATES = [
  { name: "국민연금", employer: 4.5, employee: 4.5 },
  { name: "건강보험", employer: 3.545, employee: 3.545 },
  { name: "장기요양보험", employer: 0.454, employee: 0.454 },
  { name: "고용보험", employer: 0.9, employee: 0.9 },
  { name: "산재보험", employer: 1.0, employee: 0 },
];

const TAX_TIPS = [
  { title: "매입 증빙 철저히 챙기기", desc: "모든 식재료, 소모품 구매 시 세금계산서·카드·현금영수증 수취. 3만원 이상 적격증빙 없으면 2% 가산세. 재래시장도 카드 결제 습관화." },
  { title: "간편장부 vs 복식부기 선택", desc: "연 매출 7,500만원 미만은 간편장부 가능. 복식부기 작성 시 20% 세액공제 혜택(최대 100만원). 세무사 기장료(월 10~20만원) 대비 절세 효과 비교." },
  { title: "감가상각비 활용", desc: "인테리어(5년), 주방기기(5년), 냉장고(5년), 에어컨(5년) 등 내용연수에 따라 매년 비용 처리. 초기 투자가 클수록 효과 큼." },
  { title: "가족 직원 급여 처리", desc: "배우자·가족을 직원으로 등록하면 급여가 비용으로 인정. 실제 근무해야 하며, 4대보험 가입 필수. 시급제 가능." },
  { title: "사업용 차량 비용 처리", desc: "사업용으로 등록하면 보험료·유류비·수리비·감가상각 경비 인정. 차량운행일지 작성 필요. 연 1,500만원 한도." },
  { title: "노란우산공제 가입", desc: "소기업·소상공인 퇴직금 적립 제도. 연 소득공제 최대 500만원 (소득 4천만 이하). 폐업 시 목돈 수령." },
  { title: "중소기업 특별세액감면", desc: "음식업 포함 소기업은 소득세 5~30% 감면 (수도권 10%, 비수도권 30%). 창업 후 5년간 적용." },
  { title: "성실신고확인제도 활용", desc: "성실신고 확인 대상(외식업 7.5억 이상)이면 세무대리인 확인 후 신고. 의료비·교육비·월세 세액공제 추가 적용." },
  { title: "적격증빙 3만원 룰", desc: "건당 3만원 이상 거래는 세금계산서·카드·현금영수증 중 하나 필수. 미수취 시 2% 가산세 + 비용 불인정 위험." },
  { title: "세무사 기장 vs 자가 기장", desc: "월 기장료 10~20만원이지만, 절세 효과·시간 절약 고려하면 투자 대비 효과 큼. 매출 5천만원 이상이면 세무사 기장 권장." },
];

export default function TaxGuidePage() {
  const [tab, setTab] = useState<Tab>("세금 캘린더");
  const [expanded, setExpanded] = useState<string | null>(null);

  const simFields = (sim: SimulatorSnapshot) => [
    { key: "vatSales", label: "월 매출 (부가세용)", value: `${Math.round(sim.totalSales / 10000).toLocaleString()}만원`, rawValue: Math.round(sim.totalSales / 10000) },
    { key: "vatPurchase", label: "월 매입 (부가세용)", value: `${Math.round(sim.totalSales * sim.cogsRatio / 100 / 10000).toLocaleString()}만원`, rawValue: Math.round(sim.totalSales * sim.cogsRatio / 100 / 10000) },
    { key: "revenue", label: "연 매출 (소득세용)", value: `${Math.round(sim.totalSales * 12 / 10000).toLocaleString()}만원`, rawValue: Math.round(sim.totalSales * 12 / 10000) },
  ];
  const applySimSelected = (selected: Record<string, number | string>) => {
    if (selected.vatSales !== undefined) setVatSales(selected.vatSales as number);
    if (selected.vatPurchase !== undefined) setVatPurchase(selected.vatPurchase as number);
    if (selected.revenue !== undefined) setRevenue(selected.revenue as number);
  };
  // 부가세 계산기
  const [vatType, setVatType] = useState<"일반" | "간이">("일반");
  const [vatSales, setVatSales] = useState(0);
  const [vatPurchase, setVatPurchase] = useState(0);
  // 소득세 계산기
  const [revenue, setRevenue] = useState(0);
  const [expenseMethod, setExpenseMethod] = useState<"simple" | "standard">("simple");
  const [expenseRateIdx, setExpenseRateIdx] = useState(0);
  // 4대보험 계산기
  const [empCount, setEmpCount] = useState(3);
  const [avgSalary, setAvgSalary] = useState(250);

  const currentMonth = new Date().getMonth(); // 0-indexed
  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white outline-none transition";
  const cardCls = "bg-white ring-1 ring-slate-200 rounded-3xl p-6 mb-4";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

  // 부가세 계산
  const vatCalc = (() => {
    if (vatType === "일반") {
      const salesTax = Math.round(vatSales / 11);
      const purchaseTax = Math.round(vatPurchase / 11);
      return { salesTax, purchaseTax, payable: salesTax - purchaseTax };
    }
    // 간이: 업종별 부가가치율 적용 (음식업 15%)
    const tax = Math.round(vatSales * 0.15 * 0.1);
    const purchaseCredit = Math.round(vatPurchase * 0.005);
    return { salesTax: tax, purchaseTax: purchaseCredit, payable: tax - purchaseCredit };
  })();

  // 소득세 계산
  const incomeCalc = (() => {
    const rate = EXPENSE_RATES[expenseRateIdx];
    const expRate = expenseMethod === "simple" ? rate.simple / 100 : rate.standard / 100;
    const taxableIncome = expenseMethod === "simple"
      ? Math.round(revenue * (1 - expRate))
      : Math.round(revenue - revenue * expRate); // 기준경비율은 주요경비 별도이나 간이 계산
    let incomeTax = 0;
    for (const b of INCOME_BRACKETS) {
      if (taxableIncome <= b.limit) { incomeTax = Math.round(taxableIncome * b.rate / 100 - b.deduction); break; }
    }
    return { taxableIncome: Math.max(0, taxableIncome), incomeTax: Math.max(0, incomeTax), localTax: Math.max(0, Math.round(incomeTax * 0.1)) };
  })();

  // 4대보험 계산
  const insCalc = (() => {
    const totalEmployer = INSURANCE_RATES.reduce((s, r) => s + avgSalary * r.employer / 100, 0);
    const totalEmployee = INSURANCE_RATES.reduce((s, r) => s + avgSalary * r.employee / 100, 0);
    return {
      perEmployee: Math.round(totalEmployer),
      totalEmployer: Math.round(totalEmployer * empCount),
      totalEmployee: Math.round(totalEmployee * empCount),
    };
  })();

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-3xl">
          <Link href="/tools" className="text-xs text-slate-400 hover:text-slate-600 transition">← 도구 목록</Link>
          <div className="mt-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>🧾</span> 세무·회계 가이드
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">세무·회계 가이드</h1>
            <p className="text-slate-500 text-sm">외식업 사장님을 위한 세금·회계 실무 가이드</p>
            <SimDataPicker fields={simFields} onApply={applySimSelected} />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* 세금 캘린더 */}
          {tab === "세금 캘린더" && (
            <div className="space-y-3">
              {TAX_CALENDAR.map(cal => (
                <div key={cal.month} className={`${cardCls} ${cal.month - 1 === currentMonth ? "ring-2 ring-orange-400" : ""}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-sm font-extrabold ${cal.month - 1 === currentMonth ? "text-orange-600" : "text-slate-900"}`}>{cal.month}월</span>
                    {cal.month - 1 === currentMonth && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-600">이번 달</span>}
                  </div>
                  {cal.items.map(item => (
                    <div key={item.name} className="py-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-900">{item.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.target === "개인" ? "bg-blue-50 text-blue-600" : item.target === "법인" ? "bg-purple-50 text-purple-600" : "bg-slate-100 text-slate-600"}`}>{item.target}</span>
                        <span className="text-xs text-red-500 font-semibold ml-auto">~ {item.due}</span>
                      </div>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                      {item.penalty !== "-" && <p className="text-[11px] text-red-400 mt-0.5">⚠️ {item.penalty}</p>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* 부가세 */}
          {tab === "부가세" && (
            <>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">📊 간이과세 vs 일반과세</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-400"><th className="py-2 text-left">항목</th><th className="py-2 text-right">간이과세자</th><th className="py-2 text-right">일반과세자</th></tr></thead>
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-50"><td className="py-2">기준</td><td className="py-2 text-right">연 매출 8,000만원 미만</td><td className="py-2 text-right">연 매출 8,000만원 이상</td></tr>
                      <tr className="border-b border-slate-50"><td className="py-2">세율</td><td className="py-2 text-right">1.5~4% (업종별)</td><td className="py-2 text-right">10%</td></tr>
                      <tr className="border-b border-slate-50"><td className="py-2">세금계산서</td><td className="py-2 text-right">발행 불가 (4,800만 미만)</td><td className="py-2 text-right">발행 의무</td></tr>
                      <tr className="border-b border-slate-50"><td className="py-2">매입세액공제</td><td className="py-2 text-right">업종별 공제율 적용</td><td className="py-2 text-right">전액 공제</td></tr>
                      <tr><td className="py-2">신고 횟수</td><td className="py-2 text-right">연 1회 (1월)</td><td className="py-2 text-right">연 2회 (1월, 7월)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">🧮 부가세 계산기</h3>
                <div className="flex gap-2 mb-4">
                  {(["일반", "간이"] as const).map(t => (
                    <button key={t} onClick={() => setVatType(t)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${vatType === t ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>{t}과세자</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className={labelCls}>매출액 (만원)</label><input className={inputCls} inputMode="numeric" value={vatSales || ""} onChange={e => setVatSales(Number(e.target.value.replace(/[^0-9]/g, "")))} /></div>
                  <div><label className={labelCls}>매입액 (만원)</label><input className={inputCls} inputMode="numeric" value={vatPurchase || ""} onChange={e => setVatPurchase(Number(e.target.value.replace(/[^0-9]/g, "")))} /></div>
                </div>
                {vatSales > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">매출세액</p><p className="font-bold text-blue-600">{fmt(vatCalc.salesTax)}만</p></div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">매입세액</p><p className="font-bold text-emerald-600">{fmt(vatCalc.purchaseTax)}만</p></div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">납부세액</p><p className="font-bold text-orange-600">{fmt(vatCalc.payable)}만</p></div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 종합소득세 */}
          {tab === "종합소득세" && (
            <>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">📊 2024 종합소득세 세율표</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-400"><th className="py-2 text-left">과세표준</th><th className="py-2 text-right">세율</th><th className="py-2 text-right">누진공제</th></tr></thead>
                    <tbody className="text-slate-700">
                      {INCOME_BRACKETS.map(b => (
                        <tr key={b.rate} className="border-b border-slate-50">
                          <td className="py-1.5">{b.limit === Infinity ? "10억 초과" : `${fmt(b.limit)}만원 이하`}</td>
                          <td className="py-1.5 text-right font-bold">{b.rate}%</td>
                          <td className="py-1.5 text-right">{fmt(b.deduction)}만원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">🧮 소득세 간이 계산기</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div><label className={labelCls}>연 매출 (만원)</label><input className={inputCls} inputMode="numeric" value={revenue || ""} onChange={e => setRevenue(Number(e.target.value.replace(/[^0-9]/g, "")))} /></div>
                  <div>
                    <label className={labelCls}>업종</label>
                    <select className={inputCls} value={expenseRateIdx} onChange={e => setExpenseRateIdx(Number(e.target.value))}>
                      {EXPENSE_RATES.map((r, i) => <option key={i} value={i}>{r.code}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  {(["simple", "standard"] as const).map(m => (
                    <button key={m} onClick={() => setExpenseMethod(m)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${expenseMethod === m ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {m === "simple" ? `단순경비율 (${EXPENSE_RATES[expenseRateIdx].simple}%)` : `기준경비율 (${EXPENSE_RATES[expenseRateIdx].standard}%)`}
                    </button>
                  ))}
                </div>
                {revenue > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">과세표준</p><p className="font-bold text-slate-700">{fmt(incomeCalc.taxableIncome)}만</p></div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">소득세</p><p className="font-bold text-orange-600">{fmt(incomeCalc.incomeTax)}만</p></div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">지방소득세</p><p className="font-bold text-amber-600">{fmt(incomeCalc.localTax)}만</p></div>
                  </div>
                )}
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">📋 업종별 경비율 참고</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-400"><th className="py-2 text-left">업종</th><th className="py-2 text-right">단순경비율</th><th className="py-2 text-right">기준경비율</th></tr></thead>
                    <tbody>{EXPENSE_RATES.map(r => (
                      <tr key={r.code} className="border-b border-slate-50 text-slate-700"><td className="py-1.5">{r.code}</td><td className="py-1.5 text-right">{r.simple}%</td><td className="py-1.5 text-right">{r.standard}%</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 4대보험 */}
          {tab === "4대보험" && (
            <>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">📊 4대보험 요율표 (2024)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-400"><th className="py-2 text-left">보험</th><th className="py-2 text-right">사업주</th><th className="py-2 text-right">근로자</th><th className="py-2 text-right">합계</th></tr></thead>
                    <tbody>
                      {INSURANCE_RATES.map(r => (
                        <tr key={r.name} className="border-b border-slate-50 text-slate-700">
                          <td className="py-1.5 font-semibold">{r.name}</td>
                          <td className="py-1.5 text-right">{r.employer}%</td>
                          <td className="py-1.5 text-right">{r.employee > 0 ? `${r.employee}%` : "-"}</td>
                          <td className="py-1.5 text-right font-bold">{(r.employer + r.employee).toFixed(2)}%</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                        <td className="py-1.5">합계</td>
                        <td className="py-1.5 text-right">{INSURANCE_RATES.reduce((s, r) => s + r.employer, 0).toFixed(2)}%</td>
                        <td className="py-1.5 text-right">{INSURANCE_RATES.reduce((s, r) => s + r.employee, 0).toFixed(2)}%</td>
                        <td className="py-1.5 text-right">{INSURANCE_RATES.reduce((s, r) => s + r.employer + r.employee, 0).toFixed(2)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">🧮 4대보험 계산기</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className={labelCls}>직원 수</label><input className={inputCls} inputMode="numeric" value={empCount || ""} onChange={e => setEmpCount(Number(e.target.value.replace(/[^0-9]/g, "")))} /></div>
                  <div><label className={labelCls}>평균 월급여 (만원)</label><input className={inputCls} inputMode="numeric" value={avgSalary || ""} onChange={e => setAvgSalary(Number(e.target.value.replace(/[^0-9]/g, "")))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">1인당 사업주 부담</p><p className="font-bold text-blue-600">{fmt(insCalc.perEmployee)}만/월</p></div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">사업주 총 부담</p><p className="font-bold text-orange-600">{fmt(insCalc.totalEmployer)}만/월</p></div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-[11px] text-slate-500">연간 사업주 부담</p><p className="font-bold text-slate-700">{fmt(insCalc.totalEmployer * 12)}만/년</p></div>
                </div>
              </div>
            </>
          )}

          {/* 절세 전략 */}
          {tab === "절세 전략" && (
            <div className="space-y-3">
              {TAX_TIPS.map((tip, i) => (
                <div key={i} className={cardCls}>
                  <button onClick={() => setExpanded(expanded === tip.title ? null : tip.title)} className="w-full text-left flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 font-extrabold text-sm flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="font-bold text-sm text-slate-900 flex-1">{tip.title}</span>
                    <span className="text-slate-400 text-xs">{expanded === tip.title ? "▲" : "▼"}</span>
                  </button>
                  {expanded === tip.title && (
                    <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">{tip.desc}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
