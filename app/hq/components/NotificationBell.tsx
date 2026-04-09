"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, today, BADGE } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  onNavigate: (tab: string) => void;
}

interface Notification {
  id: string;
  icon: string;
  title: string;
  time: string;
  tab: string;
}

const LS_KEY = "hq_read_notifications";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default function NotificationBell({ userId, userName, myRole, onNavigate }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const s = sb();
    if (!s) return;

    const items: Notification[] = [];
    const todayStr = today();

    try {
      // 1. 대기 중인 결재
      const { data: approvals } = await s
        .from("hq_approvals")
        .select("id, title, date")
        .eq("status", "대기")
        .eq("approver", userName);
      if (approvals) {
        for (const a of approvals as any[]) {
          items.push({ id: `approval-${a.id}`, icon: "📋", title: `결재 대기: ${a.title}`, time: a.date, tab: "approval" });
        }
      }
    } catch {}

    try {
      // 2. 읽지 않은 공지
      const { data: notices } = await s
        .from("hq_notices")
        .select("id, title, date, read_by")
        .order("date", { ascending: false })
        .limit(20);
      if (notices) {
        for (const n of notices as any[]) {
          const readBy: string[] = n.read_by ?? [];
          if (!readBy.includes(userName)) {
            items.push({ id: `notice-${n.id}`, icon: "📢", title: `새 공지: ${n.title}`, time: n.date, tab: "notice" });
          }
        }
      }
    } catch {}

    try {
      // 3. 오늘 마감 태스크
      const { data: tasks } = await s
        .from("hq_tasks")
        .select("id, title, deadline, status")
        .eq("deadline", todayStr)
        .eq("user_id", userId);
      if (tasks) {
        for (const t of tasks as any[]) {
          if (t.status !== "completed" && t.status !== "failed") {
            items.push({ id: `task-${t.id}`, icon: "⏰", title: `오늘 마감: ${t.title}`, time: todayStr, tab: "task" });
          }
        }
      }
    } catch {}

    try {
      // 4. 승인/반려된 내 휴가
      const { data: leaves } = await s
        .from("hq_leave")
        .select("id, type, status, date")
        .eq("requester", userName)
        .in("status", ["승인", "반려"]);
      if (leaves) {
        for (const l of leaves as any[]) {
          const label = l.status === "승인" ? "승인됨" : "반려됨";
          items.push({ id: `leave-${l.id}`, icon: "🏖️", title: `휴가 ${label}: ${l.type}`, time: l.date, tab: "leave" });
        }
      }
    } catch {}

    setNotifications(items);
  }, [userId, userName]);

  // Load read IDs from localStorage
  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  // Fetch on mount + auto-refresh every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  function markAllRead() {
    const newIds = new Set(readIds);
    for (const n of notifications) newIds.add(n.id);
    setReadIds(newIds);
    saveReadIds(newIds);
  }

  function handleClick(n: Notification) {
    const newIds = new Set(readIds);
    newIds.add(n.id);
    setReadIds(newIds);
    saveReadIds(newIds);
    setOpen(false);
    onNavigate(n.tab);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition text-slate-500 relative"
        title="알림"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">알림</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#3182F6] font-semibold hover:underline">
                모두 읽음
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">알림이 없습니다</p>
            ) : (
              notifications.map(n => {
                const isRead = readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition border-b border-slate-50 ${
                      isRead ? "opacity-50" : ""
                    }`}
                  >
                    <span className="text-base mt-0.5 flex-shrink-0">{n.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isRead ? "text-slate-500" : "text-slate-800 font-semibold"}`}>{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.time)}</p>
                    </div>
                    {!isRead && <div className="w-2 h-2 rounded-full bg-[#3182F6] mt-1.5 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
