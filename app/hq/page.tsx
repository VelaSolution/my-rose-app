"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  Tab, HQRole, TABS, SIDEBAR_GROUPS, ROLE_PERMISSIONS, TAB_MAP,
} from "./types";

// ── 탭 컴포넌트 ────────────────────────────────────────
import NotificationBell from "./components/NotificationBell";
import SearchModal from "./components/SearchModal";
import Dashboard from "./components/Dashboard";
import MettTab from "./components/MettTab";
import KpiTab from "./components/KpiTab";
import GoalTab from "./components/GoalTab";
import TaskTab from "./components/TaskTab";
import AarTab from "./components/AarTab";
import NoticeTab from "./components/NoticeTab";
import ReportTab from "./components/ReportTab";
import FeedbackTab from "./components/FeedbackTab";
import CalendarTab from "./components/CalendarTab";
import MemoTab from "./components/MemoTab";
import TeamTab from "./components/TeamTab";
import TimelineTab from "./components/TimelineTab";
import FilesTab from "./components/FilesTab";
import ChatTab from "./components/ChatTab";
import ApprovalTab from "./components/ApprovalTab";
import DecisionTab from "./components/DecisionTab";
import AttendanceTab from "./components/AttendanceTab";
import LeaveTab from "./components/LeaveTab";
import ContactsTab from "./components/ContactsTab";
import BoardTab from "./components/BoardTab";
import SurveyTab from "./components/SurveyTab";
import WikiTab from "./components/WikiTab";
import OrgChartTab from "./components/OrgChartTab";
import AuditLog from "./components/AuditLog";
import GanttTab from "./components/GanttTab";

// ── 탭 → 컴포넌트 매핑 ────────────────────────────────
const TAB_COMPONENTS: Record<Tab, React.ComponentType<{ userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }>> = {
  dashboard: Dashboard,
  mett: MettTab,
  kpi: KpiTab,
  goal: GoalTab,
  task: TaskTab,
  aar: AarTab,
  notice: NoticeTab,
  report: ReportTab,
  feedback: FeedbackTab,
  calendar: CalendarTab,
  memo: MemoTab,
  team: TeamTab,
  timeline: TimelineTab,
  files: FilesTab,
  chat: ChatTab,
  approval: ApprovalTab,
  decision: DecisionTab,
  attendance: AttendanceTab,
  leave: LeaveTab,
  contacts: ContactsTab,
  board: BoardTab,
  survey: SurveyTab,
  wiki: WikiTab,
  orgchart: OrgChartTab,
  audit: AuditLog,
  gantt: GanttTab,
};

// Bottom nav tabs for mobile (5 most important)
const BOTTOM_NAV_TABS: { key: Tab | "more"; label: string; icon: string }[] = [
  { key: "dashboard", label: "현황판", icon: "📋" },
  { key: "attendance", label: "근태", icon: "⏰" },
  { key: "task", label: "태스크", icon: "✅" },
  { key: "chat", label: "채팅", icon: "💬" },
  { key: "more", label: "더보기", icon: "☰" },
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

  // Load dark mode preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hq_dark_mode");
      if (saved === "true") setDarkMode(true);
    } catch {}
  }, []);

  // Persist dark mode preference
  useEffect(() => {
    try { localStorage.setItem("hq_dark_mode", String(darkMode)); } catch {}
  }, [darkMode]);

  // Cmd+K keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    router.push(`/hq?tab=${t}`, { scroll: false });
  }, [router]);

  // URL 변경 시 탭 동기화
  useEffect(() => {
    if (tabParam && TABS.some(t => t.key === tabParam) && tabParam !== tab) {
      setTabState(tabParam);
    }
  }, [tabParam]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

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

        // 팀 멤버 로드
        let teamData: { email: string; hq_role: string }[] = [];
        try {
          const { data: td } = await sb.from("hq_team").select("email, hq_role").order("created_at", { ascending: true });
          if (td && td.length > 0) {
            teamData = td as { email: string; hq_role: string }[];
          } else {
            const defaults = [
              { name: "민혁", role: "대표", email: "mnhyuk@velaanalytics.com", status: "active", hq_role: "대표" },
              { name: "운영팀", role: "운영", email: "ops@velaanalytics.com", status: "active", hq_role: "팀원" },
            ];
            const { data: inserted } = await sb.from("hq_team").insert(defaults).select("email, hq_role");
            if (inserted) teamData = inserted as { email: string; hq_role: string }[];
          }
        } catch {}

        if (adminEmails.includes(user.email ?? "")) {
          setAuthorized(true);
          setMyRole("대표");
        } else {
          // 이메일 매칭 (대소문자 무시, 공백 제거)
          const userEmail = (user.email ?? "").trim().toLowerCase();
          const member = teamData.find(m => (m.email ?? "").trim().toLowerCase() === userEmail);
          if (member) {
            setAuthorized(true);
            setMyRole((member.hq_role as HQRole) ?? "팀원");
          }
        }
      } catch (e) { console.error("HQ auth error:", e); }
      setLoading(false);
    })();
  }, []);

  // ── 로딩 ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-slate-200 border-t-[#3182F6] rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium">VELA HQ 로딩 중...</span>
      </div>
    </div>
  );

  // ── 미인증 ────────────────────────────────────────────
  if (!authorized) return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="text-center bg-white rounded-3xl p-10 shadow-lg border border-slate-200/60 max-w-sm w-full">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">접근 권한 없음</h2>
        <p className="text-sm text-slate-500 mb-6">VELA HQ는 등록된 팀원만 이용할 수 있습니다.</p>
        <Link href="/" className="inline-block rounded-xl bg-[#3182F6] text-white font-semibold px-6 py-3 text-sm hover:bg-[#2672DE] transition-all">
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );

  const allowedTabs = TABS.filter(t => ROLE_PERMISSIONS[myRole]?.includes(t.key));
  const todayDate = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const ActiveComponent = TAB_COMPONENTS[tab];
  const activeTabInfo = TAB_MAP[tab];

  return (
    <div className={`min-h-screen bg-[#F7F8FA]${darkMode ? " hq-dark" : ""}`}>
      <meta name="theme-color" content={darkMode ? "#0F172A" : "#ffffff"} />
      <style>{`
        .vela-nav,.vela-mobile-tab{display:none!important}
        body{padding-top:0!important;padding-top:env(safe-area-inset-top)!important}
        .hq-dark { background: #0F172A !important; color: #E2E8F0 !important; }
        .hq-dark .bg-white { background: #1E293B !important; }
        .hq-dark .bg-\\[\\#F7F8FA\\] { background: #0F172A !important; }
        .hq-dark .text-slate-900, .hq-dark .text-slate-800, .hq-dark .text-slate-700 { color: #E2E8F0 !important; }
        .hq-dark .text-slate-600, .hq-dark .text-slate-500 { color: #94A3B8 !important; }
        .hq-dark .text-slate-400 { color: #64748B !important; }
        .hq-dark .border-slate-200, .hq-dark .border-slate-100 { border-color: #334155 !important; }
        .hq-dark .bg-slate-50, .hq-dark .bg-slate-100 { background: #1E293B !important; }
        .hq-dark input, .hq-dark textarea, .hq-dark select { background: #1E293B !important; color: #E2E8F0 !important; border-color: #334155 !important; }
      `}</style>

      {/* ── 헤더 (compact on mobile) ───────────────────── */}
      <header className="bg-white border-b border-slate-200/80 px-3 lg:px-6 py-2 lg:py-3 sticky top-0 z-50" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            {/* 모바일 햄버거 */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h12M3 9h12M3 13h12"/></svg>
            </button>
            <button onClick={() => setTab("dashboard")} className="flex items-center gap-2">
              {/* New hexagon HQ logo */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="hqLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3182F6" />
                    <stop offset="1" stopColor="#2563EB" />
                  </linearGradient>
                </defs>
                <path d="M16 1.5L29.5 9.25V24.75L16 30.5L2.5 24.75V9.25L16 1.5Z" fill="url(#hqLogoGrad)" />
                <text x="16" y="19.5" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">HQ</text>
              </svg>
              <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight hidden sm:block">VELA HQ</span>
            </button>
            <span className="text-[10px] lg:text-[11px] bg-[#3182F6]/10 text-[#3182F6] px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg font-bold">{myRole}</span>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {msg && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold animate-pulse">
                {msg}
              </span>
            )}
            <span className="text-xs text-slate-400 hidden lg:block">{todayDate}</span>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition text-slate-500"
              title="검색 (Cmd+K)"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="7" r="5" />
                <path d="M15 15l-3.5-3.5" />
              </svg>
            </button>
            {userId && (
              <NotificationBell userId={userId} userName={userName} myRole={myRole} onNavigate={(t) => setTab(t as Tab)} />
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition text-slate-500"
              title={darkMode ? "라이트 모드" : "다크 모드"}
            >
              {darkMode ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 lg:w-8 lg:h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                <span className="text-xs lg:text-sm font-bold text-slate-600">{userName[0]}</span>
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">{myRole} {userName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── 모바일 사이드바 오버레이 (slide animation) ── */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setSidebarOpen(false)}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 shadow-2xl pt-16 overflow-y-auto transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 4rem)" }}
          onClick={e => e.stopPropagation()}>
          <nav className="px-3 py-2">
            {SIDEBAR_GROUPS.map(g => {
              const groupTabs = g.items.filter(k => ROLE_PERMISSIONS[myRole]?.includes(k));
              if (groupTabs.length === 0) return null;
              return (
                <div key={g.label} className="mb-4">
                  <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{g.label}</p>
                  {groupTabs.map(k => {
                    const t = TAB_MAP[k]; if (!t) return null;
                    return (
                      <button key={k} onClick={() => { setTab(k); setSidebarOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-center gap-2.5 transition-all mb-0.5 ${
                          tab === k ? "bg-[#3182F6]/10 text-[#3182F6] font-semibold" : "text-slate-600 hover:bg-slate-50"
                        }`}>
                        <span className="text-base">{t.icon}</span><span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>
      </div>

      <div className="flex h-[calc(100vh-45px)] lg:h-[calc(100vh-53px)]">
        {/* ── 데스크톱 사이드바 (독립 스크롤) ─────────── */}
        <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-slate-200/80 overflow-y-auto flex-shrink-0">
          <nav className="flex-1 px-3 py-4">
            {SIDEBAR_GROUPS.map(g => {
              const groupTabs = g.items.filter(k => ROLE_PERMISSIONS[myRole]?.includes(k));
              if (groupTabs.length === 0) return null;
              return (
                <div key={g.label} className="mb-4">
                  <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{g.label}</p>
                  {groupTabs.map(k => {
                    const t = TAB_MAP[k]; if (!t) return null;
                    return (
                      <button key={k} onClick={() => setTab(k)}
                        className={`w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-center gap-2.5 transition-all mb-0.5 ${
                          tab === k ? "bg-[#3182F6]/10 text-[#3182F6] font-semibold" : "text-slate-600 hover:bg-slate-50"
                        }`}>
                        <span className="text-base">{t.icon}</span><span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-slate-600">{userName[0]}</span>
              </div>
              <span className="text-xs font-semibold text-slate-600">{myRole} {userName}</span>
            </div>
            <Link href="/" className="flex items-center gap-2 text-xs text-slate-400 hover:text-[#3182F6] transition font-medium">
              <span>←</span><span>VELA 서비스로 이동</span>
            </Link>
          </div>
        </aside>

        {/* ── 메인 콘텐츠 (독립 스크롤) ─────────────────── */}
        <main className="flex-1 min-w-0 pb-16 md:pb-0 overflow-y-auto">
          {/* 페이지 헤더 (compact on mobile) */}
          <div className="px-4 lg:px-8 pt-4 lg:pt-6 pb-1 lg:pb-2">
            <div className="flex items-center gap-2 lg:gap-3">
              <span className="text-xl lg:text-2xl">{activeTabInfo?.icon}</span>
              <div>
                <h1 className="text-base lg:text-xl font-bold text-slate-900">{activeTabInfo?.label}</h1>
              </div>
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="px-4 lg:px-8 pb-10">
            {userId && tab === "dashboard" ? (
              <Dashboard userId={userId} userName={userName} myRole={myRole} flash={flash} onNavigate={setTab} />
            ) : userId ? (
              <ActiveComponent userId={userId} userName={userName} myRole={myRole} flash={flash} />
            ) : null}
          </div>
        </main>
      </div>

      {/* ── 모바일 하단 네비게이션 ─────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200/80" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around h-14">
          {BOTTOM_NAV_TABS.map(item => {
            const isMore = item.key === "more";
            const isActive = !isMore && tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (isMore) {
                    setSidebarOpen(true);
                  } else {
                    setTab(item.key as Tab);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive ? "text-[#3182F6]" : "text-slate-400"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className={`text-[10px] font-semibold ${isActive ? "text-[#3182F6]" : "text-slate-400"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── 검색 모달 ───────────────────────────────────── */}
      {userId && (
        <SearchModal
          userId={userId}
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onNavigate={(t) => setTab(t as Tab)}
        />
      )}
    </div>
  );
}
