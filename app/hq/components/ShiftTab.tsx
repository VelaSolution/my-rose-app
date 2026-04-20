"use client";
import { useState, useEffect, useMemo } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type Shift = {
  id: string; user_name: string; date: string; shift_type: string;
  start_time: string; end_time: string; memo: string; created_at: string;
};

const SHIFT_TYPES = ["주간", "야간", "오전", "오후", "휴무", "재택"] as const;
const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  "주간": { start: "09:00", end: "18:00" }, "야간": { start: "18:00", end: "09:00" },
  "오전": { start: "09:00", end: "14:00" }, "오후": { start: "14:00", end: "18:00" },
  "휴무": { start: "", end: "" }, "재택": { start: "09:00", end: "18:00" },
};
const SHIFT_COLORS: Record<string, string> = {
  "주간": "bg-blue-100 text-blue-800 border-blue-200",
  "야간": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "오전": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "오후": "bg-teal-100 text-teal-800 border-teal-200",
  "휴무": "bg-red-50 text-red-600 border-red-200",
  "재택": "bg-emerald-100 text-emerald-800 border-emerald-200",
};
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getWeekDates(offset: number): string[] {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  const week: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    week.push(dd.toISOString().slice(0, 10));
  }
  return week;
}

function getMonthDates(yearMonth: string): string[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const days: string[] = [];
  const last = new Date(y, m, 0).getDate();
  for (let d = 1; d <= last; d++) {
    days.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

type ViewMode = "week" | "month";

export default function ShiftTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const canEdit = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [monthStr, setMonthStr] = useState(today().slice(0, 7));

  // 셀 편집
  const [editCell, setEditCell] = useState<{ user: string; date: string } | null>(null);
  const [editType, setEditType] = useState<string>("주간");
  const [editMemo, setEditMemo] = useState("");

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const monthDates = useMemo(() => getMonthDates(monthStr), [monthStr]);

  async function load() {
    const s = sb(); if (!s) { setLoading(false); return; }
    const dateRange = viewMode === "week"
      ? { from: weekDates[0], to: weekDates[6] }
      : { from: monthDates[0], to: monthDates[monthDates.length - 1] };
    const [r1, r2] = await Promise.all([
      s.from("hq_shifts").select("*").gte("date", dateRange.from).lte("date", dateRange.to),
      s.from("hq_team").select("name").neq("approved", false),
    ]);
    if (r1.data) setShifts(r1.data as Shift[]);
    if (r2.data) setTeamNames((r2.data as { name: string }[]).map(t => t.name));
    setLoading(false);
  }

  useEffect(() => { load(); }, [weekOffset, viewMode, monthStr]);

  const shiftMap = useMemo(() => {
    const m: Record<string, Shift> = {};
    shifts.forEach(s => { m[`${s.user_name}_${s.date}`] = s; });
    return m;
  }, [shifts]);

  function getShift(user: string, date: string): Shift | undefined {
    return shiftMap[`${user}_${date}`];
  }

  function handleCellClick(user: string, date: string) {
    if (!canEdit) return;
    const existing = getShift(user, date);
    setEditCell({ user, date });
    setEditType(existing?.shift_type || "주간");
    setEditMemo(existing?.memo || "");
  }

  async function saveCell() {
    if (!editCell) return;
    const s = sb(); if (!s) return;
    const { user, date } = editCell;
    const times = SHIFT_TIMES[editType] || { start: "", end: "" };
    const existing = getShift(user, date);

    if (existing) {
      await s.from("hq_shifts").update({
        shift_type: editType, start_time: times.start, end_time: times.end, memo: editMemo.trim(),
      }).eq("id", existing.id);
    } else {
      await s.from("hq_shifts").insert({
        user_name: user, date, shift_type: editType,
        start_time: times.start, end_time: times.end, memo: editMemo.trim(),
      });
    }
    flash("스케줄이 저장되었습니다");
    setEditCell(null); setEditMemo("");
    load();
  }

  async function deleteCell() {
    if (!editCell) return;
    const existing = getShift(editCell.user, editCell.date);
    if (!existing) { setEditCell(null); return; }
    const s = sb(); if (!s) return;
    await s.from("hq_shifts").delete().eq("id", existing.id);
    flash("스케줄이 삭제되었습니다");
    setEditCell(null); load();
  }

  async function copyPrevWeek() {
    if (!canEdit) return;
    const prevDates = getWeekDates(weekOffset - 1);
    const s = sb(); if (!s) return;
    const { data } = await s.from("hq_shifts").select("*").gte("date", prevDates[0]).lte("date", prevDates[6]);
    if (!data || data.length === 0) { flash("이전 주 스케줄이 없습니다"); return; }

    const inserts = (data as Shift[]).map(sh => {
      const dayIdx = prevDates.indexOf(sh.date);
      if (dayIdx < 0) return null;
      const newDate = weekDates[dayIdx];
      if (getShift(sh.user_name, newDate)) return null;
      return {
        user_name: sh.user_name, date: newDate, shift_type: sh.shift_type,
        start_time: sh.start_time, end_time: sh.end_time, memo: sh.memo,
      };
    }).filter(Boolean);

    if (inserts.length === 0) { flash("복사할 스케줄이 없습니다"); return; }
    await s.from("hq_shifts").insert(inserts);
    flash(`${inserts.length}건의 스케줄을 복사했습니다`);
    load();
  }

  // 월별 요약
  const monthSummary = useMemo(() => {
    if (viewMode !== "month") return {};
    const summary: Record<string, Record<string, number>> = {};
    teamNames.forEach(name => {
      summary[name] = {};
      SHIFT_TYPES.forEach(t => { summary[name][t] = 0; });
    });
    shifts.forEach(s => {
      if (summary[s.user_name] && summary[s.user_name][s.shift_type] !== undefined) {
        summary[s.user_name][s.shift_type]++;
      }
    });
    return summary;
  }, [shifts, teamNames, viewMode]);

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;

  return (
    <div className="space-y-4">
      {/* 컨트롤 */}
      <div className={`${C} flex flex-wrap gap-3 items-center`}>
        <div className="flex gap-1">
          <button className={viewMode === "week" ? B : B2} onClick={() => setViewMode("week")}>주간</button>
          <button className={viewMode === "month" ? B : B2} onClick={() => setViewMode("month")}>월간</button>
        </div>
        {viewMode === "week" && (
          <div className="flex items-center gap-2">
            <button className={B2} onClick={() => setWeekOffset(o => o - 1)}>◀</button>
            <span className="text-sm font-medium text-slate-700">{weekDates[0]} ~ {weekDates[6]}</span>
            <button className={B2} onClick={() => setWeekOffset(o => o + 1)}>▶</button>
            <button className="text-xs text-[#3182F6] hover:underline" onClick={() => setWeekOffset(0)}>이번 주</button>
          </div>
        )}
        {viewMode === "month" && (
          <input type="month" className={`${I} max-w-[180px]`} value={monthStr} onChange={e => setMonthStr(e.target.value)} />
        )}
        <div className="flex-1" />
        {canEdit && viewMode === "week" && (
          <button className={B2} onClick={copyPrevWeek}>이전 주 복사</button>
        )}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-2">
        {SHIFT_TYPES.map(t => (
          <span key={t} className={`${BADGE} border ${SHIFT_COLORS[t]}`}>{t} {SHIFT_TIMES[t].start ? `(${SHIFT_TIMES[t].start}-${SHIFT_TIMES[t].end})` : ""}</span>
        ))}
      </div>

      {/* 셀 편집 */}
      {editCell && (
        <div className={C}>
          <h3 className="font-bold text-slate-800 mb-3">{displayName(editCell.user)} · {editCell.date}</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className={L}>근무 유형</label>
              <select className={I} value={editType} onChange={e => setEditType(e.target.value)}>
                {SHIFT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={L}>메모</label>
              <input className={I} value={editMemo} onChange={e => setEditMemo(e.target.value)} placeholder="메모 (선택)" />
            </div>
            <button className={B} onClick={saveCell}>저장</button>
            <button className={B2} onClick={deleteCell}>삭제</button>
            <button className={B2} onClick={() => setEditCell(null)}>취소</button>
          </div>
        </div>
      )}

      {/* ── 주간 그리드 ──────────────────────── */}
      {viewMode === "week" && (
        <div className={C}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 text-left font-medium text-slate-500 min-w-[100px]">팀원</th>
                  {weekDates.map((d, i) => {
                    const dayNum = new Date(d).getDay();
                    const isWeekend = dayNum === 0 || dayNum === 6;
                    return (
                      <th key={d} className={`pb-2 text-center font-medium min-w-[90px] ${isWeekend ? "text-red-400" : "text-slate-500"}`}>
                        {DAY_LABELS[dayNum]}<br/><span className="text-xs">{d.slice(5)}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {teamNames.map(name => (
                  <tr key={name} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-700">{displayName(name)}</td>
                    {weekDates.map(date => {
                      const shift = getShift(name, date);
                      return (
                        <td key={date} className="py-1 px-1 text-center">
                          <div
                            className={`rounded-lg px-1 py-1.5 text-xs font-medium cursor-pointer transition-all min-h-[32px] flex items-center justify-center border ${
                              shift ? SHIFT_COLORS[shift.shift_type] || "bg-slate-50 text-slate-600 border-slate-200" : "bg-slate-50/50 text-slate-300 border-transparent hover:border-slate-200"
                            }`}
                            onClick={() => handleCellClick(name, date)}
                            title={shift?.memo || ""}
                          >
                            {shift ? shift.shift_type : canEdit ? "+" : "-"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 월간 요약 ────────────────────────── */}
      {viewMode === "month" && (
        <div className={C}>
          <h3 className="font-bold text-slate-800 mb-4">월간 근무 요약 — {monthStr}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">팀원</th>
                  {SHIFT_TYPES.map(t => <th key={t} className="pb-2 font-medium text-center">{t}</th>)}
                  <th className="pb-2 font-medium text-center">합계</th>
                </tr>
              </thead>
              <tbody>
                {teamNames.map(name => {
                  const row = monthSummary[name] || {};
                  const total = Object.values(row).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={name} className="border-b border-slate-50">
                      <td className="py-2 font-medium text-slate-700">{displayName(name)}</td>
                      {SHIFT_TYPES.map(t => (
                        <td key={t} className="text-center">
                          {row[t] ? <span className={`${BADGE} ${SHIFT_COLORS[t]}`}>{row[t]}</span> : <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                      <td className="text-center font-semibold text-slate-700">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
