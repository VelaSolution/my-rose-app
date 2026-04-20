"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import PlanGate from "@/components/PlanGate";
import CollapsibleTip from "@/components/CollapsibleTip";
import { fmt } from "@/lib/vela";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";

type SimHistory = { id: string; label: string; form: Record<string, number | string>; result: Record<string, number> };
type MonthSnap = { month: string; monthly_sales: number; rent: number; labor_cost: number; utilities: number; marketing: number; etc: number; cogs_rate: number; profit: number; industry: string };

function num(v: string) { const n = Number(v.replace(/,/g, "")); return isNaN(n) ? 0 : n; }
function pct(v: number, total: number) { return total > 0 ? ((v / total) * 100).toFixed(1) : "0.0"; }

type FormData = {
  storeName: string;
  industry: string;
  month: string;
  // 매출
  hallSales: string;
  deliverySales: string;
  // 매출원가
  cogsRate: string;
  // 판관비
  rent: string;
  laborCost: string;
  utilities: string;
  marketing: string;
  cardFee: string;
  deliveryFee: string;
  depreciation: string;
  etc: string;
  // 대출
  loanPayment: string;
  // 세금
  taxRate: string;
};

const DEFAULT: FormData = {
  storeName: "",
  industry: "cafe",
  month: new Date().toISOString().slice(0, 7),
  hallSales: "12000000",
  deliverySales: "2000000",
  cogsRate: "30",
  rent: "1500000",
  laborCost: "2800000",
  utilities: "300000",
  marketing: "200000",
  cardFee: "1.5",
  deliveryFee: "12",
  depreciation: "200000",
  etc: "150000",
  loanPayment: "300000",
  taxRate: "3.3",
};

const INDUSTRIES = ["카페", "일반 음식점", "고깃집", "술집/바", "파인다이닝", "기타"];

function InputRow({ label, value, onChange, suffix = "원", hint }: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-40 flex-shrink-0">
        <span className="text-sm text-slate-600">{label}</span>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <div className="relative flex-1 max-w-[180px]">
        <input
          type="text" inputMode="numeric" value={Number(value || 0).toLocaleString("ko-KR")}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-right pr-8 outline-none focus:border-blue-400 focus:bg-white transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

const IND_MAP: Record<string, string> = { cafe: "카페", restaurant: "일반 음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집" };

export default function PLReportPage() {
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [simList, setSimList] = useState<SimHistory[]>([]);
  const [monthList, setMonthList] = useState<MonthSnap[]>([]);

  const { data: cloudData, update: cloudUpdate, status: syncStatus, userId: syncUserId, error: syncError, retry: syncRetry } = useCloudSync<{ form: FormData }>("vela-pl-report", { form: DEFAULT });

  // Load from cloud on mount
  useEffect(() => {
    if (cloudData.form && cloudData.form.hallSales) {
      setForm(cloudData.form);
    }
  }, [cloudData]);

  // Save to cloud on change
  useEffect(() => {
    cloudUpdate({ form });
  }, [form, cloudUpdate]);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) return;
      sb.from("simulation_history").select("id,label,form,result")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
        .then(({ data }: { data: SimHistory[] | null }) => { if (data) setSimList(data); });
      sb.from("monthly_snapshots").select("*")
        .eq("user_id", user.id).order("month", { ascending: false }).limit(12)
        .then(({ data }: { data: MonthSnap[] | null }) => { if (data) setMonthList(data); });
    });
  }, []);

  const loadFromSim = (sim: SimHistory) => {
    const f = sim.form;
    const r = sim.result;
    const totalSales = Number(r.totalSales ?? 0);
    const deliverySales = Number(f.deliverySales ?? 0);
    setForm({
      ...DEFAULT,
      storeName: String(sim.label),
      industry: IND_MAP[String(f.industry)] ?? "카페",
      hallSales: String(totalSales - deliverySales),
      deliverySales: String(deliverySales),
      cogsRate: String(f.cogsRate ?? 30),
      rent: String(f.rent ?? 0),
      laborCost: String(f.labor ?? 0),
      utilities: String(Number(f.utilities ?? 0) + Number(f.telecom ?? 0)),
      marketing: String(f.marketing ?? 0),
      cardFee: String(f.cardFeeRate ?? 1.5),
      deliveryFee: String(f.deliveryAppRate ?? 12),
      etc: String(Number(f.supplies ?? 0) + Number(f.maintenance ?? 0) + Number(f.etc ?? 0)),
      loanPayment: f.loanEnabled ? String(Math.round(Number(f.loanAmount ?? 0) * (Number(f.loanInterestRate ?? 0) / 100 / 12) + Number(f.loanAmount ?? 0) / Number(f.loanTermMonths ?? 60))) : "0",
      taxRate: String(f.incomeTaxRate ?? 3.3),
    });
  };

  const loadFromMonth = (snap: MonthSnap) => {
    setForm({
      ...DEFAULT,
      industry: IND_MAP[snap.industry] ?? "카페",
      month: snap.month,
      hallSales: String(snap.monthly_sales),
      deliverySales: "0",
      cogsRate: String(snap.cogs_rate ?? 30),
      rent: String(snap.rent ?? 0),
      laborCost: String(snap.labor_cost ?? 0),
      utilities: String(snap.utilities ?? 0),
      marketing: String(snap.marketing ?? 0),
      etc: String(snap.etc ?? 0),
    });
  };

  const set = (key: keyof FormData) => (v: string) => {
    if (key === "industry" && v === "고깃집") {
      setForm(prev => ({ ...prev, [key]: v, cogsRate: prev.cogsRate === "30" ? "42" : prev.cogsRate }));
    } else {
      setForm(prev => ({ ...prev, [key]: v }));
    }
  };

  // ─── 계산 ────────────────────────────────────────────────────────────────────

  const hallSales = num(form.hallSales);
  const deliveryGross = num(form.deliverySales);
  const deliveryFeeAmt = deliveryGross * (num(form.deliveryFee) / 100);
  const deliveryNet = deliveryGross - deliveryFeeAmt;
  const totalSales = hallSales + deliveryNet;

  const cogs = totalSales * (num(form.cogsRate) / 100);
  const grossProfit = totalSales - cogs;

  const rent = num(form.rent);
  const labor = num(form.laborCost);
  const utilities = num(form.utilities);
  const marketing = num(form.marketing);
  const cardFeeAmt = totalSales * (num(form.cardFee) / 100);
  const depreciation = num(form.depreciation);
  const etc = num(form.etc);
  const totalOpex = rent + labor + utilities + marketing + cardFeeAmt + depreciation + etc;

  const operatingProfit = grossProfit - totalOpex;
  const loanPayment = num(form.loanPayment);
  const ebt = operatingProfit - loanPayment;
  const tax = Math.max(0, ebt * (num(form.taxRate) / 100));
  const netProfit = ebt - tax;
  const _cashFlow = netProfit; // simplified

  const profitColor = netProfit >= 0 ? "#059669" : "#EF4444";

  // ─── 인쇄 ────────────────────────────────────────────────────────────────────

  const handlePrint = () => window.print();

  const monthLabel = form.month
    ? `${form.month.slice(0, 4)}년 ${parseInt(form.month.slice(5, 7))}월`
    : "";

  return (
    <>
      <style>{`
        @media print {
          .no-print{display:none!important}
          .print-page{background:white!important;padding:40px!important;max-width:100%!important}
          body{background:white!important}
          .print-shadow{box-shadow:none!important;border:1px solid #e5e7eb!important}
        }
      `}</style>
      <ToolNav />
      <PlanGate>
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-5xl">
          {/* 헤더 */}
          <div className="no-print flex items-center gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>
          </div>

          <div className="no-print mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>📄</span> 손익계산서
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">손익계산서 PDF 출력</h1>
              <CloudSyncBadge status={syncStatus} userId={syncUserId} onRetry={syncRetry} />
            {syncError && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-100 text-sm">
                <span className="text-red-500">⚠️</span>
                <div className="flex-1"><p className="font-semibold text-red-700">클라우드 동기화 실패</p><p className="text-red-500 text-xs">데이터는 로컬에 저장되었습니다</p></div>
                <button onClick={syncRetry} className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition">재시도</button>
              </div>
            )}
            </div>
            <p className="text-slate-500 text-sm">수익 데이터를 입력하면 정식 손익계산서 형식으로 PDF 출력이 가능합니다.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 입력 패널 */}
            <div className="no-print space-y-4">
              {/* 데이터 불러오기 */}
              {(simList.length > 0 || monthList.length > 0) && (
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h2 className="font-bold text-slate-900 mb-3">📂 데이터 불러오기</h2>
                  <p className="text-xs text-slate-500 mb-4">저장된 데이터를 선택하면 자동으로 입력됩니다.</p>
                  {simList.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">시뮬레이터 기록</label>
                      <select
                        defaultValue=""
                        onChange={(e) => { const s = simList.find((x) => x.id === e.target.value); if (s) loadFromSim(s); }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400"
                      >
                        <option value="" disabled>시뮬레이션 결과 선택...</option>
                        {simList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label} — 매출 {fmt(Number(s.result.totalSales ?? 0))}원
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {monthList.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">월별 매출 기록</label>
                      <select
                        defaultValue=""
                        onChange={(e) => { const m = monthList.find((x) => x.month === e.target.value); if (m) loadFromMonth(m); }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400"
                      >
                        <option value="" disabled>월별 매출 선택...</option>
                        {monthList.map((m) => (
                          <option key={m.month} value={m.month}>
                            {m.month} — 매출 {fmt(m.monthly_sales)}원 / 순이익 {fmt(m.profit)}원
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              {/* 기본 정보 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-4">기본 정보</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">매장명</label>
                    <input type="text" value={form.storeName} onChange={(e) => set("storeName")(e.target.value)}
                      placeholder="예) 카페 베이글"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">업종</label>
                      <select value={form.industry} onChange={(e) => set("industry")(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400">
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">기준 월</label>
                      <input type="month" value={form.month} onChange={(e) => set("month")(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 매출 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-3">Ⅰ. 매출</h2>
                <InputRow label="홀 매출" value={form.hallSales} onChange={set("hallSales")} />
                <InputRow label="배달 매출 (총)" value={form.deliverySales} onChange={set("deliverySales")} />
                <InputRow label="배달 수수료율" value={form.deliveryFee} onChange={set("deliveryFee")} suffix="%" hint="배민 약 9.8~15%" />
                <InputRow label="원가율" value={form.cogsRate} onChange={set("cogsRate")} suffix="%" />
              </div>

              {/* 판관비 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-3">Ⅱ. 판매관리비</h2>
                <InputRow label="임대료" value={form.rent} onChange={set("rent")} />
                <InputRow label="인건비 (4대보험 포함)" value={form.laborCost} onChange={set("laborCost")} />
                <InputRow label="공과금" value={form.utilities} onChange={set("utilities")} />
                <InputRow label="마케팅비" value={form.marketing} onChange={set("marketing")} />
                <InputRow label="카드수수료율" value={form.cardFee} onChange={set("cardFee")} suffix="%" hint="약 1.0~2.3%" />
                <InputRow label="감가상각비" value={form.depreciation} onChange={set("depreciation")} />
                <InputRow label="기타 비용" value={form.etc} onChange={set("etc")} />
              </div>

              {/* 기타 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-3">Ⅲ. 기타</h2>
                <InputRow label="대출 월 상환액" value={form.loanPayment} onChange={set("loanPayment")} />
                <InputRow label="소득세율" value={form.taxRate} onChange={set("taxRate")} suffix="%" hint="3.3% (원천징수 기준)" />
              </div>

              <button
                onClick={handlePrint}
                className="w-full rounded-3xl bg-slate-900 py-4 text-sm font-bold text-white hover:bg-slate-700 transition flex items-center justify-center gap-2"
              >
                🖨️ PDF로 출력하기
              </button>
            </div>

            {/* 손익계산서 미리보기 */}
            <div>
              <div className="print-page rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 print-shadow p-8 sticky top-24">
                {/* 리포트 헤더 */}
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                  <p className="text-xs text-slate-500 mb-1">손 익 계 산 서</p>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {form.storeName || "매장명 미입력"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{monthLabel} 기준</p>
                  <p className="text-xs text-slate-400 mt-0.5">업종: {form.industry}</p>
                </div>

                {/* 손익 항목 */}
                <div className="space-y-1 text-sm">
                  {/* 매출 */}
                  <div className="flex justify-between font-bold text-slate-900 py-1">
                    <span>Ⅰ. 매출액</span>
                    <span>{fmt(totalSales)}원</span>
                  </div>
                  <div className="flex justify-between text-slate-500 pl-4 py-0.5">
                    <span>홀 매출</span><span>{fmt(hallSales)}원</span>
                  </div>
                  <div className="flex justify-between text-slate-500 pl-4 py-0.5">
                    <span>배달 순매출</span><span>{fmt(deliveryNet)}원</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pl-6 py-0.5 text-xs">
                    <span>배달 수수료 공제</span><span>-{fmt(Math.round(deliveryFeeAmt))}원</span>
                  </div>

                  <div className="border-t border-slate-100 my-2" />

                  {/* 매출원가 */}
                  <div className="flex justify-between font-bold text-slate-900 py-1">
                    <span>Ⅱ. 매출원가 ({form.cogsRate}%)</span>
                    <span className="text-red-500">-{fmt(Math.round(cogs))}원</span>
                  </div>

                  <div className="flex justify-between font-semibold text-emerald-700 py-1 bg-emerald-50 rounded-xl px-3 -mx-3">
                    <span>매출총이익</span>
                    <span>{fmt(Math.round(grossProfit))}원 ({pct(grossProfit, totalSales)}%)</span>
                  </div>

                  <div className="border-t border-slate-100 my-2" />

                  {/* 판관비 */}
                  <div className="flex justify-between font-bold text-slate-900 py-1">
                    <span>Ⅲ. 판매관리비</span>
                    <span className="text-red-500">-{fmt(Math.round(totalOpex))}원</span>
                  </div>
                  {[
                    ["임대료", rent],
                    ["인건비", labor],
                    ["공과금", utilities],
                    ["마케팅비", marketing],
                    ["카드수수료", cardFeeAmt],
                    ["감가상각비", depreciation],
                    ["기타", etc],
                  ].filter(([, v]) => (v as number) > 0).map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-slate-500 pl-4 py-0.5">
                      <span>{label as string}</span>
                      <span>{fmt(Math.round(value as number))}원 ({pct(value as number, totalSales)}%)</span>
                    </div>
                  ))}

                  <div className="flex justify-between font-semibold text-blue-700 py-1 bg-blue-50 rounded-xl px-3 -mx-3">
                    <span>영업이익</span>
                    <span>{fmt(Math.round(operatingProfit))}원 ({pct(operatingProfit, totalSales)}%)</span>
                  </div>

                  <div className="border-t border-slate-100 my-2" />

                  {/* 영업외 */}
                  {loanPayment > 0 && (
                    <>
                      <div className="flex justify-between text-slate-500 pl-4 py-0.5">
                        <span>대출 상환액</span><span className="text-red-500">-{fmt(loanPayment)}원</span>
                      </div>
                    </>
                  )}

                  {/* 법인세차감전 */}
                  <div className="flex justify-between font-bold text-slate-900 py-1">
                    <span>Ⅳ. 세전이익</span>
                    <span style={{ color: ebt >= 0 ? "#1e293b" : "#ef4444" }}>{fmt(Math.round(ebt))}원</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between text-slate-500 pl-4 py-0.5">
                      <span>소득세 ({form.taxRate}%)</span><span className="text-red-500">-{fmt(Math.round(tax))}원</span>
                    </div>
                  )}

                  <div className="border-t-2 border-slate-900 my-3" />

                  {/* 당기순이익 */}
                  <div className="flex justify-between font-extrabold text-base py-2 rounded-2xl px-4 -mx-4" style={{ background: `${profitColor}10` }}>
                    <span style={{ color: profitColor }}>당기순이익</span>
                    <span style={{ color: profitColor }}>{fmt(Math.round(netProfit))}원</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-xs px-1 py-0.5">
                    <span>순이익률</span>
                    <span>{pct(netProfit, totalSales)}%</span>
                  </div>
                </div>

                {/* 푸터 */}
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
                  <p>본 손익계산서는 VELA 수익 분석 도구로 작성된 추정치입니다.</p>
                  <p className="mt-0.5">정확한 재무제표는 공인 세무사의 확인이 필요합니다.</p>
                  <p className="mt-1 font-semibold text-slate-500">VELA. — vela.kr</p>
                </div>
              </div>
            </div>
          </div>

          <CollapsibleTip className="no-print mt-6">
            출력 시 브라우저 인쇄 대화상자에서 &ldquo;PDF로 저장&rdquo;을 선택하세요. 배경 그래픽 옵션을 켜면 색상이 더 잘 표현됩니다.
          </CollapsibleTip>
        </div>
      </main>
      </PlanGate>
    </>
  );
}
