"use client";
import { useState, useEffect } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, C, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

type AuditEntry = {
  id: string;
  type: string;
  icon: string;
  description: string;
  author: string;
  createdAt: string;
};

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  "태스크 생성": { icon: "✅", label: "태스크", color: "bg-blue-50 text-blue-700" },
  "결재 요청": { icon: "📋", label: "결재", color: "bg-amber-50 text-amber-700" },
  "공지 등록": { icon: "📢", label: "공지", color: "bg-emerald-50 text-emerald-700" },
  "피드백 등록": { icon: "🐛", label: "피드백", color: "bg-purple-50 text-purple-700" },
  "의사결정 등록": { icon: "⚖️", label: "의사결정", color: "bg-slate-100 text-slate-700" },
  "휴가 신청": { icon: "🏖️", label: "휴가", color: "bg-orange-50 text-orange-700" },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "방금";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function AuditLog({ flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("전체");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const s = sb();
    if (!s) { setLoading(false); return; }

    try {
      const [tasks, approvals, notices, feedback, decisions, leaves] = await Promise.all([
        s.from("hq_tasks").select("id, created_at, title").order("created_at", { ascending: false }).limit(50),
        s.from("hq_approvals").select("id, created_at, title, author").order("created_at", { ascending: false }).limit(50),
        s.from("hq_notices").select("id, created_at, title, author").order("created_at", { ascending: false }).limit(50),
        s.from("hq_feedback").select("id, created_at, title, author").order("created_at", { ascending: false }).limit(50),
        s.from("hq_decisions").select("id, created_at, title").order("created_at", { ascending: false }).limit(50),
        s.from("hq_leave").select("id, created_at, requester, type").order("created_at", { ascending: false }).limit(50),
      ]);

      const all: AuditEntry[] = [];

      (tasks.data ?? []).forEach((r: any) => all.push({
        id: `task-${r.id}`, type: "태스크 생성", icon: "✅",
        description: r.title || "새 태스크", author: "", createdAt: r.created_at,
      }));
      (approvals.data ?? []).forEach((r: any) => all.push({
        id: `appr-${r.id}`, type: "결재 요청", icon: "📋",
        description: r.title || "결재 요청", author: r.author || "", createdAt: r.created_at,
      }));
      (notices.data ?? []).forEach((r: any) => all.push({
        id: `notice-${r.id}`, type: "공지 등록", icon: "📢",
        description: r.title || "새 공지", author: r.author || "", createdAt: r.created_at,
      }));
      (feedback.data ?? []).forEach((r: any) => all.push({
        id: `fb-${r.id}`, type: "피드백 등록", icon: "🐛",
        description: r.title || "피드백", author: r.author || "", createdAt: r.created_at,
      }));
      (decisions.data ?? []).forEach((r: any) => all.push({
        id: `dec-${r.id}`, type: "의사결정 등록", icon: "⚖️",
        description: r.title || "의사결정", author: "", createdAt: r.created_at,
      }));
      (leaves.data ?? []).forEach((r: any) => all.push({
        id: `leave-${r.id}`, type: "휴가 신청", icon: "🏖️",
        description: `${r.requester || ""}님 ${r.type || "휴가"} 신청`, author: r.requester || "", createdAt: r.created_at,
      }));

      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEntries(all.slice(0, 50));
    } catch (e) {
      flash("활동 로그 로드 실패");
    }
    setLoading(false);
  }

  const types = ["전체", ...Object.keys(TYPE_CONFIG)];
  const filtered = filterType === "전체" ? entries : entries.filter(e => e.type === filterType);

  if (loading) return <p className="text-center text-sm text-slate-400 py-12">불러오는 중...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">활동 로그</h2>

      {/* Filter */}
      <div className="flex flex-wrap gap-1.5">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterType === t ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {t === "전체" ? "전체" : `${TYPE_CONFIG[t]?.icon} ${TYPE_CONFIG[t]?.label}`}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className={C}>
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">활동 내역이 없습니다</p>
        ) : (
          <div className="space-y-1">
            {filtered.map((entry) => {
              const cfg = TYPE_CONFIG[entry.type];
              return (
                <div key={entry.id} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-base">
                    {entry.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ${cfg?.color ?? "bg-slate-100 text-slate-600"}`}>
                        {entry.type}
                      </span>
                      {entry.author && (
                        <span className="text-[11px] text-slate-400 font-medium">{displayName(entry.author)}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 font-medium truncate">{entry.description}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400 font-medium mt-0.5">
                    {relativeTime(entry.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
