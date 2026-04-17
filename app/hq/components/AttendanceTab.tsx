"use client";
import { useState, useEffect, useRef } from "react";
import { HQRole, AttendanceRecord } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
  "정상": "bg-emerald-50 text-emerald-700",
  "지각": "bg-amber-50 text-amber-700",
  "조퇴": "bg-orange-50 text-orange-700",
  "결근": "bg-red-50 text-red-700",
  "휴가": "bg-blue-50 text-blue-700",
  "출장": "bg-purple-50 text-purple-700",
};

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function diffHours(a: string, b: string, nextDay = false): number {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let diff = bh + bm / 60 - ah - am / 60;
  if (diff < 0 || nextDay) diff += 24; // 익일 퇴근
  return Math.max(0, +(diff.toFixed(1)));
}

function getMonthDates(): string[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const dates: string[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

type TeamMember = { name: string; role: string };

export default function AttendanceTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [now, setNow] = useState(new Date());
  const [memo, setMemo] = useState("");
  const [viewMode, setViewMode] = useState<"my" | "team">("my");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canViewTeam = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  // 출근 기준 시간 설정
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [editStartTime, setEditStartTime] = useState(false);
  const [tempStartTime, setTempStartTime] = useState("09:00");

  const loadWorkStartTime = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data, error } = await s.from("hq_settings").select("value").eq("key", "work_start_time").single();
      if (error) { console.warn("hq_settings 로드 실패 (테이블 미생성?):", error.message); return; }
      if (data?.value) { setWorkStartTime(data.value); setTempStartTime(data.value); }
    } catch (e) { console.warn("hq_settings 테이블 없음:", e); }
  };

  const saveWorkStartTime = async () => {
    const s = sb();
    if (!s) return;
    try {
      // 먼저 update 시도
      const { data: existing } = await s.from("hq_settings").select("key").eq("key", "work_start_time").single();
      let error;
      if (existing) {
        ({ error } = await s.from("hq_settings").update({ value: tempStartTime, updated_by: userName, updated_at: new Date().toISOString() }).eq("key", "work_start_time"));
      } else {
        ({ error } = await s.from("hq_settings").insert({ key: "work_start_time", value: tempStartTime, updated_by: userName, updated_at: new Date().toISOString() }));
      }
      if (error) { flash("저장 실패: " + error.message); return; }
      setWorkStartTime(tempStartTime);
      setEditStartTime(false);
      flash(`출근 기준 시간이 ${tempStartTime}으로 변경되었습니다`);
    } catch (e) {
      flash("저장 실패: hq_settings 테이블을 확인해주세요");
      console.error(e);
    }
  };

  // Live clock
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Load data from Supabase
  const loadData = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data } = await s.from("hq_attendance").select("*").order("date", { ascending: false });
      if (data) {
        const toTime = (ts: string | null) => {
          if (!ts) return "";
          try { return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; }
        };
        setRecords(data.map((r: any) => ({
          id: r.id, date: r.date, clockIn: toTime(r.clock_in), clockOut: toTime(r.clock_out),
          status: r.status || "정상", overtime: r.overtime || 0, memo: r.memo || "", userName: r.user_name || "",
        })));
      }
    } catch {}
    if (canViewTeam) {
      try {
        const { data: td } = await s.from("hq_team").select("name, role").order("created_at", { ascending: true });
        if (td) setTeamMembers(td as TeamMember[]);
      } catch {}
    }
  };

  useEffect(() => { loadData(); loadWorkStartTime(); }, []);

  const [editClockOut, setEditClockOut] = useState(false);
  const [editClockOutTime, setEditClockOutTime] = useState("");

  // 대표 전용: 출퇴근시간 수정
  const [editClockInId, setEditClockInId] = useState<string | null>(null);
  const [editClockInTime, setEditClockInTime] = useState("");
  const [editClockOutId, setEditClockOutId] = useState<string | null>(null);
  const [editClockOutTimeTeam, setEditClockOutTimeTeam] = useState("");

  const updateClockIn = async (recId: string) => {
    if (!editClockInTime) return;
    const s = sb();
    if (!s) return;
    const rec = records.find(r => r.id === recId);
    if (!rec) return;
    const [h, m] = editClockInTime.split(":").map(Number);
    const d = new Date(`${rec.date}T00:00:00`);
    d.setHours(h, m, 0, 0);
    const isLate = editClockInTime > workStartTime;
    const newStatus = isLate ? "지각" : (rec.status === "지각" ? "정상" : rec.status);
    const { error } = await s.from("hq_attendance").update({
      clock_in: d.toISOString(), status: newStatus,
    }).eq("id", recId);
    if (error) { flash("수정 실패: " + error.message); return; }
    flash(`출근 시간 수정 완료 (${editClockInTime})`);
    setEditClockInId(null);
    loadData();
  };

  const updateClockOutTeam = async (recId: string) => {
    if (!editClockOutTimeTeam) return;
    const s = sb();
    if (!s) return;
    const rec = records.find(r => r.id === recId);
    if (!rec) return;
    const [h, m] = editClockOutTimeTeam.split(":").map(Number);
    const d = new Date(`${rec.date}T00:00:00`);
    d.setHours(h, m, 0, 0);
    const nextDay = editClockOutTimeTeam < rec.clockIn;
    const hours = diffHours(rec.clockIn, editClockOutTimeTeam, nextDay);
    const isEarly = !nextDay && editClockOutTimeTeam < "18:00";
    const overtime = Math.max(0, +(hours - 8).toFixed(1));
    const newStatus = isEarly && rec.status !== "지각" ? "조퇴" : rec.status;
    const { error } = await s.from("hq_attendance").update({
      clock_out: d.toISOString(), overtime, status: newStatus,
    }).eq("id", recId);
    if (error) { flash("수정 실패: " + error.message); return; }
    flash(`퇴근 시간 수정 완료 (${editClockOutTimeTeam})`);
    setEditClockOutId(null);
    loadData();
  };

  const todayStr = today();
  // 오늘 출근 기록 또는 어제 미퇴근 기록 (익일 퇴근 대응)
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const todayRec = records.find(r => r.date === todayStr && r.userName === userName)
    || records.find(r => r.date === yesterdayStr && r.userName === userName && r.clockIn && !r.clockOut);
  const isNextDayClockOut = todayRec?.date === yesterdayStr;

  const clockIn = async () => {
    if (todayRec?.clockIn) { flash("이미 출근 기록이 있습니다"); return; }
    const s = sb();
    if (!s) return;
    const time = now.toTimeString().slice(0, 5);
    const isLate = time > workStartTime;
    const timestamp = new Date().toISOString();
    const { error } = await s.from("hq_attendance").upsert({
      user_id: userId, user_name: userName, date: todayStr,
      clock_in: timestamp, status: isLate ? "지각" : "정상", memo: memo.trim() || null,
    }, { onConflict: "user_id,date" });
    if (error) { flash("저장 실패: " + error.message); return; }
    flash(`출근 완료 (${time})`);
    setMemo("");
    loadData();
  };

  const clockOut = async () => {
    if (!todayRec) { flash("출근 기록이 없습니다"); return; }
    if (todayRec.clockOut) { flash("이미 퇴근 기록이 있습니다"); return; }
    const s = sb();
    if (!s) return;
    const time = now.toTimeString().slice(0, 5);
    const hours = diffHours(todayRec.clockIn, time, isNextDayClockOut);
    // 익일 퇴근이면 조퇴 아님
    const isEarly = !isNextDayClockOut && time < "18:00";
    const overtime = Math.max(0, +(hours - 8).toFixed(1));
    const newStatus = isEarly && todayRec.status !== "지각" ? "조퇴" : todayRec.status;
    const timestamp = new Date().toISOString();
    const { error } = await s.from("hq_attendance").update({
      clock_out: timestamp, overtime, status: newStatus,
    }).eq("id", todayRec.id);
    if (error) { flash("저장 실패: " + error.message); return; }
    flash(`퇴근 완료 (${time}) - ${hours}시간 근무${isNextDayClockOut ? " (익일)" : ""}`);
    loadData();
  };

  const updateClockOut = async () => {
    if (!todayRec || !editClockOutTime) return;
    const s = sb();
    if (!s) return;
    const [h, m] = editClockOutTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    // 수정 시간이 출근보다 이르면 익일로 판단
    const editNextDay = isNextDayClockOut || editClockOutTime < todayRec.clockIn;
    const hours = diffHours(todayRec.clockIn, editClockOutTime, editNextDay);
    const isEarly = !editNextDay && editClockOutTime < "18:00";
    const overtime = Math.max(0, +(hours - 8).toFixed(1));
    const newStatus = isEarly && todayRec.status !== "지각" ? "조퇴" : todayRec.status;
    const { error } = await s.from("hq_attendance").update({
      clock_out: d.toISOString(), overtime, status: newStatus,
    }).eq("id", todayRec.id);
    if (error) { flash("저장 실패: " + error.message); return; }
    flash(`퇴근 시간 수정 완료 (${editClockOutTime})`);
    setEditClockOut(false);
    loadData();
  };

  // Week records
  const weekDates = getWeekDates();
  const weekRecords = weekDates.map(d => records.find(r => r.date === d && r.userName === userName));

  // Monthly stats
  const monthDates = getMonthDates();
  const monthRecords = records.filter(r => monthDates.includes(r.date) && r.userName === userName);
  const totalWorkDays = monthRecords.filter(r => r.clockIn).length;
  const lateCount = monthRecords.filter(r => r.status === "지각").length;
  const overtimeTotal = monthRecords.reduce((a, r) => a + r.overtime, 0);
  const absenceCount = monthRecords.filter(r => r.status === "결근").length;

  const totalHoursToday = todayRec?.clockIn
    ? diffHours(todayRec.clockIn, todayRec.clockOut || now.toTimeString().slice(0, 5), isNextDayClockOut)
    : 0;

  // 전 직원 오늘 현황
  const todayAllRecords = records.filter(r => r.date === todayStr);
  const allNames = [...new Set([...teamMembers.map(m => m.name), ...todayAllRecords.map(r => r.userName)])];

  // 전 직원 이번 주 현황
  const teamWeekData = allNames.map(name => ({
    name,
    role: teamMembers.find(m => m.name === name)?.role ?? "",
    week: weekDates.map(d => records.find(r => r.date === d && r.userName === name)),
    monthStats: {
      workDays: records.filter(r => monthDates.includes(r.date) && r.userName === name && r.clockIn).length,
      late: records.filter(r => monthDates.includes(r.date) && r.userName === name && r.status === "지각").length,
      overtime: records.filter(r => monthDates.includes(r.date) && r.userName === name).reduce((a, r) => a + r.overtime, 0),
      absence: records.filter(r => monthDates.includes(r.date) && r.userName === name && r.status === "결근").length,
    },
  }));

  return (
    <div className="space-y-6">
      {/* 뷰 모드 토글 */}
      {canViewTeam && (
        <div className="flex gap-2">
          <button onClick={() => setViewMode("my")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${viewMode === "my" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            내 근태
          </button>
          <button onClick={() => setViewMode("team")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${viewMode === "team" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            전체 직원 근태
          </button>
        </div>
      )}

      {/* Live Clock & Clock In/Out */}
      <div className={C}>
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-400 mb-1">현재 시각</p>
          <p className="text-4xl font-bold text-slate-800 tracking-tight font-mono">
            {now.toTimeString().slice(0, 8)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs text-slate-400">출근 기준</span>
            {editStartTime ? (
              <>
                <input type="time" value={tempStartTime} onChange={e => setTempStartTime(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 w-24" />
                <button onClick={saveWorkStartTime} className="text-xs text-[#3182F6] font-bold">확인</button>
                <button onClick={() => { setEditStartTime(false); setTempStartTime(workStartTime); }} className="text-xs text-slate-400">취소</button>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-slate-700">{workStartTime}</span>
                {myRole === "대표" && (
                  <button onClick={() => setEditStartTime(true)} className="text-xs text-slate-400 hover:text-[#3182F6] transition-colors" title="출근 기준 시간 수정">✏️</button>
                )}
              </>
            )}
          </div>

        <div className="flex gap-3 justify-center mt-5">
          <button
            onClick={clockIn}
            disabled={!!todayRec?.clockIn}
            className={`${B} px-8 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            🕘 출근하기
          </button>
          <button
            onClick={clockOut}
            disabled={!todayRec?.clockIn || !!todayRec?.clockOut}
            className={`rounded-xl bg-slate-700 text-white font-semibold px-8 py-3 text-base hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            🕕 퇴근하기
          </button>
        </div>

        <div className="mt-3">
          <input
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="메모 (선택사항)"
            className={`${I} text-center max-w-xs mx-auto block`}
          />
        </div>
      </div>

      {/* Today's status */}
      <div className={C}>
        <h3 className="text-sm font-bold text-slate-700 mb-4">
          오늘 근무 현황
          {isNextDayClockOut && <span className="ml-2 text-xs font-semibold text-amber-500">(어제 출근 → 익일 퇴근 대기)</span>}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">출근</p>
            <p className="text-lg font-bold text-slate-800">{todayRec?.clockIn || "--:--"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">퇴근</p>
            {editClockOut ? (
              <div className="flex items-center gap-1 justify-center">
                <input type="time" value={editClockOutTime} onChange={e => setEditClockOutTime(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 w-24" />
                <button onClick={updateClockOut} className="text-xs text-[#3182F6] font-bold">확인</button>
                <button onClick={() => setEditClockOut(false)} className="text-xs text-slate-400">취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-1 justify-center">
                <p className="text-lg font-bold text-slate-800">{todayRec?.clockOut || "--:--"}</p>
                {todayRec?.clockOut && (
                  <button onClick={() => { setEditClockOut(true); setEditClockOutTime(todayRec.clockOut); }}
                    className="text-xs text-slate-400 hover:text-[#3182F6] transition-colors" title="퇴근 시간 수정">
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">근무시간</p>
            <p className="text-lg font-bold text-[#3182F6]">{totalHoursToday.toFixed(1)}h</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">상태</p>
            {todayRec ? (
              <span className={`${BADGE} ${STATUS_COLOR[todayRec.status]}`}>{todayRec.status}</span>
            ) : (
              <span className={`${BADGE} bg-slate-100 text-slate-500`}>미출근</span>
            )}
          </div>
        </div>
      </div>

      {/* This week */}
      <div className={C}>
        <h3 className="text-sm font-bold text-slate-700 mb-4">이번 주 출근 기록</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">요일</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">날짜</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">출근</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">퇴근</th>
                <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">상태</th>
                <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">초과근무</th>
              </tr>
            </thead>
            <tbody>
              {weekDates.map((d, i) => {
                const r = weekRecords[i];
                return (
                  <tr key={d} className={`border-b border-slate-50 ${d === todayStr ? "bg-blue-50/40" : ""}`}>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">{DAY_LABELS[i]}</td>
                    <td className="py-2.5 px-3 text-slate-500">{d.slice(5)}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {editClockInId === r?.id ? (
                        <div className="flex items-center gap-1">
                          <input type="time" value={editClockInTime} onChange={e => setEditClockInTime(e.target.value)}
                            className="border border-slate-200 rounded-lg px-1.5 py-0.5 text-sm font-bold text-slate-800 w-[5.5rem]" />
                          <button onClick={() => updateClockIn(r!.id)} className="text-xs text-[#3182F6] font-bold">확인</button>
                          <button onClick={() => setEditClockInId(null)} className="text-xs text-slate-400">취소</button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {r?.clockIn || "-"}
                          {myRole === "대표" && r?.clockIn && (
                            <button onClick={() => { setEditClockInId(r.id); setEditClockInTime(r.clockIn); }}
                              className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors" title="출근 시간 수정">✏️</button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{r?.clockOut || "-"}</td>
                    <td className="py-2.5 px-3">
                      {r ? (
                        <span className={`${BADGE} text-[11px] ${STATUS_COLOR[r.status]}`}>{r.status}</span>
                      ) : d <= todayStr ? (
                        <span className={`${BADGE} text-[11px] bg-slate-100 text-slate-400`}>-</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {r?.overtime ? `+${r.overtime}h` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly stats */}
      {viewMode === "my" && (
        <div className={C}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">월간 통계</h3>
            <button
              onClick={() => {
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, "0");
                const header = "이름,날짜,출근시간,퇴근시간,상태,초과근무,메모";
                const rows = monthRecords.map(r =>
                  [r.userName, r.date, r.clockIn || "", r.clockOut || "", r.status, r.overtime, `"${(r.memo || "").replace(/"/g, '""')}"`].join(",")
                );
                const csv = "﻿" + [header, ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `근태현황_${yyyy}-${mm}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-xs hover:bg-emerald-100 transition-all"
            >
              📥 엑셀 다운로드
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-xs text-emerald-600 font-semibold mb-1">출근일수</p>
              <p className="text-2xl font-bold text-emerald-700">{totalWorkDays}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-xs text-amber-600 font-semibold mb-1">지각</p>
              <p className="text-2xl font-bold text-amber-700">{lateCount}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-xs text-blue-600 font-semibold mb-1">초과근무</p>
              <p className="text-2xl font-bold text-blue-700">{overtimeTotal.toFixed(1)}h</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 text-center">
              <p className="text-xs text-red-600 font-semibold mb-1">결근</p>
              <p className="text-2xl font-bold text-red-700">{absenceCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* 전체 직원 근태 */}
      {viewMode === "team" && canViewTeam && (
        <>
          {/* 오늘 전 직원 현황 */}
          <div className={C}>
            <h3 className="text-sm font-bold text-slate-700 mb-4">오늘 전체 직원 현황</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-600 font-semibold">출근</p>
                <p className="text-xl font-bold text-emerald-700">{todayAllRecords.filter(r => r.clockIn).length}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-center">
                <p className="text-xs text-amber-600 font-semibold">지각</p>
                <p className="text-xl font-bold text-amber-700">{todayAllRecords.filter(r => r.status === "지각").length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500 font-semibold">퇴근</p>
                <p className="text-xl font-bold text-slate-700">{todayAllRecords.filter(r => r.clockOut).length}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-center">
                <p className="text-xs text-red-600 font-semibold">미출근</p>
                <p className="text-xl font-bold text-red-700">{allNames.length - todayAllRecords.filter(r => r.clockIn).length}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">이름</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">직책</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">출근</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">퇴근</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">상태</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">메모</th>
                  </tr>
                </thead>
                <tbody>
                  {allNames.map(name => {
                    const rec = todayAllRecords.find(r => r.userName === name);
                    const member = teamMembers.find(m => m.name === name);
                    return (
                      <tr key={name} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{displayName(name)}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">{member?.role ?? "-"}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {editClockInId === rec?.id ? (
                            <div className="flex items-center gap-1">
                              <input type="time" value={editClockInTime} onChange={e => setEditClockInTime(e.target.value)}
                                className="border border-slate-200 rounded-lg px-1.5 py-0.5 text-sm font-bold text-slate-800 w-[5.5rem]" />
                              <button onClick={() => updateClockIn(rec!.id)} className="text-xs text-[#3182F6] font-bold">확인</button>
                              <button onClick={() => setEditClockInId(null)} className="text-xs text-slate-400">취소</button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {rec?.clockIn || <span className="text-slate-300">-</span>}
                              {myRole === "대표" && rec?.clockIn && (
                                <button onClick={() => { setEditClockInId(rec.id); setEditClockInTime(rec.clockIn); }}
                                  className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors">✏️</button>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {editClockOutId === rec?.id ? (
                            <div className="flex items-center gap-1">
                              <input type="time" value={editClockOutTimeTeam} onChange={e => setEditClockOutTimeTeam(e.target.value)}
                                className="border border-slate-200 rounded-lg px-1.5 py-0.5 text-sm font-bold text-slate-800 w-[5.5rem]" />
                              <button onClick={() => updateClockOutTeam(rec!.id)} className="text-xs text-[#3182F6] font-bold">확인</button>
                              <button onClick={() => setEditClockOutId(null)} className="text-xs text-slate-400">취소</button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {rec?.clockOut || <span className="text-slate-300">-</span>}
                              {myRole === "대표" && rec?.clockOut && (
                                <button onClick={() => { setEditClockOutId(rec.id); setEditClockOutTimeTeam(rec.clockOut); }}
                                  className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors">✏️</button>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {rec ? (
                            <span className={`${BADGE} text-[11px] ${STATUS_COLOR[rec.status]}`}>{rec.status}</span>
                          ) : (
                            <span className={`${BADGE} text-[11px] bg-red-50 text-red-500`}>미출근</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-400">{rec?.memo || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 전 직원 이번 주 요약 */}
          <div className={C}>
            <h3 className="text-sm font-bold text-slate-700 mb-4">이번 주 전체 직원</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">이름</th>
                    {DAY_LABELS.map(d => (
                      <th key={d} className="text-center py-2 px-2 text-xs text-slate-400 font-semibold">{d}</th>
                    ))}
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">출근일</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">지각</th>
                  </tr>
                </thead>
                <tbody>
                  {teamWeekData.map(tw => (
                    <tr key={tw.name} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-700">{displayName(tw.name)}</span>
                        {tw.role && <span className="text-[10px] text-slate-400 ml-1">{tw.role}</span>}
                      </td>
                      {tw.week.map((r, i) => (
                        <td key={weekDates[i]} className="text-center py-2.5 px-2">
                          {r ? (
                            <span className={`inline-block w-6 h-6 rounded-lg text-[10px] font-bold leading-6 ${STATUS_COLOR[r.status]}`}>
                              {r.status === "정상" ? "✓" : r.status[0]}
                            </span>
                          ) : weekDates[i] <= todayStr ? (
                            <span className="inline-block w-6 h-6 rounded-lg text-[10px] font-bold leading-6 bg-slate-100 text-slate-300">-</span>
                          ) : (
                            <span className="text-slate-200">·</span>
                          )}
                        </td>
                      ))}
                      <td className="text-right py-2.5 px-3 font-semibold text-slate-700">{tw.monthStats.workDays}일</td>
                      <td className="text-right py-2.5 px-3 font-semibold text-amber-600">{tw.monthStats.late}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 전 직원 월간 통계 */}
          <div className={C}>
            <h3 className="text-sm font-bold text-slate-700 mb-4">월간 전체 통계</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold">이름</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">출근일</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">지각</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">초과근무</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-400 font-semibold">결근</th>
                  </tr>
                </thead>
                <tbody>
                  {teamWeekData.map(tw => (
                    <tr key={tw.name} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{displayName(tw.name)}</td>
                      <td className="text-right py-2.5 px-3 text-emerald-600 font-semibold">{tw.monthStats.workDays}일</td>
                      <td className="text-right py-2.5 px-3 text-amber-600 font-semibold">{tw.monthStats.late}</td>
                      <td className="text-right py-2.5 px-3 text-blue-600 font-semibold">{tw.monthStats.overtime.toFixed(1)}h</td>
                      <td className="text-right py-2.5 px-3 text-red-600 font-semibold">{tw.monthStats.absence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
