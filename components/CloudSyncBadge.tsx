"use client";

import { useState } from "react";
import type { SyncStatus } from "@/lib/useCloudSync";

interface Props {
  status: SyncStatus;
  userId: string | null;
  storageMode?: "cloud" | "local";
  lastSyncedAt?: Date | null;
  onRetry?: () => void;
  onSaveNow?: () => void;
}

function getRelativeTime(date: Date | null | undefined): string | null {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.floor(diffHours / 24)}일 전`;
}

const STATUS_MAP: Record<SyncStatus, { label: string; bg: string; text: string; icon: string }> = {
  idle:    { label: "",          bg: "",                    text: "",                  icon: "" },
  saving:  { label: "저장 중…",  bg: "bg-blue-50",          text: "text-blue-600",     icon: "⏳" },
  saved:   { label: "저장 완료", bg: "bg-emerald-50",       text: "text-emerald-600",  icon: "☁️" },
  offline: { label: "오프라인",  bg: "bg-slate-100",        text: "text-slate-500",    icon: "📴" },
  error:   { label: "저장 실패", bg: "bg-red-50",           text: "text-red-500",      icon: "⚠️" },
};

export default function CloudSyncBadge({
  status,
  userId,
  storageMode,
  lastSyncedAt,
  onRetry,
  onSaveNow,
}: Props) {
  const [hovered, setHovered] = useState(false);

  // 저장 모드 결정: prop 우선, 없으면 userId 기반 추론
  const mode = storageMode ?? (userId ? "cloud" : "local");
  const relTime = getRelativeTime(lastSyncedAt);

  // ── idle 상태: 저장 모드 표시 ──
  if (status === "idle") {
    if (mode === "local") {
      return (
        <span
          role="status"
          className="group inline-flex items-center gap-1.5 text-[11px] text-amber-600 font-medium"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          💾 로컬 · <a href="/login" className="underline underline-offset-2 hover:text-amber-700">로그인하면 클라우드 동기화</a>
          {hovered && onSaveNow && (
            <button
              type="button"
              onClick={onSaveNow}
              className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-bold transition"
            >
              지금 저장
            </button>
          )}
        </span>
      );
    }

    return (
      <span
        role="status"
        aria-live="polite"
        className="group inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        ☁️ 클라우드
        {relTime && <span className="text-slate-400">· 최근 동기화 {relTime}</span>}
        {hovered && onSaveNow && (
          <button
            type="button"
            onClick={onSaveNow}
            className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition"
          >
            지금 저장
          </button>
        )}
      </span>
    );
  }

  // ── saving 상태: 애니메이션 표시 ──
  if (status === "saving") {
    return (
      <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 transition-all">
        <span className="inline-block animate-spin text-[10px]">⏳</span> 저장 중…
      </span>
    );
  }

  // ── error 상태 ──
  if (status === "error") {
    return (
      <span role="status" aria-live="assertive" className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 ring-1 ring-red-200 transition-all">
        ⚠️ 동기화 실패
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 px-1.5 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold transition"
          >
            재시도
          </button>
        )}
      </span>
    );
  }

  // ── saved / offline 등 나머지 ──
  const s = STATUS_MAP[status];
  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg ${s.bg} ${s.text} transition-all`}>
      {s.icon} {s.label}
    </span>
  );
}

/** 충돌 배너 컴포넌트 — 페이지에서 직접 사용 */
export function ConflictBanner({
  onResolve,
}: {
  onResolve: (choice: "local" | "cloud") => void;
}) {
  return (
    <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-5 py-4 mb-4 flex items-center gap-3 flex-wrap">
      <span className="text-lg">⚠️</span>
      <p className="flex-1 text-sm font-semibold text-yellow-800">
        로컬/클라우드 데이터 충돌이 감지되었습니다
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onResolve("local")}
          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition"
        >
          💾 로컬 데이터 사용
        </button>
        <button
          type="button"
          onClick={() => onResolve("cloud")}
          className="px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold transition"
        >
          ☁️ 클라우드 데이터 사용
        </button>
      </div>
    </div>
  );
}
