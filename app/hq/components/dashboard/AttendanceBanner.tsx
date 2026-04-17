"use client";
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#3182F6] to-[#7C3AED] p-5 text-white shadow-lg shadow-[#3182F6]/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[4rem]" />
        <div className="flex items-center justify-between gap-4 relative">
          <div>
            <h3 className="text-base font-bold">아직 출근 전이에요!</h3>
            <p className="text-sm text-white/70 mt-0.5">출근 버튼을 눌러 오늘 근무를 시작하세요.</p>
          </div>
          <button onClick={onClockIn} className="rounded-xl bg-white text-[#3182F6] font-bold px-6 py-3 text-sm hover:bg-white/90 active:scale-[0.98] transition-all flex-shrink-0 shadow-sm">
            출근하기
          </button>
        </div>
      </div>
    );
  }

  if (!todayAttendance.clockOut) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white shadow-lg shadow-emerald-500/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[4rem]" />
        <div className="flex items-center justify-between gap-4 relative">
          <div>
            <p className="text-base font-bold">근무 중 · {todayAttendance.clockIn} 출근</p>
            <p className="text-sm text-white/70 mt-0.5">오늘도 화이팅!</p>
          </div>
          <button onClick={() => onNavigate("attendance")} className="rounded-xl bg-white/20 backdrop-blur-sm text-white font-semibold px-5 py-2.5 text-sm hover:bg-white/30 active:scale-[0.98] transition-all flex-shrink-0 ring-1 ring-white/30">
            퇴근하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200/60 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-lg">✅</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">오늘 근무 완료</p>
          <p className="text-xs text-slate-400">출근 {todayAttendance.clockIn} · 퇴근 {todayAttendance.clockOut}</p>
        </div>
      </div>
    </div>
  );
}
