"use client";
import { C } from "@/app/hq/utils";

type SectionKey = "stats" | "todayTasks" | "approvals_attendance" | "recentActivity" | "kpi" | "goals" | "tasks" | "feedback" | "aars";

const ALL_SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "stats", label: "플랫폼 통계", icon: "👥" },
  { key: "todayTasks", label: "오늘 할 일", icon: "📌" },
  { key: "approvals_attendance", label: "결재 & 출근", icon: "📋" },
  { key: "recentActivity", label: "최근 활동", icon: "🕐" },
  { key: "kpi", label: "KPI", icon: "📊" },
  { key: "goals", label: "목표", icon: "🏆" },
  { key: "tasks", label: "태스크", icon: "✅" },
  { key: "feedback", label: "피드백", icon: "🐛" },
  { key: "aars", label: "AAR", icon: "📝" },
];

export interface WidgetPrefs {
  order: SectionKey[];
  hidden: SectionKey[];
}

interface Props {
  widgetPrefs: WidgetPrefs;
  dragItem: SectionKey | null;
  onDragStart: (key: SectionKey) => void;
  onDragOver: (e: React.DragEvent, key: SectionKey) => void;
  onDragEnd: () => void;
  onToggleVisibility: (key: SectionKey) => void;
  onMoveWidget: (key: SectionKey, dir: -1 | 1) => void;
  isSectionVisible: (key: SectionKey) => boolean;
}

export default function WidgetEditor({
  widgetPrefs, dragItem, onDragStart, onDragOver, onDragEnd,
  onToggleVisibility, onMoveWidget, isSectionVisible,
}: Props) {
  return (
    <div className={`${C} !p-4 border-[#3182F6]/30`}>
      <p className="text-xs font-bold text-slate-700 mb-2">위젯 순서 & 표시 설정 <span className="font-normal text-slate-400">— 드래그로 순서 변경, 눈 아이콘으로 표시/숨김</span></p>
      <div className="space-y-1">
        {widgetPrefs.order.map(key => {
          const sec = ALL_SECTIONS.find(s => s.key === key);
          if (!sec) return null;
          const visible = isSectionVisible(key);
          return (
            <div
              key={key}
              draggable
              onDragStart={() => onDragStart(key)}
              onDragOver={(e) => onDragOver(e, key)}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                dragItem === key ? "border-[#3182F6] bg-blue-50 shadow-md" : "border-slate-200 bg-white hover:bg-slate-50"
              } ${!visible ? "opacity-50" : ""}`}
            >
              <span className="text-slate-400 flex-shrink-0 cursor-grab">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/><circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/></svg>
              </span>
              <span className="text-sm">{sec.icon}</span>
              <span className="text-sm font-medium text-slate-700 flex-1">{sec.label}</span>
              <button onClick={() => onMoveWidget(key, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 md:hidden" title="위로">▲</button>
              <button onClick={() => onMoveWidget(key, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 md:hidden" title="아래로">▼</button>
              <button
                onClick={() => onToggleVisibility(key)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  visible ? "text-[#3182F6] hover:bg-blue-50" : "text-slate-300 hover:bg-slate-100"
                }`}
                title={visible ? "숨기기" : "표시"}
              >
                {visible ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { SectionKey };
export { ALL_SECTIONS };
