"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { HQRole } from "@/app/hq/types";
import { sb, today, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

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

/* ── Supabase row interfaces ── */
interface ApprovalRow { id: string; title: string; date: string; }
interface NoticeRow { id: string; title: string; date: string; read_by?: string[]; }
interface TaskRow { id: string; title: string; deadline: string; status: string; }
interface LeaveRow { id: string; type: string; status: string; date: string; }
interface ChatRow { id: string; sender: string; text: string; created_at: string; }
interface DmRow { id: string; sender: string; text: string; created_at: string; receiver?: string; }
interface FeedbackRow { id: string; title: string; author: string; date: string; }
interface ReportRow { id: string; title: string; status: string; date: string; author: string; }
interface BoardRow { id: string; title: string; author: string; date: string; }
interface SurveyRow { id: string; title: string; author: string; date: string; status: string; }

interface SupabaseQueryResult<T> { data: T[] | null; error: unknown; }

/* ── Realtime payload row (minimal shape for .new) ── */
interface RealtimeNewRow { sender?: string; author?: string; receiver?: string; }

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

// 브라우저 알림 보내기
function sendBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "granted") return;
  if (document.hasFocus()) return; // 탭 활성 상태면 안 보냄
  try {
    new window.Notification(title, { body, icon: "/icon.svg", tag: "vela-hq" });
  } catch {}
}

export default function NotificationBell({ userId, userName, myRole, onNavigate }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission === "granted") { setPushEnabled(true); return; }
    if (window.Notification.permission === "default") {
      window.Notification.requestPermission().then(p => setPushEnabled(p === "granted"));
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const s = sb();
    if (!s) return;

    const items: Notification[] = [];
    const todayStr = today();

    // 전체 쿼리를 병렬 실행
    // 기존 10개 소스
    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10] = await Promise.all([
      s.from("hq_approvals").select("id, title, date").eq("status", "대기").eq("approver", userName).then((res: SupabaseQueryResult<ApprovalRow>) => res.data).catch(() => null),
      s.from("hq_notices").select("id, title, date, read_by").order("date", { ascending: false }).limit(20).then((res: SupabaseQueryResult<NoticeRow>) => res.data).catch(() => null),
      s.from("hq_tasks").select("id, title, deadline, status").eq("deadline", todayStr).eq("user_id", userId).then((res: SupabaseQueryResult<TaskRow>) => res.data).catch(() => null),
      s.from("hq_leave").select("id, type, status, date").eq("requester", userName).in("status", ["승인", "반려"]).then((res: SupabaseQueryResult<LeaveRow>) => res.data).catch(() => null),
      s.from("hq_chat").select("id, sender, text, created_at").neq("sender", userName).order("created_at", { ascending: false }).limit(10).then((res: SupabaseQueryResult<ChatRow>) => res.data).catch(() => null),
      s.from("hq_dm").select("id, sender, text, created_at").eq("receiver", userName).order("created_at", { ascending: false }).limit(10).then((res: SupabaseQueryResult<DmRow>) => res.data).catch(() => null),
      s.from("hq_feedback").select("id, title, author, date").order("date", { ascending: false }).limit(10).then((res: SupabaseQueryResult<FeedbackRow>) => res.data).catch(() => null),
      s.from("hq_reports").select("id, title, status, date, author").eq("status", "submitted").order("date", { ascending: false }).limit(10).then((res: SupabaseQueryResult<ReportRow>) => res.data).catch(() => null),
      s.from("hq_board").select("id, title, author, date").order("date", { ascending: false }).limit(10).then((res: SupabaseQueryResult<BoardRow>) => res.data).catch(() => null),
      s.from("hq_surveys").select("id, title, author, date, status").eq("status", "진행중").order("date", { ascending: false }).limit(5).then((res: SupabaseQueryResult<SurveyRow>) => res.data).catch(() => null),
    ]);

    // 추가 소스: 휴가 신청(대표/이사에게), 위키, 파일, 결재 상태 변경, 캘린더
    const canApprove = myRole === "대표" || myRole === "이사" || myRole === "팀장";
    const [rLeaveReq, rWiki, rFiles, rApprovalDone, rCalendar] = await Promise.all([
      canApprove ? s.from("hq_leave").select("id, type, status, date, requester").eq("status", "대기").order("date", { ascending: false }).limit(10).then((res: SupabaseQueryResult<LeaveRow & { requester: string }>) => res.data).catch(() => null) : null,
      s.from("hq_wiki").select("id, title, author, updated_at").order("updated_at", { ascending: false }).limit(5).then((res: SupabaseQueryResult<{ id: string; title: string; author: string; updated_at: string }>) => res.data).catch(() => null),
      s.from("hq_files").select("id, name, uploaded_by, created_at").order("created_at", { ascending: false }).limit(5).then((res: SupabaseQueryResult<{ id: string; name: string; uploaded_by: string; created_at: string }>) => res.data).catch(() => null),
      s.from("hq_approvals").select("id, title, status, date, author").in("status", ["승인", "반려"]).eq("author", userName).order("date", { ascending: false }).limit(5).then((res: SupabaseQueryResult<ApprovalRow & { status: string; author: string }>) => res.data).catch(() => null),
      s.from("hq_calendar").select("id, title, date, author").gte("date", todayStr).order("date", { ascending: true }).limit(5).then((res: SupabaseQueryResult<{ id: string; title: string; date: string; author: string }>) => res.data).catch(() => null),
    ]);

    if (r1) for (const a of r1) items.push({ id: `approval-${a.id}`, icon: "📋", title: `결재 대기: ${a.title}`, time: a.date, tab: "approval" });
    if (r2) for (const n of r2) { if (!(n.read_by ?? []).includes(userName)) items.push({ id: `notice-${n.id}`, icon: "📢", title: `새 공지: ${n.title}`, time: n.date, tab: "notice" }); }
    if (r3) for (const t of r3) { if (t.status !== "completed" && t.status !== "failed") items.push({ id: `task-${t.id}`, icon: "⏰", title: `오늘 마감: ${t.title}`, time: todayStr, tab: "task" }); }
    if (r4) for (const l of r4) items.push({ id: `leave-${l.id}`, icon: "🏖️", title: `휴가 ${l.status === "승인" ? "승인됨" : "반려됨"}: ${l.type}`, time: l.date, tab: "leave" });
    if (r5) for (const c of r5) items.push({ id: `chat-${c.id}`, icon: "💬", title: `${displayName(c.sender)}: ${c.text.slice(0, 30)}`, time: c.created_at, tab: "chat" });
    if (r6) for (const d of r6) items.push({ id: `dm-${d.id}`, icon: "✉️", title: `DM ${displayName(d.sender)}: ${d.text.slice(0, 30)}`, time: d.created_at, tab: "chat" });
    if (r7) for (const f of r7) { if (f.author !== userName) items.push({ id: `feedback-${f.id}`, icon: "🐛", title: `피드백: ${f.title}`, time: f.date, tab: "feedback" }); }
    if (r8) for (const r of r8) { if (r.author !== userName) items.push({ id: `report-${r.id}`, icon: "📄", title: `보고서 제출: ${r.title ?? "무제"}`, time: r.date, tab: "report" }); }
    if (r9) for (const b of r9) { if (b.author !== userName) items.push({ id: `board-${b.id}`, icon: "📝", title: `게시판: ${b.title}`, time: b.date, tab: "board" }); }
    if (r10) for (const sv of r10) { if (sv.author !== userName) items.push({ id: `survey-${sv.id}`, icon: "📊", title: `설문 참여: ${sv.title}`, time: sv.date, tab: "survey" }); }

    // 추가 알림
    if (rLeaveReq) for (const l of rLeaveReq) { if (l.requester !== userName) items.push({ id: `leave-req-${l.id}`, icon: "📩", title: `휴가 신청: ${l.requester} (${l.type})`, time: l.date, tab: "leave" }); }
    if (rWiki) for (const w of rWiki) { if (w.author !== userName) items.push({ id: `wiki-${w.id}`, icon: "📖", title: `위키 수정: ${w.title}`, time: w.updated_at, tab: "wiki" }); }
    if (rFiles) for (const f of rFiles) { if (f.uploaded_by !== userName) items.push({ id: `file-${f.id}`, icon: "📁", title: `파일 업로드: ${f.name}`, time: f.created_at, tab: "files" }); }
    if (rApprovalDone) for (const a of rApprovalDone) items.push({ id: `approval-done-${a.id}`, icon: a.status === "승인" ? "✅" : "❌", title: `결재 ${a.status}: ${a.title}`, time: a.date, tab: "approval" });
    if (rCalendar) for (const c of rCalendar) items.push({ id: `cal-${c.id}`, icon: "📅", title: `일정: ${c.title}`, time: c.date, tab: "calendar" });

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setNotifications(items);
  }, [userId, userName]);

  // Load read IDs from localStorage
  useEffect(() => { setReadIds(getReadIds()); }, []);

  // Fetch on mount + auto-refresh every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Realtime: 채팅, DM, 결재, 공지 실시간 감지
  useEffect(() => {
    const s = sb();
    if (!s) return;
    const withPush = (title: string) => (payload: RealtimePostgresChangesPayload<RealtimeNewRow>) => {
      fetchNotifications();
      const newRow = payload.new as RealtimeNewRow | undefined;
      const sender = newRow?.sender || newRow?.author || "";
      if (sender && sender !== userName) {
        sendBrowserNotification("VELA HQ", `${title}: ${sender}`);
      }
    };
    const channel = s
      .channel("hq_notifications")
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_chat" } as Record<string, string>, withPush("새 팀 채팅"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_dm" } as Record<string, string>, (payload: RealtimePostgresChangesPayload<RealtimeNewRow>) => {
        fetchNotifications();
        const newRow = payload.new as RealtimeNewRow | undefined;
        if (newRow?.receiver === userName) {
          sendBrowserNotification("VELA HQ", `DM: ${newRow?.sender ?? ""}`);
        }
      })
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_approvals" } as Record<string, string>, withPush("새 결재 요청"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_notices" } as Record<string, string>, withPush("새 공지"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_feedback" } as Record<string, string>, withPush("새 피드백"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_board" } as Record<string, string>, withPush("새 게시글"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_reports" } as Record<string, string>, withPush("새 보고서"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_surveys" } as Record<string, string>, withPush("새 설문"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_tasks" } as Record<string, string>, withPush("새 태스크"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_leave" } as Record<string, string>, withPush("휴가 신청"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_wiki" } as Record<string, string>, withPush("위키 수정"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_files" } as Record<string, string>, withPush("파일 업로드"))
      .on("postgres_changes" as "system", { event: "INSERT", schema: "public", table: "hq_calendar" } as Record<string, string>, withPush("새 일정"))
      .on("postgres_changes" as "system", { event: "UPDATE", schema: "public", table: "hq_leave" } as Record<string, string>, () => fetchNotifications())
      .on("postgres_changes" as "system", { event: "UPDATE", schema: "public", table: "hq_approvals" } as Record<string, string>, () => fetchNotifications())
      .on("postgres_changes" as "system", { event: "UPDATE", schema: "public", table: "hq_reports" } as Record<string, string>, () => fetchNotifications())
      .subscribe();
    return () => { s.removeChannel(channel); };
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
        <div className="absolute right-0 top-10 w-[calc(100vw-2rem)] sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">알림</h3>
              {pushEnabled && <span className="text-[10px] text-emerald-500 font-semibold">푸시 ON</span>}
            </div>
            <div className="flex items-center gap-2">
              {!pushEnabled && typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "default" && (
                <button onClick={() => window.Notification.requestPermission().then(p => setPushEnabled(p === "granted"))} className="text-[10px] text-slate-400 hover:text-[#3182F6] font-semibold">
                  푸시 허용
                </button>
              )}
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#3182F6] font-semibold hover:underline">
                  모두 읽음
                </button>
              )}
            </div>
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
