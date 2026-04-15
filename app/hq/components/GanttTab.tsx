"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import type { HQRole, Goal, Task } from "@/app/hq/types";
import { sb, C, BADGE } from "@/app/hq/utils";
import { ST } from "@/app/hq/types";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

interface GanttItem {
  id: string;
  name: string;
  type: "goal" | "task";
  startDate: string;
  endDate: string;
  status: string;
}

const DAY_WIDTH = 36;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 52;
const LABEL_WIDTH = 200;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-[#3182F6]",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
  pending: "bg-slate-400",
  planned: "bg-slate-400",
  in_progress: "bg-amber-500",
  review: "bg-purple-500",
};

export default function GanttTab({ userId, userName, myRole, flash }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GanttItem | null>(null);
  const [rangeOffset, setRangeOffset] = useState(0); // offset in 30-day chunks
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const s = sb();
      if (!s) { setLoading(false); return; }
      const [gRes, tRes] = await Promise.all([
        s.from("hq_goals").select("*").eq("user_id", userId).order("start_date", { ascending: true }),
        s.from("hq_tasks").select("*").eq("user_id", userId).order("deadline", { ascending: true }),
      ]);
      if (gRes.data) setGoals(gRes.data as Goal[]);
      if (tRes.data) setTasks(tRes.data as Task[]);
      setLoading(false);
    })();
  }, [userId]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const rangeStart = useMemo(() => addDays(today, rangeOffset * 30 - 15), [today, rangeOffset]);
  const totalDays = 60; // show 60 days for wider view
  const rangeEnd = useMemo(() => addDays(rangeStart, totalDays), [rangeStart, totalDays]);

  // Build gantt items
  const items = useMemo(() => {
    const result: GanttItem[] = [];
    for (const g of goals) {
      if (g.start_date && g.end_date) {
        result.push({
          id: g.id,
          name: g.title,
          type: "goal",
          startDate: g.start_date,
          endDate: g.end_date,
          status: g.status,
        });
      }
    }
    for (const t of tasks) {
      if (t.deadline) {
        result.push({
          id: t.id,
          name: t.title,
          type: "task",
          startDate: t.deadline,
          endDate: t.deadline,
          status: t.status,
        });
      }
    }
    return result;
  }, [goals, tasks]);

  // Generate date columns
  const dates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      arr.push(addDays(rangeStart, i));
    }
    return arr;
  }, [rangeStart, totalDays]);

  const todayOffset = daysBetween(rangeStart, today);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset * DAY_WIDTH - 200);
    }
  }, [todayOffset, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3182F6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${C} !p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">간트 차트</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRangeOffset(o => o - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5" /></svg>
            </button>
            <button
              onClick={() => setRangeOffset(0)}
              className="rounded-lg bg-[#3182F6]/10 text-[#3182F6] px-3 py-1.5 text-xs font-semibold hover:bg-[#3182F6]/20 transition-colors"
            >
              오늘
            </button>
            <button
              onClick={() => setRangeOffset(o => o + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 2l5 5-5 5" /></svg>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#3182F6]" />
            <span>목표</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded bg-amber-500" />
            <span>태스크</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-red-500" />
            <span>오늘</span>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">표시할 목표나 태스크가 없습니다.</p>
        ) : (
          <>
          <p className="md:hidden text-xs text-slate-400 mb-2">← 좌우로 스크롤하세요</p>
          <div className="flex border border-slate-200 rounded-xl overflow-hidden">
            {/* Left labels */}
            <div className="flex-shrink-0 border-r border-slate-200 bg-slate-50" style={{ width: LABEL_WIDTH }}>
              {/* Header spacer */}
              <div className="border-b border-slate-200 px-3 flex items-center" style={{ height: HEADER_HEIGHT }}>
                <span className="text-xs font-semibold text-slate-500">항목</span>
              </div>
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => setSelectedItem(item)}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.type === "goal" ? "bg-blue-50 text-[#3182F6]" : "bg-amber-50 text-amber-700"}`}>
                    {item.type === "goal" ? "목표" : "태스크"}
                  </span>
                  <span className="text-xs text-slate-700 truncate flex-1">{item.name}</span>
                </div>
              ))}
            </div>

            {/* Right scrollable chart area */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto">
              <div style={{ width: totalDays * DAY_WIDTH, position: "relative" }}>
                {/* Date header */}
                <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10" style={{ height: HEADER_HEIGHT }}>
                  {dates.map((d, i) => {
                    const isToday = d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
                    const isSun = d.getDay() === 0;
                    const isSat = d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-100 text-[10px] ${
                          isToday ? "bg-red-50 font-bold text-red-600" : isSun ? "text-red-400" : isSat ? "text-blue-400" : "text-slate-400"
                        }`}
                        style={{ width: DAY_WIDTH }}
                      >
                        <span>{formatDate(d)}</span>
                        <span className="text-[9px]">{["일","월","화","수","목","금","토"][d.getDay()]}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Rows */}
                {items.map(item => {
                  const itemStart = new Date(item.startDate);
                  const itemEnd = new Date(item.endDate);
                  itemStart.setHours(0, 0, 0, 0);
                  itemEnd.setHours(0, 0, 0, 0);

                  const startOffset = daysBetween(rangeStart, itemStart);
                  const endOffset = daysBetween(rangeStart, itemEnd);
                  const barStart = Math.max(0, startOffset);
                  const barEnd = Math.min(totalDays - 1, endOffset);
                  const barWidth = Math.max(1, barEnd - barStart + 1) * DAY_WIDTH;
                  const barLeft = barStart * DAY_WIDTH;
                  const isVisible = barEnd >= 0 && barStart < totalDays;
                  const barColor = STATUS_COLORS[item.status] ?? "bg-slate-400";

                  return (
                    <div
                      key={item.id}
                      className="relative border-b border-slate-50"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {/* Weekend backgrounds */}
                      {dates.map((d, i) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        if (!isWeekend) return null;
                        return (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 bg-slate-50/50"
                            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                          />
                        );
                      })}

                      {/* Bar */}
                      {isVisible && (
                        <div
                          className={`absolute ${barColor} rounded-md cursor-pointer hover:opacity-80 transition-opacity shadow-sm ${
                            item.type === "goal" ? "h-5 top-[10px]" : "h-3.5 top-[13px]"
                          }`}
                          style={{ left: barLeft, width: barWidth, minWidth: DAY_WIDTH * 0.8 }}
                          onClick={() => setSelectedItem(item)}
                          title={`${item.name} (${item.startDate} ~ ${item.endDate})`}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Today marker */}
                {todayOffset >= 0 && todayOffset < totalDays && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                    style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2, height: HEADER_HEIGHT + items.length * ROW_HEIGHT }}
                  />
                )}
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Detail popup */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <span className={`${BADGE} text-[10px] ${selectedItem.type === "goal" ? "bg-blue-50 text-[#3182F6]" : "bg-amber-50 text-amber-700"}`}>
                  {selectedItem.type === "goal" ? "목표" : "태스크"}
                </span>
                <h3 className="text-lg font-bold text-slate-900 flex-1 truncate">{selectedItem.name}</h3>
                <button onClick={() => setSelectedItem(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">시작일</p>
                  <p className="text-sm text-slate-700">{selectedItem.startDate}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">종료일</p>
                  <p className="text-sm text-slate-700">{selectedItem.endDate}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">상태</p>
                  <span className={`${BADGE} text-[10px] ${(ST[selectedItem.status] ?? ST.pending).bg}`}>
                    {(ST[selectedItem.status] ?? ST.pending).label}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">기간</p>
                  <p className="text-sm text-slate-700">
                    {daysBetween(new Date(selectedItem.startDate), new Date(selectedItem.endDate)) + 1}일
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
