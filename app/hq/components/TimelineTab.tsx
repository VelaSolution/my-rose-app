"use client";

import { useState, useEffect } from "react";
import { HQRole } from "@/app/hq/types";
import { sb, C, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

interface TimelineEntry {
  id: string;
  type: string;
  icon: string;
  title: string;
  description: string;
  date: string;
}

const TYPE_COLORS: Record<string, string> = {
  mett: "bg-purple-100 text-purple-600",
  metric: "bg-blue-100 text-blue-600",
  goal: "bg-emerald-100 text-emerald-600",
  task: "bg-amber-100 text-amber-600",
  aar: "bg-rose-100 text-rose-600",
  notice: "bg-slate-100 text-slate-600",
};

const TYPE_ICONS: Record<string, string> = {
  mett: "🎯",
  metric: "📊",
  goal: "🏆",
  task: "✅",
  aar: "📝",
  notice: "📢",
};

const TYPE_LABELS: Record<string, string> = {
  mett: "상황판단",
  metric: "KPI",
  goal: "목표",
  task: "태스크",
  aar: "AAR",
  notice: "공지",
};

export default function TimelineTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = sb();
      if (!s) return setLoading(false);

      const all: TimelineEntry[] = [];

      const [mett, metrics, goals, tasks, aars, notices] = await Promise.all([
        s.from("hq_mett").select("*").order("created_at", { ascending: false }).limit(30),
        s.from("hq_metrics").select("*").order("date", { ascending: false }).limit(30),
        s.from("hq_goals").select("*").order("start_date", { ascending: false }).limit(30),
        s.from("hq_tasks").select("*").order("deadline", { ascending: false }).limit(30),
        s.from("hq_aar").select("*").order("date", { ascending: false }).limit(30),
        s.from("hq_notices").select("*").order("created_at", { ascending: false }).limit(30),
      ]);

      if (mett.data)
        mett.data.forEach((r: any) =>
          all.push({
            id: `mett-${r.id}`,
            type: "mett",
            icon: TYPE_ICONS.mett,
            title: `상황판단: ${r.mission?.slice(0, 40) || "신규"}`,
            description: r.mission || "",
            date: r.created_at,
          })
        );

      if (metrics.data)
        metrics.data.forEach((r: any) =>
          all.push({
            id: `metric-${r.id}`,
            type: "metric",
            icon: TYPE_ICONS.metric,
            title: `KPI 기록 (${r.date})`,
            description: `매출 ${(r.revenue || 0).toLocaleString()}원 · 사용자 ${r.users_count || 0}명`,
            date: r.date,
          })
        );

      if (goals.data)
        goals.data.forEach((r: any) =>
          all.push({
            id: `goal-${r.id}`,
            type: "goal",
            icon: TYPE_ICONS.goal,
            title: r.title,
            description: `목표 ${r.target_value} · 현재 ${r.current_value} (${r.status})`,
            date: r.start_date,
          })
        );

      if (tasks.data)
        tasks.data.forEach((r: any) =>
          all.push({
            id: `task-${r.id}`,
            type: "task",
            icon: TYPE_ICONS.task,
            title: r.title,
            description: `담당: ${displayName(r.assignee || "-")} · 마감: ${r.deadline || "-"}`,
            date: r.deadline || r.created_at || new Date().toISOString(),
          })
        );

      if (aars.data)
        aars.data.forEach((r: any) =>
          all.push({
            id: `aar-${r.id}`,
            type: "aar",
            icon: TYPE_ICONS.aar,
            title: `AAR: ${r.goal?.slice(0, 40) || "기록"}`,
            description: r.result || "",
            date: r.date,
          })
        );

      if (notices.data)
        notices.data.forEach((r: any) =>
          all.push({
            id: `notice-${r.id}`,
            type: "notice",
            icon: TYPE_ICONS.notice,
            title: r.title,
            description: r.content?.slice(0, 80) || "",
            date: r.created_at,
          })
        );

      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(all);
      setLoading(false);
    })();
  }, []);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className={C}>
      <h3 className="text-lg font-bold text-slate-800 mb-6">
        활동 타임라인
        <span className="text-sm font-normal text-slate-400 ml-2">
          최근 활동 내역
        </span>
      </h3>

      {loading ? (
        <p className="text-sm text-slate-400 py-12 text-center">
          불러오는 중...
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">
          타임라인 데이터가 없습니다
        </p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-0">
            {entries.map((e, i) => (
              <div key={e.id} className="relative flex gap-4 pb-6">
                {/* Icon circle */}
                <div
                  className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base ${
                    TYPE_COLORS[e.type] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {e.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      {TYPE_LABELS[e.type] || e.type}
                    </span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(e.date)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    {e.title}
                  </p>
                  {e.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {e.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
