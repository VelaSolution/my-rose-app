"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { fmt } from "@/lib/vela";
import ToolNav from "@/components/ToolNav";
import SimDataPicker from "@/components/SimDataPicker";
import type { SimulatorSnapshot } from "@/lib/useSimulatorData";

// 2026년 기준 (예상)
const MIN_WAGE = 10620; // 최저시급
const INSURANCE_RATES = {
  national_pension: 0.045,    // 국민연금 (사업주 4.5%)
  health: 0.03545,            // 건강보험 (사업주 3.545%)
  employment: 0.009,          // 고용보험 (사업주 0.9%)
  industrial_accident: 0.007, // 산재보험 (업종별 상이, 음식업 약 0.7%)
};

type Employee = {
  id: string;
  name: string;
  hourlyWage: number;
  weeklyHours: number;
  nightHours: number; // 22시~06시
  holidayHours: number; // 주말/공휴일
  includeInsurance: boolean;
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function calcEmployee(e: Employee) {
  const baseMonthly = e.hourlyWage * e.weeklyHours * 4.345;
  // 주휴수당: 주 15시간 이상 근무 시
  const weeklyPay = e.weeklyHours >= 15 ? e.hourlyWage * (e.weeklyHours / 5) * 8 / 5 * 4.345 : 0;
  // 야간수당: 22시~06시 50% 가산
  const nightPay = e.nightHours * e.hourlyWage * 0.5 * 4.345;
  // 휴일근무수당: 50% 가산
  const holidayPay = e.holidayHours * e.hourlyWage * 0.5 * 4.345;

  const grossMonthly = baseMonthly + weeklyPay + nightPay + holidayPay;

  // 4대보험 (사업주 부담분)
  const insuranceCost = e.includeInsurance
    ? grossMonthly * (INSURANCE_RATES.national_pension + INSURANCE_RATES.health + INSURANCE_RATES.employment + INSURANCE_RATES.industrial_accident)
    : 0;

  const totalCost = grossMonthly + insuranceCost;

  return { baseMonthly, weeklyPay, nightPay, holidayPay, grossMonthly, insuranceCost, totalCost };
}

export default function LaborLawPage() {
  const [employees, setEmployees] = useState<Employee[]>([
    { id: uid(), name: "직원 1", hourlyWage: MIN_WAGE, weeklyHours: 40, nightHours: 0, holidayHours: 0, includeInsurance: true },
  ]);

  const results = useMemo(() => employees.map((e) => ({ ...e, ...calcEmployee(e) })), [employees]);
  const totalMonthlyCost = results.reduce((a, r) => a + r.totalCost, 0);

  const simFields = (sim: SimulatorSnapshot) => [
    { key: "laborRatio", label: "인건비 비율", value: `${sim.laborRatio}%`, rawValue: sim.laborRatio },
    { key: "totalSales", label: "월매출", value: `${fmt(Math.round(sim.totalSales))}원`, rawValue: sim.totalSales },
  ];
  const applySimSelected = (_selected: Record<string, number | string>) => {
    // 참고용 데이터 표시
  };

  const updateEmployee = (id: string, field: string, value: number | string | boolean) => {
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEmployee = () => {
    setEmployees((prev) => [...prev, { id: uid(), name: `직원 ${prev.length + 1}`, hourlyWage: MIN_WAGE, weeklyHours: 40, nightHours: 0, holidayHours: 0, includeInsurance: true }]);
  };

  const removeEmployee = (id: string) => {
    if (employees.length <= 1) return;
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <>
    <ToolNav />
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
      <div className="mx-auto max-w-3xl">
        <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>

        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>⚖️</span> 근로기준법 반영
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">인건비 계산기 (법정)</h1>
          <p className="text-slate-500 text-sm">주휴수당·야간수당·4대보험을 자동 반영한 실제 인건비를 계산합니다.</p>
          <p className="text-xs text-slate-400 mt-1">2026년 최저시급 {fmt(MIN_WAGE)}원 기준</p>
          <SimDataPicker fields={simFields} onApply={applySimSelected} />
        </div>

        {/* 총 비용 요약 */}
        <div className="rounded-3xl bg-slate-900 p-6 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">월 총 인건비 (사업주 부담)</p>
              <p className="text-3xl font-extrabold mt-1">{fmt(totalMonthlyCost)}<span className="text-lg text-slate-400">원</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">직원 수</p>
              <p className="text-2xl font-bold">{employees.length}<span className="text-lg text-slate-400">명</span></p>
            </div>
          </div>
        </div>

        {/* 직원별 입력 */}
        <div className="space-y-4 mb-6">
          {results.map((r) => (
            <div key={r.id} className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <div className="flex items-center justify-between mb-4">
                <input
                  value={r.name}
                  onChange={(e) => updateEmployee(r.id, "name", e.target.value)}
                  className="text-base font-bold text-slate-900 border-none outline-none bg-transparent"
                />
                {employees.length > 1 && (
                  <button onClick={() => removeEmployee(r.id)} className="text-xs text-slate-400 hover:text-red-500">삭제</button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">시급 (원)</label>
                  <input type="number" value={r.hourlyWage} onChange={(e) => updateEmployee(r.id, "hourlyWage", Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">주간 근무시간</label>
                  <input type="number" value={r.weeklyHours} onChange={(e) => updateEmployee(r.id, "weeklyHours", Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">야간 (주당)</label>
                  <input type="number" value={r.nightHours} onChange={(e) => updateEmployee(r.id, "nightHours", Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">휴일 (주당)</label>
                  <input type="number" value={r.holidayHours} onChange={(e) => updateEmployee(r.id, "holidayHours", Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 mb-4 cursor-pointer">
                <input type="checkbox" checked={r.includeInsurance} onChange={(e) => updateEmployee(r.id, "includeInsurance", e.target.checked)} className="rounded" />
                4대보험 포함
              </label>

              <div className="rounded-2xl bg-slate-50 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-slate-400">기본급</span><p className="font-bold">{fmt(r.baseMonthly)}원</p></div>
                <div><span className="text-slate-400">주휴수당</span><p className="font-bold text-blue-600">{r.weeklyPay > 0 ? `+${fmt(r.weeklyPay)}원` : "해당없음"}</p></div>
                <div><span className="text-slate-400">야간수당</span><p className="font-bold text-purple-600">{r.nightPay > 0 ? `+${fmt(r.nightPay)}원` : "—"}</p></div>
                <div><span className="text-slate-400">휴일수당</span><p className="font-bold text-orange-600">{r.holidayPay > 0 ? `+${fmt(r.holidayPay)}원` : "—"}</p></div>
                <div><span className="text-slate-400">4대보험</span><p className="font-bold text-red-500">{r.insuranceCost > 0 ? `+${fmt(r.insuranceCost)}원` : "미포함"}</p></div>
                <div><span className="text-slate-400">총 비용</span><p className="font-extrabold text-slate-900">{fmt(r.totalCost)}원</p></div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addEmployee} className="w-full rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-semibold text-slate-400 hover:border-slate-300 hover:text-slate-600 transition">
          + 직원 추가
        </button>
      </div>
    </main>
    </>
  );
}
