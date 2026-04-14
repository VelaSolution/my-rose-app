"use client";
import { C } from "@/app/hq/utils";
import type { Tab } from "@/app/hq/types";

interface Props {
  loading: boolean;
  todayAttendance: { clockIn: string; clockOut: string } | null;
  onClockIn: () => void;
  onNavigate: (tab: Tab) => void;
}

export default function AttendanceBanner({ loading, todayAttendance, onClockIn, onNavigate }: Props) {
  if (loading) return null;

  if (!todayAttendance) {
    return (
      <div className={`${C} border-[#3182F6] border-2 bg-blue-50/50`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🕘</span>
            <div>
              <h3 className="text-base font-bold text-slate-900">아직 출근 전이에요!</h3>
              <p className="text-sm text-slate-500">출근 버튼을 눌러 오늘 근무를 시작하세요.</p>
            </div>
          </div>
          <button onClick={onClockIn} className="rounded-xl bg-[#3182F6] text-white font-bold px-6 py-3 text-sm hover:bg-[#2672DE] active:scale-[0.98] transition-all flex-shrink-0">
            출근하기
          </button>
        </div>
      </div>
    );
  }

  if (!todayAttendance.clockOut) {
    return (
      <div className={`${C} border-emerald-300 border bg-emerald-50/30`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-emerald-700">출근 완료 · {todayAttendance.clockIn}</p>
              <p className="text-xs text-slate-400">퇴근 시 근태 탭에서 퇴근하기를 눌러주세요.</p>
            </div>
          </div>
          <button onClick={() => onNavigate("attendance")} className="rounded-xl bg-slate-700 text-white font-semibold px-5 py-2.5 text-sm hover:bg-slate-800 transition-all flex-shrink-0">
            🕕 퇴근하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${C} border-slate-200 bg-slate-50/50`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏠</span>
        <div>
          <p className="text-sm font-semibold text-slate-600">오늘 근무 완료</p>
          <p className="text-xs text-slate-400">출근 {todayAttendance.clockIn} · 퇴근 {todayAttendance.clockOut}</p>
        </div>
      </div>
    </div>
  );
}
