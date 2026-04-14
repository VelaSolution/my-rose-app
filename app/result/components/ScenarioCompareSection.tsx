"use client";

import { useMemo, useState } from "react";
import {
  INDUSTRY_CONFIG, calcResult, fmt, pct,
  type FullForm,
} from "@/lib/vela";

function SliderGroup({ values, onChange, label, form }: {
  values: { avgSpend: number; turnover: number; cogsRate: number };
  onChange: (v: { avgSpend: number; turnover: number; cogsRate: number }) => void;
  label: string;
  form: FullForm;
}) {
  const config = INDUSTRY_CONFIG[form.industry];
  return (
    <div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{label}</p>
      {[
        { key: "avgSpend" as const, lbl: "객단가", suffix: "원", step: 100, min: Math.round(form.avgSpend * 0.5), max: Math.round(form.avgSpend * 2) },
        { key: "turnover" as const, lbl: "회전율", suffix: "회", step: 0.1, min: 0.1, max: config.maxTurnover },
        { key: "cogsRate" as const, lbl: "원가율", suffix: "%", step: 0.5, min: 5, max: 70 },
      ].map(({ key, lbl, suffix, step, min, max }) => (
        <div key={key} className="mb-2">
          <div className="flex justify-between text-xs mb-1"><span className="text-slate-500 dark:text-slate-400">{lbl}</span><span className="font-bold text-slate-800 dark:text-slate-200">{values[key]}{suffix}</span></div>
          <input type="range" min={min} max={max} step={step} value={values[key]} onChange={(e) => onChange({ ...values, [key]: Number(e.target.value) })} className="w-full accent-slate-900 dark:accent-slate-300" style={{ height: 4 }} />
        </div>
      ))}
    </div>
  );
}

export default function ScenarioCompareSection({ form }: { form: FullForm }) {
  const [scenarioA, setScenarioA] = useState({ avgSpend: form.avgSpend, turnover: form.turnover, cogsRate: form.cogsRate });
  const [scenarioB, setScenarioB] = useState({ avgSpend: Math.round(form.avgSpend * 1.15), turnover: Math.round((form.turnover + 0.5) * 10) / 10, cogsRate: Math.round((form.cogsRate - 3) * 10) / 10 });
  const resultA = useMemo(() => calcResult({ ...form, ...scenarioA }), [form, scenarioA]);
  const resultB = useMemo(() => calcResult({ ...form, ...scenarioB }), [form, scenarioB]);
  const fields = [
    { label: "월 매출", a: resultA.totalSales, b: resultB.totalSales },
    { label: "세전 순이익", a: resultA.profit, b: resultB.profit },
    { label: "세후 실수령", a: resultA.netProfit, b: resultB.netProfit },
    { label: "순이익률", a: resultA.netMargin, b: resultB.netMargin, isPct: true },
  ];

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">A vs B 시나리오 비교</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">두 가지 시나리오를 나란히 비교해 더 나은 선택을 찾으세요.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4 ring-1 ring-blue-200 dark:ring-blue-800">
          <SliderGroup values={scenarioA} onChange={setScenarioA} label="시나리오 A (현재)" form={form} />
        </div>
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4 ring-1 ring-emerald-200 dark:ring-emerald-800">
          <SliderGroup values={scenarioB} onChange={setScenarioB} label="시나리오 B (변경안)" form={form} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ label, a, b, isPct }) => {
          const diff = b - a;
          const better = b > a;
          return (
            <div key={label} className="rounded-2xl bg-slate-50 dark:bg-slate-700 p-4 text-center">
              <p className="text-xs text-slate-400 mb-2">{label}</p>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-blue-600">{isPct ? pct(a) : fmt(a)}</span>
                <span className="text-[10px] text-slate-300 dark:text-slate-500">vs</span>
                <span className="text-sm font-bold text-emerald-600">{isPct ? pct(b) : fmt(b)}</span>
              </div>
              <p className={`text-xs font-semibold mt-1.5 ${better ? "text-emerald-500" : "text-red-400"}`}>
                {better ? "▲" : "▼"} {isPct ? `${Math.abs(diff).toFixed(1)}%p` : `${fmt(Math.abs(diff))}원`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
