"use client";

import type { SyncStatus } from "@/lib/useCloudSync";

const STATUS_MAP: Record<SyncStatus, { label: string; bg: string; text: string; icon: string }> = {
  idle:    { label: "",         bg: "",                    text: "",              icon: "" },
  saving:  { label: "저장 중…", bg: "bg-blue-50",          text: "text-blue-600", icon: "⏳" },
  saved:   { label: "저장 완료", bg: "bg-emerald-50",      text: "text-emerald-600", icon: "☁️" },
  offline: { label: "오프라인",  bg: "bg-slate-100",        text: "text-slate-500", icon: "📴" },
  error:   { label: "저장 실패", bg: "bg-red-50",           text: "text-red-500",  icon: "⚠️" },
};

export default function CloudSyncBadge({
  status,
  userId,
}: {
  status: SyncStatus;
  userId: string | null;
}) {
  if (status === "idle" && !userId) return null;
  if (status === "idle") {
    // 로그인 상태에서 idle이면 클라우드 연결 표시
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
        ☁️ 클라우드 연결됨
      </span>
    );
  }

  const s = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg ${s.bg} ${s.text} transition-all`}>
      {s.icon} {s.label}
    </span>
  );
}
