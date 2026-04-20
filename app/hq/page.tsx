"use client";

import { useState, useEffect, useCallback } from "react";
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

// ── 탭 → 컴포넌트 매핑 (12탭) ────────────────────────
const TAB_COMPONENTS: Record<Tab, React.ComponentType<{ userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }>> = {
  dashboard: Dashboard, attendance: AttendanceHub, task: TaskHub,
  board: BoardHub, chat: ChatTab, docs: DocsHub,
  approval: ApprovalHub, finance: FinanceHub, team: TeamHub,
  resource: ResourceTab, performance: PerformanceHub, admin: AdminHub,
};

// 모바일 하단 고정 5탭
const MOBILE_NAV: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "홈", icon: "🏠" },
  { key: "task", label: "업무", icon: "✅" },
  { key: "chat", label: "채팅", icon: "💬" },
  { key: "board", label: "게시판", icon: "💬" },
  { key: "finance", label: "재무", icon: "💰" },
];

export default function HQPage() {
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hq_dark_mode");
      if (saved === "true") setDarkMode(true);
      const collapsed = localStorage.getItem("hq_collapsed_groups");
      if (collapsed) setCollapsedGroups(new Set(JSON.parse(collapsed)));
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

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      try { localStorage.setItem("hq_collapsed_groups", JSON.stringify([...next])); } catch {}
      return next;
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
        const adminEmails = ["mnhyuk@velaanalytics.com", "mnhyuk0213@gmail.com"];
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
        if (adminEmails.includes(user.email ?? "")) {
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

  // ── 로딩 ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-dvh bg-[#F7F8FA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#2d2b55] shadow-lg flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 20l1-2a7 7 0 0 1 7-5h6a7 7 0 0 1 7 5l1 2" />
              <path d="M12 3v12" />
              <path d="M12 3c0 0 5 2 5 7H12" />
            </svg>
          </div>
          <div className="absolute -inset-1 rounded-2xl border-2 border-[#3182F6]/30 animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">VELA Bridge</p>
          <p className="text-xs text-slate-400 mt-0.5">로딩 중...</p>
        </div>
      </div>
    </div>
  );

  // ── 미인증 ────────────────────────────────────────────
  if (!authorized) return (
    <main className="min-h-dvh bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="text-center bg-white rounded-3xl p-10 shadow-lg border border-slate-200/60 max-w-sm w-full">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">브릿�� 접근 권한 필요</h2>
        <p className="text-sm text-slate-500 mb-2">선장의 승인이 필요합니다.</p>
        <p className="text-xs text-slate-400 mb-6">승인 후 브��지에 탑승할 수 있습니다.</p>
        <Link href="/" className="inline-block rounded-xl bg-slate-900 text-white font-semibold px-6 py-3 text-sm hover:bg-slate-800 transition-all active:scale-[0.98]">
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );

  const allowedTabs = TABS.filter(t => ROLE_PERMISSIONS[myRole]?.includes(t.key));
  const todayDate = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  const ActiveComponent = TAB_COMPONENTS[tab];
  const activeTabInfo = TAB_MAP[tab];

  // 사이드바 렌더링 함수 (데스크톱/모바일 공용, Toss style)
  const renderNav = (isMobile: boolean) => (
    <nav className="flex-1 px-3 py-4 overflow-y-auto">
      {SIDEBAR_GROUPS.map(g => {
        const groupTabs = g.items.filter(k => ROLE_PERMISSIONS[myRole]?.includes(k));
        if (groupTabs.length === 0) return null;
        const isCollapsed = collapsedGroups.has(g.label);
        const hasActive = groupTabs.includes(tab);
        return (
          <div key={g.label} className="mb-2">
            <button
              onClick={() => toggleGroup(g.label)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] font-bold rounded-xl transition-colors border-b border-slate-100 ${
                hasActive && isCollapsed ? "text-[#3182F6]" : "text-slate-800 hover:text-slate-900"
              }`}
            >
              <span>{g.label}</span>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`transition-transform duration-200 text-slate-300 ${isCollapsed ? "-rotate-90" : ""}`}>
                <path d="M3 4.5l3 3 3-3" />
              </svg>
            </button>
            {!isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {groupTabs.map(k => {
                  const t = TAB_MAP[k]; if (!t) return null;
                  const isActive = tab === k;
                  return (
                    <button key={k} onClick={() => { setTab(k); if (isMobile) setSidebarOpen(false); }}
                      className={`hq-sidebar-item w-full text-left px-4 py-3 text-[14px] rounded-2xl flex items-center ${
                        isActive
                          ? "text-[#3182F6] font-bold bg-[#3182F6]/5 border-l-[3px] border-[#3182F6]"
                          : "text-slate-600 hover:bg-slate-50 font-medium border-l-[3px] border-transparent"
                      }`}>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <TeamDisplayProvider>
    <div className={`h-dvh flex flex-col overflow-hidden bg-[#F7F8FA]${darkMode ? " hq-dark" : ""}`}>
      <meta name="theme-color" content={darkMode ? "#0F172A" : "#ffffff"} />
      <style>{`
        .hq-dark { background: #0F172A !important; color: #E2E8F0 !important; }
        .hq-dark .bg-white { background: #1E293B !important; }
        .hq-dark .bg-\\[\\#F7F8FA\\] { background: #0F172A !important; }
        .hq-dark .text-slate-900, .hq-dark .text-slate-800, .hq-dark .text-slate-700 { color: #E2E8F0 !important; }
        .hq-dark .text-slate-600, .hq-dark .text-slate-500 { color: #94A3B8 !important; }
        .hq-dark .text-slate-400 { color: #64748B !important; }
        .hq-dark .border-slate-200, .hq-dark .border-slate-100 { border-color: #1E293B !important; }
        .hq-dark .bg-slate-50, .hq-dark .bg-slate-100 { background: #1E293B !important; }
        .hq-dark .shadow-\\[0_2px_8px_rgba\\(0\\,0\\,0\\,0\\.04\\)\\] { box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important; }
        .hq-dark input, .hq-dark textarea, .hq-dark select { background: #1E293B !important; color: #E2E8F0 !important; border-color: #334155 !important; }
        .hq-dark .hq-header-inner { background: rgba(15,23,42,0.97) !important; border-color: #1E293B !important; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .hq-more-sheet { animation: slideUp 0.25s ease-out; }
        .hq-fade-in { animation: fadeIn 0.3s ease-out; }
        .hq-toast { animation: toastIn 0.3s ease-out; }
        .hq-sidebar-item { transition: all 0.15s ease; }
        .hq-sidebar-item:hover { transform: translateX(2px); }
      `}</style>

      {/* ── 헤더 (Toss style: clean, minimal) ────────── */}
      <header className="sticky top-0 z-50 h-16 flex-shrink-0">
        <div className="hq-header-inner h-full bg-white/97 backdrop-blur-xl border-b border-slate-100 flex items-center px-4 lg:px-6">
          <div className="flex items-center justify-between w-full">
            {/* 좌측: 메뉴 + 로고 */}
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-slate-50 transition active:scale-95 flex-shrink-0">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h12M3 9h12M3 13h12"/></svg>
              </button>
              <button onClick={() => setTab("dashboard")} className="flex items-center gap-2.5 flex-shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-[#1a1a2e] to-[#2d2b55] rounded-xl flex items-center justify-center shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 20l1-2a7 7 0 0 1 7-5h6a7 7 0 0 1 7 5l1 2" />
                    <path d="M12 3v12" />
                    <path d="M12 3c0 0 5 2 5 7H12" />
                  </svg>
                </div>
                <span className="text-[16px] font-bold text-slate-800 hidden sm:block tracking-tight">Bridge</span>
              </button>
            </div>

            {/* 중앙: 검색바 (데스크톱) */}
            <div className="hidden lg:flex flex-1 justify-center max-w-md mx-8">
              <button onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-400 transition">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M13 13l-3-3" /></svg>
                <span>검색...</span>
                <kbd className="ml-auto text-[10px] bg-white rounded-lg px-1.5 py-0.5 text-slate-300 font-mono shadow-sm">⌘K</kbd>
              </button>
            </div>

            {/* 우측: 시간 · 알림 · 다크모드 · 프로필 */}
            <div className="flex items-center gap-1.5 lg:gap-2.5">
              <span className="text-[12px] text-slate-400 hidden xl:block tabular-nums whitespace-nowrap font-medium">{todayDate} {currentTime}</span>
              {/* 모바일 검색 버튼 */}
              <button onClick={() => setSearchOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-slate-50 transition text-slate-400 active:scale-95"
                title="검색">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="7" r="5" /><path d="M15 15l-3.5-3.5" /></svg>
              </button>
              {userId && <NotificationBell userId={userId} userName={userName} myRole={myRole} onNavigate={(t) => setTab(t as Tab)} />}
              <button onClick={() => setDarkMode(!darkMode)}
                className="w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-slate-50 transition text-slate-400 active:scale-95 hidden sm:flex">
                {darkMode ? "☀️" : "🌙"}
              </button>
              <div className="hidden lg:block w-px h-5 bg-slate-100 mx-1" />
              <button onClick={() => setTab("dashboard")} className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-[#3182F6] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">{userName[0]}</span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-[13px] font-bold text-slate-800 leading-tight">{userName}</p>
                  <p className="text-[11px] text-slate-400 leading-tight">{myRole}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── 모바일 사이드바 오버레이 ──────────────────── */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setSidebarOpen(false)}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
          onClick={e => e.stopPropagation()}>
          {/* 사이드바 헤더 */}
          <div className="px-5 py-5 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-[#3182F6] to-[#7C3AED] rounded-xl flex items-center justify-center">
                <span className="text-sm font-bold text-white">{userName[0]}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{userName}</p>
                <p className="text-[11px] text-slate-400">{myRole}</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400">
              ✕
            </button>
          </div>
          {renderNav(true)}
          <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-[#3182F6] transition font-medium" onClick={() => setSidebarOpen(false)}>
              <span>←</span><span>갑판으로 나가기</span>
            </Link>
          </div>
        </aside>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── 데스크톱 사이드바 (Toss style: no border, subtle shadow) ── */}
        <aside className="hidden md:flex flex-col w-[230px] lg:w-[250px] bg-white shadow-[1px_0_8px_rgba(0,0,0,0.03)] flex-shrink-0">
          {renderNav(false)}
          <div className="px-4 py-3 border-t border-slate-100 space-y-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 bg-gradient-to-br from-[#3182F6] to-[#7C3AED] rounded-lg flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{userName[0]}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">{userName}</p>
                <p className="text-[10px] text-slate-400">{myRole}</p>
              </div>
            </div>
            <Link href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-[#3182F6] transition font-medium px-1">
              <span>←</span><span>갑판으로 나가기</span>
            </Link>
          </div>
        </aside>

        {/* ── 메인 콘텐츠 ──────────────────────────────── */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0 overflow-y-auto">
          {/* 모바일 현재 탭 표시 */}
          {tab !== "dashboard" && (
            <div className="md:hidden px-4 pt-4 pb-1">
              <h2 className="text-lg font-bold text-slate-900">{activeTabInfo?.label}</h2>
            </div>
          )}
          <div className="px-4 lg:px-8 pt-4 lg:pt-5 pb-10">
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

      {/* ── 토스트 알림 (bottom-center, Toss style) ──────── */}
      {msg && (
        <div className="hq-toast fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-[14px] font-semibold shadow-2xl flex items-center gap-2.5">
          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-6"/></svg>
          </div>
          {msg}
        </div>
      )}

      {/* ── 모바일 하단 탭바 ──────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-2xl border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center h-[58px]">
          {MOBILE_NAV.map(item => {
            const isActive = tab === item.key;
            return (
              <button key={item.key} onClick={() => setTab(item.key)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90 ${isActive ? "text-[#3182F6]" : "text-slate-400"}`}>
                <div className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                  <span className="text-[18px] leading-none">{item.icon}</span>
                </div>
                <span className={`text-[10px] font-bold ${isActive ? "text-[#3182F6]" : "text-slate-400"}`}>{item.label}</span>
                {isActive && <div className="absolute bottom-1 w-5 h-0.5 rounded-full bg-[#3182F6]" />}
              </button>
            );
          })}
          {/* 더보기 */}
          <button onClick={() => setMoreOpen(!moreOpen)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors active:scale-95 ${moreOpen ? "text-[#3182F6]" : "text-slate-400"}`}>
            <span className="text-lg leading-none">☰</span>
            <span className={`text-[10px] font-semibold ${moreOpen ? "text-[#3182F6]" : "text-slate-400"}`}>더보기</span>
          </button>
        </div>
      </nav>

      {/* ── 더보기 시트 ──────────────────────────────────── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl hq-more-sheet" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-4 pb-2">
              <p className="text-sm font-bold text-slate-900 mb-3">전체 메뉴</p>
              <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pb-4">
                {allowedTabs.filter(t => !MOBILE_NAV.some(m => m.key === t.key)).map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95 ${
                      tab === t.key ? "bg-[#3182F6]/10 text-[#3182F6]" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}>
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-[11px] font-semibold">{t.label}</span>
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
}
