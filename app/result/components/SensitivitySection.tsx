"use client";

import { useMemo, useState } from "react";
import {
  INDUSTRY_CONFIG, calcResult, fmt, pct,
  type FullForm,
} from "@/lib/vela";

export default function SensitivitySection({
  form, result,
}: {
  form: FullForm;
  result: ReturnType<typeof calcResult>;
}) {
  const config = INDUSTRY_CONFIG[form.industry];
  const [sensitivity, setSensitivity] = useState({ avgSpend: form.avgSpend, turnover: form.turnover, cogsRate: form.cogsRate });
  const simResult = useMemo(() => calcResult({ ...form, ...sensitivity }), [form, sensitivity]);
  const profitDiff = simResult.profit - result.profit;

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">민감도 분석</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">슬라이더를 조절해 수익 변화를 즉시 확인하세요.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          {[
            { key: "avgSpend" as const, label: "객단가", min: Math.round(form.avgSpend * 0.5), max: Math.round(form.avgSpend * 2), step: 100, suffix: "원" },
            { key: "turnover" as const, label: "회전율", min: 0.1, max: config.maxTurnover, step: 0.1, suffix: "회" },
            { key: "cogsRate" as const, label: "원가율", min: 5, max: 70, step: 0.5, suffix: "%" },
          ].map(({ key, label, min, max, step, suffix }) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{sensitivity[key]}{suffix}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={sensitivity[key]}
                onChange={(e) => setSensitivity(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                className="w-full accent-slate-900 dark:accent-slate-300"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>{min}{suffix}</span><span>{max}{suffix}</span>
              </div>
            </div>
          ))}
          <button
            onClick={() => setSensitivity({ avgSpend: form.avgSpend, turnover: form.turnover, cogsRate: form.cogsRate })}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
          >초기값으로 리셋</button>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-slate-700 p-5 gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">세전 순이익</p>
            <p className={`text-3xl font-bold mt-1 ${simResult.profit >= 0 ? "text-slate-900 dark:text-slate-100" : "text-red-500"}`}>{fmt(simResult.profit)}원</p>
            <p className={`text-sm font-semibold mt-1 ${profitDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {profitDiff >= 0 ? "▲" : "▼"} {fmt(Math.abs(profitDiff))}원 ({profitDiff >= 0 ? "+" : ""}{result.profit !== 0 ? ((profitDiff / Math.abs(result.profit)) * 100).toFixed(1) : "0"}%)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-400">세후 실수령</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{fmt(simResult.netProfit)}원</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-400">총 매출</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{fmt(simResult.totalSales)}원</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-400">손익분기점</p>
              <p className={`font-bold mt-0.5 ${simResult.bepGap >= 0 ? "text-emerald-600" : "text-red-500"}`}>{simResult.bepGap >= 0 ? "달성" : "미달"}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-800 p-3">
              <p className="text-xs text-slate-400">순이익률</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{pct(simResult.netMargin)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
