"use client";

import { useMemo } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";
import SimDataPicker from "@/components/SimDataPicker";
import type { SimulatorSnapshot } from "@/lib/useSimulatorData";
import { exportCSV } from "@/lib/exportCSV";
import { simulate, type SimInputs as Inputs } from "@/lib/simulate";

const KEY = "vela-financial-sim";
const fmt = (n: number) => n.toLocaleString("ko-KR");

const defaults: Inputs = { cash: 10000, initInvest: 5000, monthlyFixed: 500, variableRate: 35, firstRevenue: 800, growthRate: 5, targetRevenue: 2000 };

export default function FinancialSimPage() {
  const { data: inputs, update: setInputs, status, userId } = useCloudSync<Inputs>(KEY, defaults);

  const up = <K extends keyof Inputs>(k: K, v: number) => setInputs({ ...inputs, [k]: v });

  const simFields = (sim: SimulatorSnapshot) => [
    { key: "monthlyFixed", label: "월 고정비", value: `${Math.round((sim.rent + sim.totalSales * sim.laborRatio / 100) / 10000).toLocaleString()}만원`, rawValue: Math.round((sim.rent + sim.totalSales * sim.laborRatio / 100) / 10000) },
    { key: "variableRate", label: "변동비율", value: `${sim.cogsRatio}%`, rawValue: sim.cogsRatio },
    { key: "firstRevenue", label: "1개월차 매출", value: `${Math.round(sim.totalSales / 10000).toLocaleString()}만원`, rawValue: Math.round(sim.totalSales / 10000) },
    { key: "targetRevenue", label: "목표 월매출", value: `${Math.round(sim.totalSales / 10000).toLocaleString()}만원`, rawValue: Math.round(sim.totalSales / 10000) },
  ];
  const applySimSelected = (selected: Record<string, number | string>) => {
    setInputs({ ...inputs, ...(selected as Partial<Inputs>) });
  };

  const result = useMemo(() => simulate(inputs), [inputs]);
  const scenarios = useMemo(() => ({
    conservative: simulate(inputs, inputs.growthRate * 0.5),
    base: result,
    optimistic: simulate(inputs, inputs.growthRate * 1.5),
  }), [inputs, result]);

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white outline-none transition";
  const cardCls = "bg-white ring-1 ring-slate-200 rounded-3xl p-6 mb-4";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

  const avgMargin = result.totalRevenue > 0 ? Math.round(result.totalProfit / result.totalRevenue * 100) : 0;

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <Link href="/tools" className="text-xs text-slate-400 hover:text-slate-600 transition">← 도구 목록</Link>
          <div className="mt-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>📈</span> 재무 시뮬레이션
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">재무 시뮬레이션</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm">런웨이, 손익분기점, 현금 흐름을 시뮬레이션합니다.</p>
              <button
                onClick={() => exportCSV(
                  `재무시뮬레이션_${new Date().toISOString().slice(0, 10)}.csv`,
                  ["월", "매출", "고정비", "변동비", "순이익", "누적잔액"],
                  result.months.map(m => [`${m.month}월`, m.rev, m.fixed, m.variable, m.profit, m.balance])
                )}
                className="flex-shrink-0 text-xs text-slate-500 bg-white ring-1 ring-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
              >
                📥 CSV 내보내기
              </button>
              <CloudSyncBadge status={status} userId={userId} />
            </div>
            <SimDataPicker fields={simFields} onApply={applySimSelected} />
          </div>

          {/* 입력 */}
          <div className={cardCls}>
            <h3 className="font-bold text-slate-900 text-sm mb-4">⚙️ 시뮬레이션 조건</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ["cash", "보유 현금 (만원)"], ["initInvest", "초기 투자금 (만원)"],
                ["monthlyFixed", "월 고정비 (만원)"], ["variableRate", "변동비율 (%)"],
                ["firstRevenue", "1개월차 매출 (만원)"], ["growthRate", "월 성장률 (%)"],
                ["targetRevenue", "목표 월매출 (만원)"],
              ] as [keyof Inputs, string][]).map(([k, label]) => (
                <div key={k}>
                  <label className={labelCls}>{label}</label>
                  <input className={inputCls} inputMode="numeric" value={inputs[k] || ""}
                    onChange={e => up(k, Number(e.target.value.replace(/[^0-9]/g, "")))} />
                </div>
              ))}
            </div>
          </div>

          {/* 핵심 지표 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              ["🛫 런웨이", result.runwayMonth ? `${result.runwayMonth}개월` : "12개월+", result.runwayMonth ? "text-red-600" : "text-emerald-600"],
              ["📊 BEP 달성", result.bepMonth ? `${result.bepMonth}개월차` : "미달성", result.bepMonth ? "text-blue-600" : "text-amber-600"],
              ["💰 12개월 순이익", `${fmt(result.totalProfit)}만`, result.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"],
              ["📈 평균 순이익률", `${avgMargin}%`, avgMargin >= 10 ? "text-emerald-600" : "text-amber-600"],
            ].map(([label, value, color]) => (
              <div key={label as string} className="bg-white ring-1 ring-slate-200 rounded-2xl p-3 text-center">
                <p className="text-[11px] text-slate-500 mb-1">{label}</p>
                <p className={`text-sm font-extrabold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* 런웨이 - 12개월 캐시플로우 */}
          <div className={cardCls}>
            <h3 className="font-bold text-slate-900 text-sm mb-3">🛫 12개월 캐시플로우</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200">
                    <th className="py-2 text-left">월</th><th className="py-2 text-right">매출</th><th className="py-2 text-right">고정비</th>
                    <th className="py-2 text-right">변동비</th><th className="py-2 text-right">순이익</th><th className="py-2 text-right">누적잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {result.months.map(m => (
                    <tr key={m.month} className="border-b border-slate-50">
                      <td className="py-1.5 font-semibold text-slate-700">{m.month}월</td>
                      <td className="py-1.5 text-right">{fmt(m.rev)}</td>
                      <td className="py-1.5 text-right text-slate-400">{fmt(m.fixed)}</td>
                      <td className="py-1.5 text-right text-slate-400">{fmt(m.variable)}</td>
                      <td className={`py-1.5 text-right font-semibold ${m.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(m.profit)}</td>
                      <td className="py-1.5 text-right">
                        <span className={`font-bold ${m.balance >= 0 ? "text-slate-900" : "text-red-600"}`}>{fmt(m.balance)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BEP 분석 */}
          <div className={cardCls}>
            <h3 className="font-bold text-slate-900 text-sm mb-3">📊 손익분기점(BEP) 분석</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-500 mb-1">BEP 월매출</p>
                <p className="text-sm font-extrabold text-blue-600">{fmt(result.bepRevenue)}만원</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-500 mb-1">BEP 일매출</p>
                <p className="text-sm font-extrabold text-slate-700">{fmt(Math.round(result.bepRevenue / 30))}만원</p>
              </div>
            </div>
            {inputs.firstRevenue > 0 && result.bepRevenue > 0 && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>1개월차 매출 vs BEP</span>
                  <span>{Math.round(inputs.firstRevenue / result.bepRevenue * 100)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${inputs.firstRevenue >= result.bepRevenue ? "bg-emerald-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.min(100, inputs.firstRevenue / result.bepRevenue * 100)}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* 시나리오 비교 */}
          <div className={cardCls}>
            <h3 className="font-bold text-slate-900 text-sm mb-3">⚡ 시나리오 비교</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200">
                    <th className="py-2 text-left">항목</th>
                    <th className="py-2 text-right">🐢 보수적<br /><span className="font-normal">(성장률 {(inputs.growthRate * 0.5).toFixed(1)}%)</span></th>
                    <th className="py-2 text-right">📊 기본<br /><span className="font-normal">(성장률 {inputs.growthRate}%)</span></th>
                    <th className="py-2 text-right">🚀 낙관적<br /><span className="font-normal">(성장률 {(inputs.growthRate * 1.5).toFixed(1)}%)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["6개월 후 잔액", (s: ReturnType<typeof simulate>) => s.months[5]?.balance ?? 0],
                    ["12개월 후 잔액", (s: ReturnType<typeof simulate>) => s.finalBalance],
                    ["BEP 달성월", (s: ReturnType<typeof simulate>) => s.bepMonth],
                    ["투자 회수", (s: ReturnType<typeof simulate>) => s.paybackMonth],
                  ] as [string, (s: ReturnType<typeof simulate>) => number | null][]).map(([label, getter]) => (
                    <tr key={label} className="border-b border-slate-50">
                      <td className="py-2 font-semibold text-slate-700">{label}</td>
                      {([scenarios.conservative, scenarios.base, scenarios.optimistic] as const).map((sc, i) => {
                        const v = getter(sc);
                        const isMonth = label.includes("달성") || label.includes("회수");
                        return (
                          <td key={i} className={`py-2 text-right font-bold ${v === null ? "text-slate-400" : typeof v === "number" && v < 0 ? "text-red-500" : "text-slate-900"}`}>
                            {v === null ? "-" : isMonth ? `${v}개월` : `${fmt(v)}만`}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 투자 회수 */}
          <div className={cardCls}>
            <h3 className="font-bold text-slate-900 text-sm mb-3">🏆 핵심 요약</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["투자 회수 기간", result.paybackMonth ? `${result.paybackMonth}개월` : "12개월 내 미회수"],
                ["12개월 총매출", `${fmt(result.totalRevenue)}만원`],
                ["12개월 총순이익", `${fmt(result.totalProfit)}만원`],
                ["12개월 말 잔액", `${fmt(result.finalBalance)}만원`],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm font-extrabold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
