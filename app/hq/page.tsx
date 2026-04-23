"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { TeamDisplayProvider } from "./utils";
import {
  Tab, HQRole, TABS, SIDEBAR_GROUPS, ROLE_PERMISSIONS, TAB_MAP,
} from "./types";

// ── 탭 컴포넌트 (always needed) ───────────────────────
import NotificationBell from "./components/NotificationBell";
import SearchModal from "./components/SearchModal";

// ── 탭 컴포넌트 (12탭 — lazy loaded) ─────────────────
const Dashboard = dynamic(() => import("./components/Dashboard"));
const MailTab = dynamic(() => import("./components/MailTab"));
const AttendanceHub = dynamic(() => import("./components/AttendanceHub"));
const TaskHub = dynamic(() => import("./components/TaskHub"));
const BoardHub = dynamic(() => import("./components/BoardHub"));
const ChatTab = dynamic(() => import("./components/ChatTab"));
const DocsHub = dynamic(() => import("./components/DocsHub"));
const ApprovalHub = dynamic(() => import("./components/ApprovalHub"));
const FinanceHub = dynamic(() => import("./components/FinanceHub"));
const TeamHub = dynamic(() => import("./components/TeamHub"));
const ResourceTab = dynamic(() => import("./components/ResourceTab"));
const PerformanceHub = dynamic(() => import("./components/PerformanceHub"));
const AdminHub = dynamic(() => import("./components/AdminHub"));

// ── 탭 → 컴포넌트 매핑 (13탭) ────────────────────────
const TAB_COMPONENTS: Record<Tab, React.ComponentType<{ userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }>> = {
  dashboard: Dashboard, mail: MailTab, attendance: AttendanceHub, task: TaskHub,
  board: BoardHub, chat: ChatTab, docs: DocsHub,
  approval: ApprovalHub, finance: FinanceHub, team: TeamHub,
  resource: ResourceTab, performance: PerformanceHub, admin: AdminHub,
};

// ── 아이콘 색상 (다우오피스식 컬러 아이콘) ──────────────
const ICON_COLORS: Record<string, string> = {
  dashboard: "#2D84FF", mail: "#3B82F6", clock: "#F59E0B", "check-square": "#10B981",
  "message-square": "#8B5CF6", "message-circle": "#3B82F6", folder: "#F97316",
  "file-check": "#EC4899", wallet: "#059669", users: "#6366F1",
  "calendar-check": "#14B8A6", "bar-chart": "#EF4444", settings: "#64748B",
};

// ── SVG 아이콘 ────────────────────────────────────────
function TabIcon({ name, size = 18, className = "", colored = false }: { name: string; size?: number; className?: string; colored?: boolean }) {
  const color = colored ? ICON_COLORS[name] : undefined;
  const s = { width: size, height: size, fill: "none", stroke: color || "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const icons: Record<string, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 6l-10 7L2 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
    "check-square": <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" /></>,
    "message-square": <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></>,
    "message-circle": <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></>,
    folder: <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></>,
    "file-check": <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M9 15l2 2 4-4" /></>,
    wallet: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /><circle cx="17" cy="14" r="1" /></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
    "calendar-check": <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></>,
    "bar-chart": <><rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  };
  return <svg {...s} viewBox="0 0 24 24" className={className}>{icons[name]}</svg>;
}

// 모바일 하단 고정 5탭
const MOBILE_NAV: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "홈" },
  { key: "approval", label: "결재" },
  { key: "chat", label: "메신저" },
  { key: "task", label: "업무" },
  { key: "finance", label: "경리" },
];

function HQPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTabState] = useState<Tab>(tabParam && TABS.some(t => t.key === tabParam) ? tabParam : "dashboard");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [msg, setMsg] = useState("");
  const [userName, setUserName] = useState("관리자");
  const [myRole, setMyRole] = useState<HQRole>("팀원");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [notices, setNotices] = useState<{ id: string; title: string; category: string }[]>([]);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hq_dark_mode");
      if (saved === "true") setDarkMode(true);
      const collapsed = localStorage.getItem("hq_sidebar_collapsed");
      if (collapsed === "true") setSidebarCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("hq_dark_mode", String(darkMode)); } catch {}
  }, [darkMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(prev => !prev); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    router.push(`/hq?tab=${t}`, { scroll: false });
    window.scrollTo(0, 0);
    setSidebarOpen(false);
    setMoreOpen(false);
  }, [router]);

  useEffect(() => {
    if (tabParam && TABS.some(t => t.key === tabParam) && tabParam !== tab) setTabState(tabParam);
  }, [tabParam]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      try { localStorage.setItem("hq_sidebar_collapsed", String(!prev)); } catch {}
      return !prev;
    });
  };

  // ── 인증 & 권한 ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const sb = createSupabaseBrowserClient();
        if (!sb) { setLoading(false); return; }
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);
        const uName = user.user_metadata?.nickname ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "관리자";
        setUserName(uName);
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").split(",").map(e => e.trim().toLowerCase());
        let teamData: { email: string; hq_role: string; approved: boolean }[] = [];
        try {
          const { data: td } = await sb.from("hq_team").select("email, hq_role, approved").order("created_at", { ascending: true });
          if (td && td.length > 0) {
            teamData = td as { email: string; hq_role: string; approved: boolean }[];
          } else {
            const defaults = [
              { name: "민혁", role: "대표", email: "mnhyuk@velaanalytics.com", status: "active", hq_role: "대표" },
              { name: "운영팀", role: "운영", email: "ops@velaanalytics.com", status: "active", hq_role: "팀원" },
            ];
            const { data: inserted } = await sb.from("hq_team").insert(defaults).select("email, hq_role");
            if (inserted) teamData = inserted as { email: string; hq_role: string; approved: boolean }[];
          }
        } catch {}
        if (adminEmails.includes((user.email ?? "").toLowerCase())) {
          setAuthorized(true); setMyRole("대표");
        } else {
          const userEmail = (user.email ?? "").trim().toLowerCase();
          const member = teamData.find(m => (m.email ?? "").trim().toLowerCase() === userEmail);
          if (member && member.approved === false) { setLoading(false); return; }
          if (member) { setAuthorized(true); setMyRole((member.hq_role as HQRole) ?? "팀원"); }
        }
      } catch (e) { console.error("HQ auth error:", e); }
      setLoading(false);
    })();
  }, []);

  // ── 뱃지 카운트 & 공지사항 로드 ──────────────────────
  useEffect(() => {
    if (!userId || !authorized) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    let cancelled = false;

    async function loadBadges() {
      try {
        const [approvals, tasks, chats, boards, leaves] = await Promise.all([
          sb.from("hq_approvals").select("id", { count: "exact", head: true }).eq("status", "대기"),
          sb.from("hq_tasks").select("id", { count: "exact", head: true }).eq("status", "active"),
          sb.from("hq_chat").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 3600_000).toISOString()),
          sb.from("hq_board").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400_000).toISOString()),
          sb.from("hq_leave").select("id", { count: "exact", head: true }).eq("status", "대기"),
        ]);
        if (cancelled) return;
        setBadges({
          approval: approvals.count ?? 0,
          task: tasks.count ?? 0,
          chat: chats.count ?? 0,
          board: boards.count ?? 0,
          attendance: leaves.count ?? 0,
        });
      } catch {}
    }

    async function loadNotices() {
      try {
        const { data } = await sb.from("hq_notices")
          .select("id, title, category")
          .eq("important", true)
          .order("created_at", { ascending: false })
          .limit(5);
        if (!cancelled && data) setNotices(data);
      } catch {}
    }

    loadBadges();
    loadNotices();
    const interval = setInterval(loadBadges, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [userId, authorized]);

  // ── 로딩 ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-dvh bg-[#F7F8FA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-11 h-11 rounded-xl bg-[#3182F6] shadow-lg shadow-[#2D84FF]/30 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 20l1-2a7 7 0 0 1 7-5h6a7 7 0 0 1 7 5l1 2" />
              <path d="M12 3v12" />
              <path d="M12 3c0 0 5 2 5 7H12" />
            </svg>
          </div>
          <div className="absolute -inset-1 rounded-xl border-2 border-[#2D84FF]/30 animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-700">VELA Bridge</p>
          <p className="text-xs text-slate-400 mt-0.5">로딩 중...</p>
        </div>
      </div>
    </div>
  );

  // ── 미인증 ────────────────────────────────────────────
  if (!authorized) return (
    <main className="min-h-dvh bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="text-center bg-white rounded-2xl p-10 shadow-lg border border-slate-200/60 max-w-sm w-full">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">접근 권한이 필요합니다</h2>
        <p className="text-sm text-slate-500 mb-6">관리자의 승인이 필요합니다.</p>
        <Link href="/" className="inline-block rounded-xl bg-[#3182F6] text-white font-semibold px-6 py-3 text-sm hover:bg-[#1a6fef] transition-all active:scale-[0.98]">
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );

  const allowedTabs = TABS.filter(t => ROLE_PERMISSIONS[myRole]?.includes(t.key));
  const todayDate = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  const ActiveComponent = TAB_COMPONENTS[tab];
  const activeTabInfo = TAB_MAP[tab];

  return (
    <TeamDisplayProvider>
    <div className={`hq-root h-dvh flex flex-col overflow-hidden${darkMode ? " hq-dark" : ""}`}>
      <meta name="theme-color" content={darkMode ? "#0F172A" : "#ffffff"} />
      <style>{`
        .hq-root { background: #F7F8FA; color: #191F28; overscroll-behavior: none; }
        .hq-root > * { overscroll-behavior: contain; }
        html, body { background: #F7F8FA !important; }
        .hq-dark { background: #0F172A !important; color: #E2E8F0 !important; }
        .hq-dark .hq-sidebar { background: #0B1120 !important; }
        .hq-dark .hq-header { background: #0F172A !important; border-color: #1E293B !important; }
        .hq-dark .bg-white { background: #1E293B !important; }
        .hq-dark .hq-content { background: #0F172A !important; }
        .hq-dark .text-slate-900, .hq-dark .text-slate-800, .hq-dark .text-slate-700 { color: #E2E8F0 !important; }
        .hq-dark .text-slate-600, .hq-dark .text-slate-500 { color: #94A3B8 !important; }
        .hq-dark .text-slate-400 { color: #64748B !important; }
        .hq-dark .border-slate-200, .hq-dark .border-slate-100 { border-color: #1E293B !important; }
        .hq-dark .bg-slate-50, .hq-dark .bg-slate-100 { background: #1E293B !important; }
        .hq-dark input, .hq-dark textarea, .hq-dark select { background: #1E293B !important; color: #E2E8F0 !important; border-color: #334155 !important; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .hq-more-sheet { animation: slideUp 0.25s ease-out; }
        .hq-fade-in { animation: fadeIn 0.2s ease-out; }
        .hq-toast { animation: toastIn 0.3s ease-out; }
      `}</style>

      {/* ── 헤더 (다우오피스 스타일: 다크 네이비) ──────── */}
      <header className="hq-header sticky top-0 z-50 h-[44px] md:h-[52px] flex-shrink-0 bg-white/97 backdrop-blur-xl border-b border-slate-100">
        <div className="h-full flex items-center px-3 lg:px-5">
          {/* 좌측: 메뉴 + 로고 */}
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 transition text-slate-500 active:scale-95">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h12M3 9h12M3 13h12"/></svg>
            </button>
            <button onClick={() => setTab("dashboard")} className="flex items-center gap-2">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-[#1a1a2e] to-[#2d2b55] rounded-xl flex items-center justify-center shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 20l1-2a7 7 0 0 1 7-5h6a7 7 0 0 1 7 5l1 2" />
                  <path d="M12 3v12" />
                  <path d="M12 3c0 0 5 2 5 7H12" />
                </svg>
              </div>
              <span className="text-[14px] font-bold text-slate-800 hidden sm:block tracking-tight">Bridge</span>
            </button>
          </div>

          {/* 중앙: 검색바 */}
          <div className="hidden lg:flex flex-1 justify-center max-w-md mx-8">
            <button onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl px-4 py-2 text-sm text-slate-400 transition">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M13 13l-3-3" /></svg>
              <span>검색...</span>
              <kbd className="ml-auto text-[10px] bg-white rounded-lg px-1.5 py-0.5 text-slate-300 font-mono shadow-sm">⌘K</kbd>
            </button>
          </div>

          {/* 우측: 날짜 · 알림 · 다크모드 · 프로필 */}
          <div className="flex items-center gap-1 lg:gap-2 ml-auto">
            <span className="text-[11px] text-slate-400 hidden xl:block tabular-nums whitespace-nowrap font-medium">{todayDate} {currentTime}</span>
            <button onClick={() => setSearchOpen(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 transition text-slate-400 active:scale-95">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M14 14l-3-3" /></svg>
            </button>
            {userId && <NotificationBell userId={userId} userName={userName} myRole={myRole} onNavigate={(t) => setTab(t as Tab)} />}
            <button onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 transition text-slate-400 active:scale-95 hidden sm:flex text-sm">
              {darkMode ? "☀️" : "🌙"}
            </button>
            <div className="hidden lg:block w-px h-5 bg-slate-100 mx-1" />
            <button onClick={() => setTab("dashboard")} className="flex items-center gap-2 ml-1">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-[#3182F6] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-[10px] md:text-xs font-bold text-white">{userName[0]}</span>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[13px] font-bold text-slate-800 leading-tight">{userName}</p>
                <p className="text-[11px] text-slate-400 leading-tight">{myRole}</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ── 모바일 사이드바 오버레이 ──────────────────── */}
      <div className={`fixed inset-0 z-[55] md:hidden transition-opacity duration-200 ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setSidebarOpen(false)}>
        <div className="absolute inset-0 bg-black/40" />
        <aside
          className={`hq-sidebar absolute left-0 top-0 bottom-0 w-[260px] z-[55] bg-white flex flex-col transition-transform duration-300 ease-out shadow-2xl ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
          onClick={e => e.stopPropagation()}>
          {/* 프로필 */}
          <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#3182F6] to-[#7C3AED] rounded-xl flex items-center justify-center">
                <span className="text-sm font-bold text-white">{userName[0]}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{userName}</p>
                <p className="text-[11px] text-slate-400">{myRole}</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 text-xs">✕</button>
          </div>
          {renderSidebar(true)}
          <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-[#3182F6] transition font-medium" onClick={() => setSidebarOpen(false)}>
              <span>←</span><span>홈으로 나가기</span>
            </Link>
          </div>
        </aside>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── 데스크톱 사이드바 (다우오피스 스타일: 다크) ── */}
        <aside className={`hq-sidebar hidden md:flex flex-col bg-white shadow-[1px_0_8px_rgba(0,0,0,0.03)] flex-shrink-0 transition-all duration-200 ${sidebarCollapsed ? "w-[60px]" : "w-[220px]"}`}>
          {/* 접기 버튼 */}
          <div className={`flex items-center px-2 py-2 ${sidebarCollapsed ? "justify-center" : "justify-end"}`}>
            <button onClick={toggleSidebarCollapse}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`}>
                <path d="M11 4L5 8l6 4" />
              </svg>
            </button>
          </div>
          {renderSidebar(false)}
          {!sidebarCollapsed && (
            <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
              <Link href="/" className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-[#3182F6] transition font-medium px-2">
                <span>←</span><span>홈으로</span>
              </Link>
            </div>
          )}
        </aside>

        {/* ── 메인 콘텐츠 ──────────────────────────────── */}
        <main className="hq-content flex-1 min-w-0 pb-6 md:pb-0 overflow-y-auto bg-[#F7F8FA]" style={{ overscrollBehavior: "contain" }}>
          {/* 모바일 현재 탭 표시 */}
          {tab !== "dashboard" && (
            <div className="md:hidden px-4 pt-4 pb-1 flex items-center gap-2">
              <TabIcon name={activeTabInfo?.icon ?? "dashboard"} size={18} className="text-[#3182F6]" />
              <h2 className="text-lg font-bold text-slate-900">{activeTabInfo?.label}</h2>
            </div>
          )}
          <div className="px-4 lg:px-6 pt-4 lg:pt-5 pb-10">
            <div key={tab} className="hq-fade-in">
              {userId && tab === "dashboard" ? (
                <Dashboard userId={userId} userName={userName} myRole={myRole} flash={flash} onNavigate={setTab} />
              ) : userId ? (
                <ActiveComponent userId={userId} userName={userName} myRole={myRole} flash={flash} />
              ) : null}
            </div>
          </div>
        </main>
      </div>

      {/* ── 토스트 알림 ──────────────────────────────────── */}
      {msg && (
        <div className="hq-toast fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-5 py-3 rounded-xl text-[13px] font-semibold shadow-2xl flex items-center gap-2.5">
          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-6"/></svg>
          </div>
          {msg}
        </div>
      )}

      {/* ── 모바일 플로팅 메뉴 버튼 ──────────────────────── */}
      <button
        onClick={() => setMoreOpen(!moreOpen)}
        className="md:hidden fixed z-50 w-12 h-12 rounded-full bg-[#3182F6] text-white shadow-lg shadow-[#3182F6]/30 flex items-center justify-center active:scale-90 transition-all"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)", right: 20 }}
      >
        {moreOpen ? (
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        )}
      </button>

      {/* ── 메뉴 시트 ──────────────────────────────────── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl hq-more-sheet" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-4 pb-4">
              <p className="text-[13px] font-bold text-slate-900 mb-3">메뉴</p>
              <div className="grid grid-cols-4 gap-2 overflow-y-auto pb-2" style={{ maxHeight: "calc(70vh - 60px)" }}>
                {allowedTabs.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-95 ${
                      tab === t.key ? "bg-[#3182F6]/10 text-[#3182F6]" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}>
                    <TabIcon name={t.icon} size={20} />
                    <span className="text-[10px] font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 검색 모달 ───────────────────────────────────── */}
      {userId && (
        <SearchModal userId={userId} isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={(t) => setTab(t as Tab)} />
      )}
    </div>
    </TeamDisplayProvider>
  );

  // ── 사이드바 렌더링 (다우오피스 스타일: 다크 + SVG 아이콘) ──
  function renderSidebar(isMobile: boolean) {
    const collapsed = !isMobile && sidebarCollapsed;
    return (
      <nav className="flex-1 overflow-y-auto py-2">
        {SIDEBAR_GROUPS.map(g => {
          const groupTabs = g.items.filter(k => ROLE_PERMISSIONS[myRole]?.includes(k));
          if (groupTabs.length === 0) return null;
          return (
            <div key={g.label} className="mb-1">
              {!collapsed && g.label !== "홈" && (
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{g.label}</span>
                </div>
              )}
              {collapsed && g.label !== "홈" && <div className="mx-2 my-1 border-t border-slate-100" />}
              <div className="space-y-0.5 px-2">
                {groupTabs.map(k => {
                  const t = TAB_MAP[k]; if (!t) return null;
                  const isActive = tab === k;
                  return (
                    <button key={k} onClick={() => { setTab(k); if (isMobile) setSidebarOpen(false); }}
                      title={collapsed ? t.label : undefined}
                      className={`w-full text-left rounded-xl flex items-center transition-all duration-150 ${
                        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                      } ${
                        isActive
                          ? "bg-[#3182F6]/10 text-[#3182F6] font-bold border-l-[3px] border-[#3182F6]"
                          : "text-slate-600 hover:bg-slate-50 font-medium border-l-[3px] border-transparent"
                      }`}>
                      <TabIcon name={t.icon} size={collapsed ? 20 : 18} className={isActive ? "text-[#3182F6]" : "text-slate-400"} />
                      {!collapsed && <span className="text-[13px]">{t.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    );
  }
}

export default function HQPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-[#F7F8FA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-[#3182F6] rounded-full" />
      </div>
    }>
      <HQPage />
    </Suspense>
  );
}
