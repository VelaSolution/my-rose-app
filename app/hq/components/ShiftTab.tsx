"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type Shift = {
  id: string; user_name: string; date: string; shift_type: string;
  start_time: string; end_time: string; memo: string; created_at: string;
};

type ShiftPreference = {
  id?: string; user_name: string; day_of_week: number;
  preferred_shift: string; unavailable: boolean;
};

type PreviewAssignment = {
  user_name: string; date: string; shift_type: string;
  start_time: string; end_time: string; memo: string;
};

const SHIFT_TYPES = ["주간", "야간", "오전", "오후", "휴무", "재택"] as const;
const ASSIGNABLE_SHIFT_TYPES = ["주간", "야간", "오전", "오후"] as const;
const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  "주간": { start: "09:00", end: "18:00" }, "야간": { start: "18:00", end: "09:00" },
  "오전": { start: "09:00", end: "14:00" }, "오후": { start: "14:00", end: "18:00" },
  "휴무": { start: "", end: "" }, "재택": { start: "09:00", end: "18:00" },
};
const SHIFT_HOURS: Record<string, number> = {
  "주간": 9, "야간": 15, "오전": 5, "오후": 4, "휴무": 0, "재택": 9,
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
type SubTab = "schedule" | "preferences" | "fairness";

export default function ShiftTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const canEdit = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [monthStr, setMonthStr] = useState(today().slice(0, 7));
  const [subTab, setSubTab] = useState<SubTab>("schedule");

  // 셀 편집
  const [editCell, setEditCell] = useState<{ user: string; date: string } | null>(null);
  const [editType, setEditType] = useState<string>("주간");
  const [editMemo, setEditMemo] = useState("");

  // 선호도
  const [preferences, setPreferences] = useState<ShiftPreference[]>([]);
  const [prefLoading, setPrefLoading] = useState(false);

  // 자동 배정 미리보기
  const [autoPreview, setAutoPreview] = useState<PreviewAssignment[] | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);

  // 공정성 월별 데이터
  const [fairnessMonth, setFairnessMonth] = useState(today().slice(0, 7));
  const [fairnessShifts, setFairnessShifts] = useState<Shift[]>([]);

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

  // 선호도 로드
  const loadPreferences = useCallback(async () => {
    const s = sb(); if (!s) return;
    setPrefLoading(true);
    const { data } = await s.from("hq_shift_preferences").select("*");
    if (data) setPreferences(data as ShiftPreference[]);
    setPrefLoading(false);
  }, []);

  useEffect(() => {
    if (subTab === "preferences") loadPreferences();
  }, [subTab, loadPreferences]);

  // 공정성 데이터 로드
  const loadFairnessData = useCallback(async () => {
    const s = sb(); if (!s) return;
    const dates = getMonthDates(fairnessMonth);
    const { data } = await s.from("hq_shifts").select("*")
      .gte("date", dates[0]).lte("date", dates[dates.length - 1]);
    if (data) setFairnessShifts(data as Shift[]);
  }, [fairnessMonth]);

  useEffect(() => {
    if (subTab === "fairness") loadFairnessData();
  }, [subTab, fairnessMonth, loadFairnessData]);

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

  // ── 이전 주 복사 + 선호도 반영 ──────────────────────
  async function copyPrevWeekWithPrefs() {
    if (!canEdit) return;
    const prevDates = getWeekDates(weekOffset - 1);
    const s = sb(); if (!s) return;

    const [shiftRes, prefRes] = await Promise.all([
      s.from("hq_shifts").select("*").gte("date", prevDates[0]).lte("date", prevDates[6]),
      s.from("hq_shift_preferences").select("*"),
    ]);

    if (!shiftRes.data || shiftRes.data.length === 0) { flash("이전 주 스케줄이 없습니다"); return; }
    const prefs = (prefRes.data || []) as ShiftPreference[];

    const prefMap: Record<string, ShiftPreference> = {};
    prefs.forEach(p => { prefMap[`${p.user_name}_${p.day_of_week}`] = p; });

    const inserts = (shiftRes.data as Shift[]).map(sh => {
      const dayIdx = prevDates.indexOf(sh.date);
      if (dayIdx < 0) return null;
      const newDate = weekDates[dayIdx];
      if (getShift(sh.user_name, newDate)) return null;

      const dow = new Date(newDate).getDay();
      const pref = prefMap[`${sh.user_name}_${dow}`];

      // 선호도 반영: 불가능한 날이면 건너뛰고, 선호 근무가 있으면 교체
      if (pref?.unavailable) return null;

      const shiftType = pref?.preferred_shift || sh.shift_type;
      const times = SHIFT_TIMES[shiftType] || { start: "", end: "" };

      return {
        user_name: sh.user_name, date: newDate, shift_type: shiftType,
        start_time: times.start, end_time: times.end, memo: sh.memo,
      };
    }).filter(Boolean);

    if (inserts.length === 0) { flash("복사할 스케줄이 없습니다 (선호도 반영 후)"); return; }
    await s.from("hq_shifts").insert(inserts);
    flash(`${inserts.length}건의 스케줄을 복사했습니다 (선호도 반영)`);
    load();
  }

  // ── 선호도 저장 ──────────────────────────────────────
  async function savePref(userName: string, dow: number, shift: string, unavail: boolean) {
    const s = sb(); if (!s) return;
    const existing = preferences.find(p => p.user_name === userName && p.day_of_week === dow);

    if (existing?.id) {
      await s.from("hq_shift_preferences").update({
        preferred_shift: shift, unavailable: unavail,
      }).eq("id", existing.id);
    } else {
      await s.from("hq_shift_preferences").insert({
        user_name: userName, day_of_week: dow,
        preferred_shift: shift, unavailable: unavail,
      });
    }
    loadPreferences();
  }

  function getPref(userName: string, dow: number): ShiftPreference | undefined {
    return preferences.find(p => p.user_name === userName && p.day_of_week === dow);
  }

  // ── 자동 배정 알고리즘 ────────────────────────────────
  async function runAutoAssign() {
    if (!canEdit) return;
    setAutoAssigning(true);
    const s = sb(); if (!s) { setAutoAssigning(false); return; }

    // 선호도 로드
    const { data: prefData } = await s.from("hq_shift_preferences").select("*");
    const prefs = (prefData || []) as ShiftPreference[];
    const prefMap: Record<string, ShiftPreference> = {};
    prefs.forEach(p => { prefMap[`${p.user_name}_${p.day_of_week}`] = p; });

    // 현재 주 기존 배정 확인 (이미 배정된 것은 건드리지 않음)
    const existingKeys = new Set(shifts.map(sh => `${sh.user_name}_${sh.date}`));

    // 시간 추적 (공정성 위해 현재 월 전체 기준)
    const monthD = getMonthDates(weekDates[0].slice(0, 7));
    const { data: monthShiftData } = await s.from("hq_shifts").select("*")
      .gte("date", monthD[0]).lte("date", monthD[monthD.length - 1]);
    const hourTracker: Record<string, number> = {};
    teamNames.forEach(n => { hourTracker[n] = 0; });
    (monthShiftData || []).forEach((sh: Shift) => {
      if (hourTracker[sh.user_name] !== undefined) {
        hourTracker[sh.user_name] += SHIFT_HOURS[sh.shift_type] || 0;
      }
    });

    const preview: PreviewAssignment[] = [];

    // 필요한 근무 유형 (주중: 주간+오후, 주말: 주간만 등 — 최소 1명씩)
    const requiredShifts: Record<number, string[]> = {
      0: ["주간"], 1: ["주간", "오후"], 2: ["주간", "오후"], 3: ["주간", "오후"],
      4: ["주간", "오후"], 5: ["주간", "오후"], 6: ["주간"],
    };

    for (const date of weekDates) {
      const dow = new Date(date).getDay();
      const required = requiredShifts[dow] || ["주간"];

      // 이 날 가용 인원 파악
      const available = teamNames.filter(name => {
        const pref = prefMap[`${name}_${dow}`];
        return !pref?.unavailable;
      });

      // 이미 배정된 인원과 그 근무 유형
      const alreadyAssigned = new Set<string>();
      const coveredTypes = new Set<string>();
      shifts.forEach(sh => {
        if (sh.date === date) {
          alreadyAssigned.add(sh.user_name);
          coveredTypes.add(sh.shift_type);
        }
      });
      // 미리보기에 있는 것도 반영
      preview.forEach(p => {
        if (p.date === date) {
          alreadyAssigned.add(p.user_name);
          coveredTypes.add(p.shift_type);
        }
      });

      // 각 필수 근무 유형에 대해 커버되지 않은 경우 배정
      for (const shiftType of required) {
        if (coveredTypes.has(shiftType)) continue;

        // 선호하는 사람 우선
        const preferring = available.filter(name =>
          !alreadyAssigned.has(name) &&
          !existingKeys.has(`${name}_${date}`) &&
          prefMap[`${name}_${dow}`]?.preferred_shift === shiftType
        );

        // 선호 없으면 가장 적게 근무한 사람
        const candidates = preferring.length > 0 ? preferring : available.filter(name =>
          !alreadyAssigned.has(name) && !existingKeys.has(`${name}_${date}`)
        );

        if (candidates.length === 0) continue;

        // 가장 적은 시간순 정렬
        candidates.sort((a, b) => (hourTracker[a] || 0) - (hourTracker[b] || 0));
        const chosen = candidates[0];
        const times = SHIFT_TIMES[shiftType];

        preview.push({
          user_name: chosen, date, shift_type: shiftType,
          start_time: times.start, end_time: times.end, memo: "자동배정",
        });
        alreadyAssigned.add(chosen);
        coveredTypes.add(shiftType);
        hourTracker[chosen] = (hourTracker[chosen] || 0) + (SHIFT_HOURS[shiftType] || 0);
      }

      // 선호도에 따라 아직 배정 안 된 사람에게 선호 근무 배정
      for (const name of available) {
        if (alreadyAssigned.has(name) || existingKeys.has(`${name}_${date}`)) continue;
        const pref = prefMap[`${name}_${dow}`];
        if (pref?.preferred_shift && ASSIGNABLE_SHIFT_TYPES.includes(pref.preferred_shift as typeof ASSIGNABLE_SHIFT_TYPES[number])) {
          const times = SHIFT_TIMES[pref.preferred_shift];
          preview.push({
            user_name: name, date, shift_type: pref.preferred_shift,
            start_time: times.start, end_time: times.end, memo: "자동배정",
          });
          alreadyAssigned.add(name);
          hourTracker[name] = (hourTracker[name] || 0) + (SHIFT_HOURS[pref.preferred_shift] || 0);
        }
      }

      // 아직 미배정 인원 — 가장 적은 시간 기준으로 기본 근무(주간) 배정
      const unassigned = available.filter(name =>
        !alreadyAssigned.has(name) && !existingKeys.has(`${name}_${date}`)
      );
      unassigned.sort((a, b) => (hourTracker[a] || 0) - (hourTracker[b] || 0));
      for (const name of unassigned) {
        const times = SHIFT_TIMES["주간"];
        preview.push({
          user_name: name, date, shift_type: "주간",
          start_time: times.start, end_time: times.end, memo: "자동배정",
        });
        hourTracker[name] = (hourTracker[name] || 0) + SHIFT_HOURS["주간"];
      }
    }

    setAutoPreview(preview);
    setAutoAssigning(false);
  }

  // ── 자동 배정 적용 ─────────────────────────────────────
  async function applyAutoAssign() {
    if (!autoPreview || autoPreview.length === 0) return;
    const s = sb(); if (!s) return;

    const inserts = autoPreview.map(p => ({
      user_name: p.user_name, date: p.date, shift_type: p.shift_type,
      start_time: p.start_time, end_time: p.end_time, memo: p.memo,
    }));

    await s.from("hq_shifts").insert(inserts);
    flash(`${inserts.length}건의 스케줄이 자동 배정되었습니다`);
    setAutoPreview(null);
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

  // ── 공정성 데이터 계산 ──────────────────────────────────
  const fairnessData = useMemo(() => {
    const hours: Record<string, number> = {};
    const counts: Record<string, number> = {};
    teamNames.forEach(n => { hours[n] = 0; counts[n] = 0; });
    fairnessShifts.forEach(sh => {
      if (hours[sh.user_name] !== undefined) {
        hours[sh.user_name] += SHIFT_HOURS[sh.shift_type] || 0;
        counts[sh.user_name]++;
      }
    });
    const allHours = Object.values(hours);
    const avg = allHours.length > 0 ? allHours.reduce((a, b) => a + b, 0) / allHours.length : 0;
    const maxH = Math.max(...allHours, 1);
    return { hours, counts, avg, maxH };
  }, [fairnessShifts, teamNames]);

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;

  return (
    <div className="space-y-4">
      {/* 서브탭 */}
      <div className={`${C} flex flex-wrap gap-2 items-center`}>
        <button className={subTab === "schedule" ? B : B2} onClick={() => setSubTab("schedule")}>스케줄</button>
        <button className={subTab === "preferences" ? B : B2} onClick={() => setSubTab("preferences")}>가용시간 설정</button>
        <button className={subTab === "fairness" ? B : B2} onClick={() => setSubTab("fairness")}>공정성 지표</button>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── 스케줄 탭 ──────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === "schedule" && (
        <>
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
              <div className="flex gap-2 flex-wrap">
                <button className={B2} onClick={copyPrevWeek}>이전 주 복사</button>
                <button className={B2} onClick={copyPrevWeekWithPrefs}>이전 주 복사 + 선호도 반영</button>
                <button className={B} onClick={runAutoAssign} disabled={autoAssigning}>
                  {autoAssigning ? "배정 중..." : "자동 배정"}
                </button>
              </div>
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

          {/* ── 자동 배정 미리보기 ────────────────────── */}
          {autoPreview && (
            <div className={C}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">자동 배정 미리보기</h3>
                <div className="flex gap-2">
                  <button className={B} onClick={applyAutoAssign}>적용 ({autoPreview.length}건)</button>
                  <button className={B2} onClick={() => setAutoPreview(null)}>취소</button>
                </div>
              </div>
              {autoPreview.length === 0 ? (
                <p className="text-slate-400 text-sm">배정할 스케줄이 없습니다. 모든 슬롯이 이미 채워져 있습니다.</p>
              ) : (
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
                      {teamNames.map(name => {
                        const hasPreview = autoPreview.some(p => p.user_name === name);
                        const hasExisting = weekDates.some(d => getShift(name, d));
                        if (!hasPreview && !hasExisting) return null;
                        return (
                          <tr key={name} className="border-b border-slate-50">
                            <td className="py-2 font-medium text-slate-700">{displayName(name)}</td>
                            {weekDates.map(date => {
                              const existing = getShift(name, date);
                              const preview = autoPreview.find(p => p.user_name === name && p.date === date);
                              const item = preview || existing;
                              return (
                                <td key={date} className="py-1 px-1 text-center">
                                  <div className={`rounded-lg px-1 py-1.5 text-xs font-medium min-h-[32px] flex items-center justify-center border ${
                                    item
                                      ? `${SHIFT_COLORS[item.shift_type] || "bg-slate-50 text-slate-600 border-slate-200"} ${preview ? "ring-2 ring-[#3182F6]/40" : ""}`
                                      : "bg-slate-50/50 text-slate-300 border-transparent"
                                  }`}>
                                    {item ? item.shift_type : "-"}
                                    {preview && <span className="ml-0.5 text-[10px] text-[#3182F6]">*</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-400 mt-2"><span className="text-[#3182F6]">*</span> 새로 배정되는 항목 (파란 테두리)</p>
                </div>
              )}
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
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── 가용시간 설정 탭 ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === "preferences" && (
        <div className={C}>
          <h3 className="font-bold text-slate-800 mb-4">직원 가용시간 / 선호 근무 설정</h3>
          <p className="text-sm text-slate-400 mb-4">각 요일별로 선호 근무 유형을 설정하거나, 해당 요일을 불가능으로 표시할 수 있습니다.</p>
          {prefLoading ? (
            <div className="text-center py-10 text-slate-400">불러오는 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 text-left font-medium text-slate-500 min-w-[120px]">팀원</th>
                    {DAY_LABELS.map((label, i) => (
                      <th key={i} className={`pb-2 text-center font-medium min-w-[110px] ${i === 0 || i === 6 ? "text-red-400" : "text-slate-500"}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamNames.map(name => {
                    const isMe = name === userName;
                    const canEditPref = canEdit || isMe;
                    return (
                      <tr key={name} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-slate-700">{displayName(name)}</td>
                        {DAY_LABELS.map((_, dow) => {
                          const pref = getPref(name, dow);
                          const isUnavail = pref?.unavailable || false;
                          const prefShift = pref?.preferred_shift || "";
                          return (
                            <td key={dow} className="py-1 px-1 text-center">
                              {canEditPref ? (
                                <div className="flex flex-col gap-1">
                                  <select
                                    className={`text-xs rounded-lg border px-1 py-1 ${isUnavail ? "bg-red-50 border-red-200 text-red-400" : "border-slate-200"}`}
                                    value={isUnavail ? "__unavail__" : prefShift}
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val === "__unavail__") {
                                        savePref(name, dow, prefShift, true);
                                      } else {
                                        savePref(name, dow, val, false);
                                      }
                                    }}
                                  >
                                    <option value="">미설정</option>
                                    {ASSIGNABLE_SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="__unavail__">불가</option>
                                  </select>
                                </div>
                              ) : (
                                <span className={`text-xs ${isUnavail ? "text-red-400" : "text-slate-500"}`}>
                                  {isUnavail ? "불가" : prefShift || "-"}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── 공정성 지표 탭 ─────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {subTab === "fairness" && (
        <div className={C}>
          <div className="flex items-center gap-4 mb-6">
            <h3 className="font-bold text-slate-800">공정성 지표</h3>
            <input
              type="month"
              className={`${I} max-w-[180px]`}
              value={fairnessMonth}
              onChange={e => setFairnessMonth(e.target.value)}
            />
          </div>

          {teamNames.length === 0 ? (
            <p className="text-slate-400 text-sm">팀원 데이터가 없습니다.</p>
          ) : (
            <>
              {/* 시간 기반 바 차트 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-600 mb-3">월간 근무 시간 (시간)</h4>
                <div className="space-y-2">
                  {teamNames.map(name => {
                    const hours = fairnessData.hours[name] || 0;
                    const pct = fairnessData.maxH > 0 ? (hours / fairnessData.maxH) * 100 : 0;
                    const diff = hours - fairnessData.avg;
                    const isOver = diff > fairnessData.avg * 0.2;
                    const isUnder = diff < -fairnessData.avg * 0.2;
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <div className="w-[120px] text-sm font-medium text-slate-700 truncate">{displayName(name)}</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver ? "bg-amber-400" : isUnder ? "bg-red-300" : "bg-[#3182F6]"
                            }`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                          {/* 평균 라인 */}
                          {fairnessData.maxH > 0 && (
                            <div
                              className="absolute top-0 h-full w-0.5 bg-slate-400"
                              style={{ left: `${(fairnessData.avg / fairnessData.maxH) * 100}%` }}
                              title={`평균: ${fairnessData.avg.toFixed(1)}h`}
                            />
                          )}
                        </div>
                        <div className="w-[80px] text-right">
                          <span className={`text-sm font-semibold ${isOver ? "text-amber-600" : isUnder ? "text-red-500" : "text-slate-700"}`}>
                            {fmt(hours)}h
                          </span>
                        </div>
                        {(isOver || isUnder) && (
                          <span className={`${BADGE} ${isOver ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                            {isOver ? "과다" : "부족"} ({diff > 0 ? "+" : ""}{diff.toFixed(1)}h)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-slate-400 rounded-full" /> 평균: {fairnessData.avg.toFixed(1)}h</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-[#3182F6] rounded-full" /> 정상 범위</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-amber-400 rounded-full" /> 과다 (+20%)</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-red-300 rounded-full" /> 부족 (-20%)</span>
                </div>
              </div>

              {/* 상세 테이블 */}
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-3">상세 현황</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-2 font-medium">팀원</th>
                        <th className="pb-2 font-medium text-center">총 근무일</th>
                        <th className="pb-2 font-medium text-center">총 시간</th>
                        <th className="pb-2 font-medium text-center">평균 대비</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamNames.map(name => {
                        const hours = fairnessData.hours[name] || 0;
                        const count = fairnessData.counts[name] || 0;
                        const diff = hours - fairnessData.avg;
                        const isOver = diff > fairnessData.avg * 0.2;
                        const isUnder = diff < -fairnessData.avg * 0.2;
                        return (
                          <tr key={name} className="border-b border-slate-50">
                            <td className="py-2 font-medium text-slate-700">{displayName(name)}</td>
                            <td className="text-center text-slate-600">{count}일</td>
                            <td className="text-center text-slate-600">{fmt(hours)}h</td>
                            <td className="text-center">
                              <span className={`${BADGE} ${isOver ? "bg-amber-50 text-amber-700" : isUnder ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(1)}h
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
