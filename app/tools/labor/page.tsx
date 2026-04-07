"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { fmt } from "@/lib/vela";

// ─── Types ───────────────────────────────────────────────────────────────────

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAY_LABELS: Record<DayKey, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

type Shift = { start: string; end: string; enabled: boolean };
type Employee = {
  id: string;
  name: string;
  role: string;
  hourlyWage: string;
  schedule: Record<DayKey, Shift>;
  isFullTime: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }
function num(v: string) { const n = Number(v.replace(/,/g, "")); return isNaN(n) ? 0 : n; }

function calcHours(shift: Shift): number {
  if (!shift.enabled || !shift.start || !shift.end) return 0;
  const [sh, sm] = shift.start.split(":").map(Number);
  const [eh, em] = shift.end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  // 4시간 초과 시 30분 식사 시간 공제
  const breakMins = mins > 240 ? 30 : 0;
  return Math.max(0, (mins - breakMins) / 60);
}

function calcWeeklyHours(emp: Employee): number {
  return DAY_KEYS.reduce((s, d) => s + calcHours(emp.schedule[d]), 0);
}

function calcWeeklyWage(emp: Employee): number {
  const wage = num(emp.hourlyWage);
  const hours = calcWeeklyHours(emp);
  // 주휴수당: 주 15시간 이상 & 만근 시 1일치 추가
  const weeklyAllowance = hours >= 15 ? wage * 8 : 0;
  return wage * hours + weeklyAllowance;
}

function calcMonthlyWage(emp: Employee): number {
  if (emp.isFullTime) {
    // 정규직: 월 209시간 기준
    return num(emp.hourlyWage) * 209;
  }
  return calcWeeklyWage(emp) * 4.345;
}

const DEFAULT_SHIFT: Shift = { start: "09:00", end: "18:00", enabled: false };

function makeEmployee(name = "", role = "홀 서빙"): Employee {
  const schedule = DAY_KEYS.reduce((acc, d) => {
    acc[d] = { ...DEFAULT_SHIFT };
    return acc;
  }, {} as Record<DayKey, Shift>);
  return { id: uid(), name, role, hourlyWage: "10030", schedule, isFullTime: false };
}

const ROLES = ["홀 서빙", "주방", "바리스타", "매니저", "카운터", "배달", "기타"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmployeeCard({
  emp,
  onUpdate,
  onDelete,
}: {
  emp: Employee;
  onUpdate: (id: string, updated: Partial<Employee>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const weeklyHours = calcWeeklyHours(emp);
  const monthlyWage = calcMonthlyWage(emp);
  const weeklyWage = calcWeeklyWage(emp);

  const updateShift = (day: DayKey, field: keyof Shift, value: string | boolean) => {
    onUpdate(emp.id, {
      schedule: {
        ...emp.schedule,
        [day]: { ...emp.schedule[day], [field]: value },
      },
    });
  };

  const toggleDay = (day: DayKey) => {
    const cur = emp.schedule[day].enabled;
    updateShift(day, "enabled", !cur);
  };

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {emp.name?.[0] ?? "?"}
        </div>
        <div className="flex-1 min-w-0 flex gap-3 items-center flex-wrap">
          <input
            type="text"
            placeholder="직원 이름"
            value={emp.name}
            onChange={(e) => onUpdate(emp.id, { name: e.target.value })}
            className="font-bold text-slate-900 bg-transparent outline-none placeholder:text-slate-300 w-28 text-sm"
          />
          <select
            value={emp.role}
            onChange={(e) => onUpdate(emp.id, { role: e.target.value })}
            className="text-xs text-slate-400 bg-transparent outline-none cursor-pointer"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={emp.isFullTime}
              onChange={(e) => onUpdate(emp.id, { isFullTime: e.target.checked })}
              className="w-3.5 h-3.5 accent-slate-900"
            />
            <span className="text-xs text-slate-400">정규직(209h)</span>
          </label>
        </div>

        <div className="hidden sm:flex items-center gap-5 text-right flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400">주간 {emp.isFullTime ? "—" : `${weeklyHours.toFixed(1)}h`}</p>
            <p className="text-sm font-bold text-slate-900">{fmt(Math.round(weeklyWage))}원</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">월 인건비</p>
            <p className="text-sm font-bold text-blue-600">{fmt(Math.round(monthlyWage))}원</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setExpanded(v => !v)} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={() => onDelete(emp.id)} className="p-2 rounded-xl hover:bg-red-50 transition text-slate-300 hover:text-red-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-6 py-5 space-y-4">
          {/* 시급 */}
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">시급</label>
            <div className="relative w-36">
              <input
                type="text"
                inputMode="numeric"
                value={emp.hourlyWage}
                onChange={(e) => onUpdate(emp.id, { hourlyWage: e.target.value.replace(/[^0-9]/g, "") })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-right pr-7 outline-none focus:border-blue-400 focus:bg-white transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
            </div>
            <span className="text-xs text-slate-400">2025 최저시급: 10,030원</span>
          </div>

          {/* 스케줄 */}
          {!emp.isFullTime && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">주간 스케줄</label>
              <div className="grid gap-2">
                {DAY_KEYS.map((day) => {
                  const shift = emp.schedule[day];
                  const h = calcHours(shift);
                  const isWeekend = day === "sat" || day === "sun";
                  return (
                    <div key={day} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${shift.enabled ? "bg-blue-50" : "bg-slate-50"}`}>
                      <button
                        onClick={() => toggleDay(day)}
                        className={`w-8 h-8 rounded-xl text-sm font-bold transition flex-shrink-0 ${
                          shift.enabled
                            ? isWeekend ? "bg-orange-500 text-white" : "bg-slate-900 text-white"
                            : "bg-white text-slate-400 ring-1 ring-slate-200"
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                      {shift.enabled ? (
                        <>
                          <input
                            type="time"
                            value={shift.start}
                            onChange={(e) => updateShift(day, "start", e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400"
                          />
                          <span className="text-slate-400 text-xs">~</span>
                          <input
                            type="time"
                            value={shift.end}
                            onChange={(e) => updateShift(day, "end", e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400"
                          />
                          <span className="text-xs text-blue-600 font-semibold ml-1">
                            {h.toFixed(1)}h · {fmt(Math.round(h * num(emp.hourlyWage)))}원
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">휴무</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 요약 */}
          <div className="rounded-2xl bg-slate-50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-1">주간 근무시간</p>
              <p className="font-bold text-slate-900">{emp.isFullTime ? "209h/월" : `${weeklyHours.toFixed(1)}h`}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">주휴수당</p>
              <p className="font-bold text-slate-900">
                {emp.isFullTime ? "포함" : weeklyHours >= 15 ? `${fmt(num(emp.hourlyWage) * 8)}원` : "해당없음"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">주간 급여</p>
              <p className="font-bold text-slate-900">{fmt(Math.round(weeklyWage))}원</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">월 급여 (×4.345)</p>
              <p className="font-bold text-blue-600">{fmt(Math.round(monthlyWage))}원</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LaborSchedulerPage() {
  const [employees, setEmployees] = useState<Employee[]>([
    (() => { const e = makeEmployee("김민준", "바리스타"); e.schedule.mon.enabled = true; e.schedule.tue.enabled = true; e.schedule.wed.enabled = true; e.schedule.thu.enabled = true; e.schedule.fri.enabled = true; e.schedule.mon.start = "09:00"; e.schedule.mon.end = "18:00"; e.schedule.tue.start = "09:00"; e.schedule.tue.end = "18:00"; e.schedule.wed.start = "09:00"; e.schedule.wed.end = "18:00"; e.schedule.thu.start = "09:00"; e.schedule.thu.end = "18:00"; e.schedule.fri.start = "09:00"; e.schedule.fri.end = "18:00"; return e; })(),
    (() => { const e = makeEmployee("이서연", "홀 서빙"); e.schedule.sat.enabled = true; e.schedule.sun.enabled = true; e.schedule.sat.start = "11:00"; e.schedule.sat.end = "21:00"; e.schedule.sun.start = "11:00"; e.schedule.sun.end = "21:00"; return e; })(),
  ]);

  const [insuranceRate, setInsuranceRate] = useState("9.4"); // 4대보험 사업주 부담 약 9.4%

  const addEmployee = useCallback(() => setEmployees(prev => [...prev, makeEmployee()]), []);
  const updateEmployee = useCallback((id: string, updated: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updated } : e));
  }, []);
  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  }, []);

  const totalMonthlyWage = employees.reduce((s, e) => s + calcMonthlyWage(e), 0);
  const insuranceCost = totalMonthlyWage * (num(insuranceRate) / 100);
  const totalLaborCost = totalMonthlyWage + insuranceCost;
  const totalWeeklyHours = employees.reduce((s, e) => s + (e.isFullTime ? 0 : calcWeeklyHours(e)), 0);

  return (
    <>
      <style>{`
        input[type='time']::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer}
      `}</style>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>👥</span> 인건비 스케줄러
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">인건비 스케줄러</h1>
            <p className="text-slate-500 text-sm">직원별 시급과 근무 시간을 설정하면 주간·월간 인건비를 자동 계산합니다.</p>
          </div>

          {/* 요약 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">직원 수</p>
              <p className="text-2xl font-extrabold text-slate-900">{employees.length}명</p>
            </div>
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">주간 총 근무</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalWeeklyHours.toFixed(0)}h</p>
            </div>
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">월 급여 합계</p>
              <p className="text-2xl font-extrabold text-slate-900">{fmt(Math.round(totalMonthlyWage))}원</p>
            </div>
            <div className="rounded-2xl bg-blue-50 ring-1 ring-blue-200 p-4">
              <p className="text-xs text-blue-400 mb-1">4대보험 포함</p>
              <p className="text-2xl font-extrabold text-blue-600">{fmt(Math.round(totalLaborCost))}원</p>
            </div>
          </div>

          {/* 4대보험 설정 */}
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4 mb-6 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-amber-700">사업주 4대보험 부담률</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={insuranceRate}
                onChange={(e) => setInsuranceRate(e.target.value)}
                className="w-20 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-center outline-none focus:border-amber-400"
              />
              <span className="text-sm text-amber-600">%</span>
            </div>
            <span className="text-xs text-amber-500 ml-auto">2025년 기준 약 9.4% (국민연금+건강보험+고용보험+산재보험)</span>
          </div>

          {/* 직원 카드 */}
          <div className="space-y-4">
            {employees.map((emp) => (
              <EmployeeCard key={emp.id} emp={emp} onUpdate={updateEmployee} onDelete={deleteEmployee} />
            ))}
          </div>

          <button
            onClick={addEmployee}
            className="mt-5 w-full rounded-3xl border-2 border-dashed border-slate-200 py-5 text-sm font-semibold text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            직원 추가
          </button>

          {/* 월별 인건비 비율 가이드 */}
          <div className="mt-8 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
            <h2 className="font-bold text-slate-900 text-sm mb-4">💡 업종별 적정 인건비 비율</h2>
            <div className="space-y-2">
              {[
                { label: "카페", ratio: "25~35%", color: "#3182F6" },
                { label: "일반 음식점", ratio: "25~35%", color: "#059669" },
                { label: "술집/바", ratio: "20~30%", color: "#7C3AED" },
                { label: "파인다이닝", ratio: "30~40%", color: "#D97706" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-slate-500 text-xs">{item.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 relative">
                    <div className="h-2 rounded-full absolute" style={{ width: item.ratio.split("~")[1], background: `${item.color}30` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-16 text-right">{item.ratio}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-100 px-5 py-4 text-xs text-slate-500 leading-relaxed">
            💡 <strong className="text-slate-700">Tip.</strong> 주휴수당은 주 15시간 이상 근무 시 발생합니다. 4대보험 요율은 연도·급여 구간별로 다를 수 있으니 정확한 계산은 4대보험 정보연계센터를 참고하세요.
          </div>
        </div>
      </main>
    </>
  );
}
