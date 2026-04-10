"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { HQRole, Mett, Metric, Goal, Task, AAR, Tab, Feedback } from "@/app/hq/types";
import { sb, fmt, today, I, C, B, BADGE, ST, useTeamDisplayNames } from "@/app/hq/utils";

type Comment = { id: string; author: string; text: string; time: string };
type DetailItem = { type: "task" | "feedback"; id: string; title: string; status: string; extra: Record<string, string> };

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
  onNavigate?: (tab: Tab) => void;
}

// ── Widget customization ──────────────────────────────
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

const DEFAULT_ORDER: SectionKey[] = ALL_SECTIONS.map(s => s.key);
const LS_KEY = "vela_hq_dashboard_prefs";

interface WidgetPrefs {
  order: SectionKey[];
  hidden: SectionKey[];
}

function loadWidgetPrefs(): WidgetPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure any new sections are appended
      const order = parsed.order?.length ? parsed.order.filter((k: SectionKey) => DEFAULT_ORDER.includes(k)) : [...DEFAULT_ORDER];
      for (const k of DEFAULT_ORDER) { if (!order.includes(k)) order.push(k); }
      return { order, hidden: parsed.hidden ?? [] };
    }
  } catch {}
  return { order: [...DEFAULT_ORDER], hidden: [] };
}

function saveWidgetPrefs(prefs: WidgetPrefs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch {}
}

export default function Dashboard({ userId, userName, myRole, flash, onNavigate }: Props) {
  const { displayName } = useTeamDisplayNames();
  const go = (tab: Tab) => onNavigate?.(tab);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<{ clockIn: string; clockOut: string } | null>(null);
  const [aars, setAars] = useState<AAR[]>([]);
  const [metts, setMetts] = useState<Mett[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [todaySignups, setTodaySignups] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeSubs, setActiveSubs] = useState(0);
  const [directive, setDirective] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [attendanceIn, setAttendanceIn] = useState(0);
  const [attendanceOut, setAttendanceOut] = useState(0);
  const [recentActivity, setRecentActivity] = useState<{ type: string; icon: string; title: string; time: string; tab: Tab }[]>([]);

  // Widget customization state
  const [editMode, setEditMode] = useState(false);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPrefs>(() => loadWidgetPrefs());
  const [dragItem, setDragItem] = useState<SectionKey | null>(null);

  const updatePrefs = useCallback((updater: (prev: WidgetPrefs) => WidgetPrefs) => {
    setWidgetPrefs(prev => {
      const next = updater(prev);
      saveWidgetPrefs(next);
      return next;
    });
  }, []);

  const toggleVisibility = (key: SectionKey) => {
    updatePrefs(prev => ({
      ...prev,
      hidden: prev.hidden.includes(key)
        ? prev.hidden.filter(k => k !== key)
        : [...prev.hidden, key],
    }));
  };

  const handleDragStart = (key: SectionKey) => setDragItem(key);
  const handleDragOver = (e: React.DragEvent, overKey: SectionKey) => {
    e.preventDefault();
    if (!dragItem || dragItem === overKey) return;
    updatePrefs(prev => {
      const order = [...prev.order];
      const fromIdx = order.indexOf(dragItem);
      const toIdx = order.indexOf(overKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, dragItem);
      return { ...prev, order };
    });
  };
  const handleDragEnd = () => setDragItem(null);

  const isSectionVisible = (key: SectionKey) => !widgetPrefs.hidden.includes(key);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const s = sb();
    if (!s) return;
    setLoading(true);
    try {
      const [mRes, gRes, tRes, aRes, meRes, pAll, pToday, payAll, paySub] =
        await Promise.all([
          s.from("hq_metrics").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(15),
          s.from("hq_goals").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
          s.from("hq_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          s.from("hq_aar").select("*").eq("user_id", userId).order("date", { ascending: false }),
          s.from("hq_mett").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
          s.from("profiles").select("id", { count: "exact", head: true }),
          s.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today() + "T00:00:00"),
          s.from("payments").select("amount").eq("status", "done"),
          s.from("payments").select("id", { count: "exact", head: true }).eq("status", "done"),
        ]);
      setMetrics((mRes.data as Metric[]) ?? []);
      setGoals((gRes.data as Goal[]) ?? []);
      setTasks((tRes.data as Task[]) ?? []);
      setAars((aRes.data as AAR[]) ?? []);
      setMetts((meRes.data as Mett[]) ?? []);
      // 직원 이메일 제외한 사용자 수 계산
      let staffEmails: string[] = [];
      try {
        const { data: teamData } = await s.from("hq_team").select("email");
        if (teamData) staffEmails = teamData.map((t: any) => t.email).filter(Boolean);
      } catch {}
      const staffCount = staffEmails.length;
      setTotalUsers(Math.max(0, (pAll.count ?? 0) - staffCount));
      setTodaySignups(pToday.count ?? 0);
      setTotalRevenue((payAll.data ?? []).reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0));
      setActiveSubs(paySub.count ?? 0);

      // 피드백 로드
      try {
        const { data: fbData } = await s.from("hq_feedback").select("*").order("created_at", { ascending: false });
        if (fbData) setFeedbacks(fbData.map((r: any) => ({ id: r.id, type: r.type ?? "", title: r.title ?? "", description: r.description ?? "", priority: r.priority ?? "중간", status: r.status ?? "신규", date: r.created_at?.slice(0, 10) ?? "", author: r.author ?? "" })));
      } catch {}

      // 지시사항 로드
      try {
        const { data: dirData } = await s.from("hq_directives").select("content").eq("user_id", userId).single();
        if (dirData?.content) setDirective(dirData.content);
      } catch {}

      // 미결 결재 수
      try {
        const { count } = await s.from("hq_approvals").select("id", { count: "exact", head: true }).eq("status", "대기");
        setPendingApprovals(count ?? 0);
      } catch {}

      // 오늘 출근 현황
      try {
        const todayStr = today();
        const { data: attData } = await s.from("hq_attendance").select("id, status, user_name, clock_in, clock_out").eq("date", todayStr);
        if (attData) {
          setAttendanceIn(attData.filter((a: any) => a.status !== "결근").length);
          setAttendanceOut(attData.filter((a: any) => a.status === "결근").length);
          // 내 출근 기록
          const myAtt = attData.find((a: any) => a.user_name === userName);
          if (myAtt) {
            const toTime = (ts: string | null) => {
              if (!ts) return "";
              try { return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; }
            };
            setTodayAttendance({ clockIn: toTime(myAtt.clock_in), clockOut: toTime(myAtt.clock_out) });
          } else {
            setTodayAttendance(null);
          }
        }
        const { count: teamCount } = await s.from("hq_team").select("id", { count: "exact", head: true }).neq("approved", false);
        if (teamCount && attData) {
          setAttendanceOut(Math.max(0, (teamCount ?? 0) - attData.length));
          setAttendanceIn(attData.length);
        }
      } catch {}

      // 최근 활동 피드 (공지, 태스크, 피드백에서 최신 5개)
      try {
        const [noticeRecent, taskRecent, fbRecent] = await Promise.all([
          s.from("hq_notices").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
          s.from("hq_tasks").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
          s.from("hq_feedback").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
        ]);
        const activities: { type: string; icon: string; title: string; time: string; tab: Tab }[] = [];
        (noticeRecent.data ?? []).forEach((n: any) => activities.push({ type: "공지", icon: "📢", title: n.title, time: n.created_at, tab: "notice" }));
        (taskRecent.data ?? []).forEach((t: any) => activities.push({ type: "태스크", icon: "✅", title: t.title, time: t.created_at, tab: "task" }));
        (fbRecent.data ?? []).forEach((f: any) => activities.push({ type: "피드백", icon: "🐛", title: f.title, time: f.created_at, tab: "feedback" }));
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities.slice(0, 5));
      } catch {}

      // 댓글 로드
      try {
        const { data: cmtData } = await s.from("hq_item_comments").select("*").order("created_at", { ascending: true });
        if (cmtData) {
          const grouped: Record<string, Comment[]> = {};
          for (const r of cmtData as any[]) {
            if (!grouped[r.item_id]) grouped[r.item_id] = [];
            grouped[r.item_id].push({ id: r.id, author: r.author, text: r.text, time: r.created_at ? new Date(r.created_at).toLocaleString("ko-KR") : "" });
          }
          setComments(grouped);
        }
      } catch {}
    } catch {
      flash("데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  }

  const directiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function saveDirective(v: string) {
    setDirective(v);
    if (directiveTimer.current) clearTimeout(directiveTimer.current);
    directiveTimer.current = setTimeout(async () => {
      const s = sb();
      if (!s) return;
      const { error } = await s.from("hq_directives").upsert(
        { user_id: userId, content: v, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) flash("지시사항 저장 실패: " + error.message);
    }, 1000);
  }

  const latest = metrics[0];
  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "planned").length;
  const activeGoals = goals.filter((g) => g.status === "active");
  const achievedGoals = goals.filter((g) => g.status === "completed").length;
  const totalGoals = goals.length || 1;
  const monthAars = aars.filter((a) => a.date?.startsWith(today().slice(0, 7))).length;
  const feedbackCount = feedbacks.filter(f => f.status !== "완료").length;

  const addComment = async (itemId: string) => {
    if (!commentText.trim()) return;
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_item_comments").insert({ item_id: itemId, item_type: "dashboard", author: userName, text: commentText.trim() });
    if (error) { flash("댓글 저장 실패"); return; }
    const c: Comment = { id: Date.now().toString(), author: userName, text: commentText.trim(), time: new Date().toLocaleString("ko-KR") };
    setComments(prev => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), c] }));
    setCommentText("");
  };

  const openTask = (t: Task) => setDetail({
    type: "task", id: t.id, title: t.title, status: t.status,
    extra: { 담당자: displayName(t.assignee || "-"), 마감일: t.deadline || "-", 결과: t.result || "-" },
  });

  const openFeedback = (f: Feedback) => setDetail({
    type: "feedback", id: f.id, title: f.title, status: f.status,
    extra: { 유형: f.type, 우선순위: f.priority, 설명: f.description || "-", 작성자: displayName(f.author), 날짜: f.date },
  });

  // 7-day revenue chart
  const last7 = metrics.slice(0, 7).reverse();
  const maxRev = Math.max(...last7.map((m) => m.revenue || 0), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3182F6] border-t-transparent" />
      </div>
    );
  }

  // 출근하기
  const handleQuickClockIn = async () => {
    const s = sb();
    if (!s) return;
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    const isLate = time > "09:00";
    const { error } = await s.from("hq_attendance").upsert({
      user_id: userId, user_name: userName, date: today(),
      clock_in: now.toISOString(), status: isLate ? "지각" : "정상",
    }, { onConflict: "user_id,date" });
    if (error) { flash("출근 저장 실패"); return; }
    flash(`출근 완료! (${time})`);
    setTodayAttendance({ clockIn: time, clockOut: "" });
    load();
  };

  return (
    <div className="space-y-4">
      {/* 출근 유도 배너 */}
      {!loading && !todayAttendance && (
        <div className={`${C} border-[#3182F6] border-2 bg-blue-50/50`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🕘</span>
              <div>
                <h3 className="text-base font-bold text-slate-900">아직 출근 전이에요!</h3>
                <p className="text-sm text-slate-500">출근 버튼을 눌러 오늘 근무를 시작하세요.</p>
              </div>
            </div>
            <button onClick={handleQuickClockIn} className="rounded-xl bg-[#3182F6] text-white font-bold px-6 py-3 text-sm hover:bg-[#2672DE] active:scale-[0.98] transition-all flex-shrink-0">
              출근하기
            </button>
          </div>
        </div>
      )}

      {/* 출근 완료 상태 */}
      {!loading && todayAttendance && !todayAttendance.clockOut && (
        <div className={`${C} border-emerald-300 border bg-emerald-50/30`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-emerald-700">출근 완료 · {todayAttendance.clockIn}</p>
                <p className="text-xs text-slate-400">퇴근 시 근태 탭에서 퇴근하기를 눌러주세요.</p>
              </div>
            </div>
            <button onClick={() => go("attendance")} className="rounded-xl bg-slate-700 text-white font-semibold px-5 py-2.5 text-sm hover:bg-slate-800 transition-all flex-shrink-0">
              🕕 퇴근하기
            </button>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setDetail(null); setCommentText(""); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{detail.type === "task" ? "✅" : "🐛"}</span>
                <h3 className="text-lg font-bold text-slate-900 flex-1">{detail.title}</h3>
                <span className={`${BADGE} ${(ST[detail.status] ?? ST.pending).bg}`}>{(ST[detail.status] ?? ST.pending).label}</span>
                <button onClick={() => { setDetail(null); setCommentText(""); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
              </div>
              <p className="text-xs text-slate-400">{detail.type === "task" ? "태스크" : "피드백"}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* 상세 정보 */}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(detail.extra).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{k}</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{v}</p>
                  </div>
                ))}
              </div>

              {/* 댓글 */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">댓글 ({(comments[detail.id] ?? []).length})</h4>
                {(comments[detail.id] ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">아직 댓글이 없습니다</p>
                ) : (
                  <div className="space-y-1.5">
                    {(comments[detail.id] ?? []).map(c => (
                      <div key={c.id} className="bg-slate-50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-5 h-5 bg-[#3182F6] rounded-full flex items-center justify-center">
                            <span className="text-[9px] text-white font-bold">{displayName(c.author)[0]}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{displayName(c.author)}</span>
                          <span className="text-[10px] text-slate-400">{c.time}</span>
                        </div>
                        <p className="text-sm text-slate-600 pl-7">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 댓글 입력 */}
            <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
              <input className={`${I} flex-1`} placeholder="댓글을 입력하세요..."
                value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && detail) addComment(detail.id); }} />
              <button className={B} onClick={() => detail && addComment(detail.id)}>전송</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">현황판</h2>
          <p className="text-xs text-slate-500">
            {userName}님, {(() => { const h = new Date().getHours(); return h < 12 ? "좋은 오전이에요" : h < 18 ? "좋은 오후에요" : "좋은 저녁이에요"; })()}. 오늘도 화이팅!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode(v => !v)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              editMode
                ? "bg-[#3182F6] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {editMode ? "완료" : "편집"}
          </button>
          <span className={`${BADGE} bg-blue-50 text-blue-700`}>{myRole}</span>
        </div>
      </div>

      {/* Edit mode: section order & visibility */}
      {editMode && (
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
                  onDragStart={() => handleDragStart(key)}
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                    dragItem === key ? "border-[#3182F6] bg-blue-50 shadow-md" : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${!visible ? "opacity-50" : ""}`}
                >
                  <span className="text-slate-400 flex-shrink-0 cursor-grab">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/><circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/></svg>
                  </span>
                  <span className="text-sm">{sec.icon}</span>
                  <span className="text-sm font-medium text-slate-700 flex-1">{sec.label}</span>
                  <button
                    onClick={() => toggleVisibility(key)}
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
      )}

      {/* Ordered sections based on widget preferences */}
      {widgetPrefs.order.map(sectionKey => {
        if (!isSectionVisible(sectionKey)) return null;

        switch (sectionKey) {
          case "stats":
            return (
              <div key="stats" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "총 사용자", value: fmt(totalUsers), icon: "👥", bg: "bg-blue-50", color: "text-[#3182F6]" },
                  { label: "오늘 가입", value: fmt(todaySignups), icon: "🆕", bg: "bg-emerald-50", color: "text-emerald-600" },
                  { label: "총 매출", value: `₩${fmt(totalRevenue)}`, icon: "💰", bg: "bg-amber-50", color: "text-amber-600" },
                  { label: "활성 구독", value: fmt(activeSubs), icon: "⭐", bg: "bg-purple-50", color: "text-purple-600" },
                ].map((s) => (
                  <div key={s.label} className={`${C} border-l-4 ${s.bg.replace("50", "400")} !p-3`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-6 h-6 ${s.bg} rounded-lg flex items-center justify-center text-xs`}>{s.icon}</span>
                      <p className="text-[11px] font-semibold text-slate-500">{s.label}</p>
                    </div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            );

          case "todayTasks":
            return (
              <div key="todayTasks" className={`${C} !p-4`}>
                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <span>📌</span> 오늘 할 일
                  <span className="text-[10px] text-slate-400 font-normal">({tasks.filter(t => t.deadline === today() || t.status === "pending" || t.status === "planned").length}건)</span>
                </h3>
                {tasks.filter(t => t.deadline === today() || t.status === "pending" || t.status === "planned").length === 0 ? (
                  <div className="text-center py-3">
                    <span className="text-2xl block mb-1">📭</span>
                    <p className="text-sm text-slate-400">오늘 예정된 할 일이 없습니다.</p>
                    <button onClick={() => go("task")} className="text-xs text-[#3182F6] hover:underline mt-1">태스크 탭에서 추가하세요 &rarr;</button>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[180px] overflow-y-auto">
                    {tasks
                      .filter(t => t.deadline === today() || t.status === "pending" || t.status === "planned")
                      .slice(0, 8)
                      .map(t => {
                        const isDone = t.status === "completed";
                        return (
                          <div key={t.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                            onClick={() => openTask(t)}>
                            <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isDone ? "bg-[#3182F6] border-[#3182F6]" : "border-slate-300"}`}>
                              {isDone && <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l1.5 1.5L6 3" /></svg>}
                            </span>
                            <span className={`truncate text-xs ${isDone ? "line-through text-slate-400" : "text-slate-700"}`}>{t.title}</span>
                            {t.deadline && <span className="text-[10px] text-slate-400 flex-shrink-0 ml-auto">{t.deadline === today() ? "오늘" : t.deadline.slice(5)}</span>}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );

          case "approvals_attendance":
            return (
              <div key="approvals_attendance" className="grid gap-2 sm:grid-cols-2">
                <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("approval")}>
                  <h3 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <span>📋</span> 미결 결재
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className={`text-xl font-bold ${pendingApprovals > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {pendingApprovals}건
                    </p>
                    <span className="text-[10px] text-slate-400">결재함 →</span>
                  </div>
                </div>
                <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("attendance")}>
                  <h3 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <span>⏰</span> 오늘 출근 현황
                  </h3>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-base font-bold text-[#3182F6]">{attendanceIn}명</p>
                      <p className="text-[10px] text-slate-400">출근</p>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div>
                      <p className="text-base font-bold text-slate-400">{attendanceOut}명</p>
                      <p className="text-[10px] text-slate-400">미출근</p>
                    </div>
                  </div>
                </div>
              </div>
            );

          case "recentActivity":
            return recentActivity.length > 0 ? (
              <div key="recentActivity" className={`${C} !p-3`}>
                <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <span>🕐</span> 최근 활동
                </h3>
                <div className="space-y-0.5">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors"
                      onClick={() => go(a.tab)}>
                      <span className="text-sm flex-shrink-0">{a.icon}</span>
                      <span className="truncate text-slate-700 flex-1">{a.title}</span>
                      <span className={`${BADGE} text-[9px] bg-slate-100 text-slate-500`}>{a.type}</span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {a.time ? new Date(a.time).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;

          case "kpi":
            return (
              <div key="kpi">
                {latest && (
                  <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20 mb-4`} onClick={() => go("kpi")}>
                    <h3 className="mb-2 text-xs font-bold text-slate-700">최근 KPI ({latest.date}) <span className="text-[10px] text-slate-400 font-normal">→ 상세보기</span></h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] text-slate-500">매출</p>
                        <p className="text-sm font-bold text-slate-900">₩{fmt(latest.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">사용자</p>
                        <p className="text-sm font-bold text-slate-900">{fmt(latest.users_count)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">전환율</p>
                        <p className="text-sm font-bold text-slate-900">{latest.conversion_rate}%</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">이익</p>
                        <p className={`text-sm font-bold ${latest.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          ₩{fmt(latest.profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {last7.length > 0 && (
                  <div className={`${C} !p-3`}>
                    <h3 className="mb-2 text-xs font-bold text-slate-700">7일 매출 추이</h3>
                    <div className="flex items-end gap-2" style={{ height: 80 }}>
                      {last7.map((m) => {
                        const h = Math.max((m.revenue / maxRev) * 100, 4);
                        return (
                          <div key={m.date} className="flex flex-1 flex-col items-center gap-0.5">
                            <span className="text-[9px] font-semibold text-slate-600">
                              ₩{fmt(m.revenue)}
                            </span>
                            <div
                              className="w-full rounded-lg bg-[#3182F6]/80 transition-all"
                              style={{ height: `${h}%`, minHeight: 4 }}
                            />
                            <span className="text-[9px] text-slate-400">
                              {m.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );

          case "goals":
            return (
              <div key="goals" className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("goal")}>
                <h3 className="mb-1 text-xs font-bold text-slate-700">활성 목표 <span className="text-[10px] text-slate-400 font-normal">({Math.round((achievedGoals / totalGoals) * 100)}% 달성) →</span></h3>
                {activeGoals.length === 0 ? (
                  <div className="text-center py-2">
                    <span className="text-xl block mb-0.5">🎯</span>
                    <p className="text-xs text-slate-400">설정된 목표가 없습니다.</p>
                    <button onClick={() => go("goal")} className="text-[10px] text-[#3182F6] hover:underline mt-0.5">목표 탭에서 추가하세요 &rarr;</button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeGoals.slice(0, 3).map((g) => {
                      const pct = g.target_value ? Math.round((g.current_value / g.target_value) * 100) : 0;
                      return (
                        <div key={g.id}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800 truncate">{g.title}</span>
                            <span className="text-[11px] font-semibold text-[#3182F6] ml-1">{pct}%</span>
                          </div>
                          <div className="mt-0.5 h-1 rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#3182F6] transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );

          case "tasks":
            return (
              <div key="tasks" className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("task")}>
                <h3 className="mb-1 text-xs font-bold text-slate-700">최근 태스크 <span className="text-[10px] text-slate-400 font-normal">(대기 {pendingTasks}건) →</span></h3>
                {tasks.length === 0 ? (
                  <div className="text-center py-2">
                    <span className="text-xl block mb-0.5">📋</span>
                    <p className="text-xs text-slate-400">태스크가 없습니다.</p>
                    <button onClick={() => go("task")} className="text-[10px] text-[#3182F6] hover:underline mt-0.5">태스크 탭에서 추가하세요 &rarr;</button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {tasks.slice(0, 4).map((t) => {
                      const st = ST[t.status] ?? ST.pending;
                      const cmtCount = (comments[t.id] ?? []).length;
                      return (
                        <div key={t.id} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-slate-50 rounded-lg px-1 py-0.5 -mx-1 transition-colors"
                          onClick={(e) => { e.stopPropagation(); openTask(t); }}>
                          <span className={`${BADGE} text-[9px] ${st.bg}`}>{st.label}</span>
                          <span className="truncate text-slate-700">{t.title}</span>
                          {cmtCount > 0 && <span className="text-[9px] text-slate-400 flex-shrink-0">💬{cmtCount}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );

          case "feedback":
            return (
              <div key="feedback" className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("feedback")}>
                <h3 className="mb-1 text-xs font-bold text-slate-700">최근 피드백 <span className="text-[10px] text-slate-400 font-normal">(미해결 {feedbackCount}건) →</span></h3>
                {feedbacks.length === 0 ? (
                  <div className="text-center py-2">
                    <span className="text-xl block mb-0.5">💬</span>
                    <p className="text-xs text-slate-400">피드백이 없습니다.</p>
                    <button onClick={() => go("feedback")} className="text-[10px] text-[#3182F6] hover:underline mt-0.5">피드백 탭에서 추가하세요 &rarr;</button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {feedbacks.slice(0, 4).map((f) => {
                      const cmtCount = (comments[f.id] ?? []).length;
                      return (
                        <div key={f.id} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-slate-50 rounded-lg px-1 py-0.5 -mx-1 transition-colors"
                          onClick={(e) => { e.stopPropagation(); openFeedback(f); }}>
                          <span className={`${BADGE} text-[9px] ${f.status === "완료" ? "bg-emerald-50 text-emerald-700" : f.status === "진행" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{f.status}</span>
                          <span className="truncate text-slate-700">{f.title}</span>
                          <span className={`${BADGE} text-[8px] ${f.priority === "높음" ? "bg-red-50 text-red-600" : f.priority === "낮음" ? "bg-slate-50 text-slate-500" : "bg-amber-50 text-amber-600"}`}>{f.priority}</span>
                          {cmtCount > 0 && <span className="text-[9px] text-slate-400 flex-shrink-0">💬{cmtCount}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );

          case "aars":
            return (
              <div key="aars" className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("aar")}>
                <h3 className="mb-1 text-xs font-bold text-slate-700">최근 AAR <span className="text-[10px] text-slate-400 font-normal">(이번 달 {monthAars}건) →</span></h3>
                {aars.length === 0 ? (
                  <div className="text-center py-2">
                    <span className="text-xl block mb-0.5">📝</span>
                    <p className="text-xs text-slate-400">AAR이 없습니다.</p>
                    <button onClick={() => go("aar")} className="text-[10px] text-[#3182F6] hover:underline mt-0.5">AAR 탭에서 추가하세요 &rarr;</button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {aars.slice(0, 3).map((a) => (
                      <div key={a.id} className="text-xs">
                        <span className="text-[10px] text-slate-400">{a.date}</span>
                        <p className="truncate text-slate-700">{a.goal}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );

          default:
            return null;
        }
      })}

      {/* Weekly Directive (always visible, not part of widget system) */}
      <div className={`${C} !p-3`}>
        <h3 className="mb-1.5 text-xs font-bold text-slate-700">주간 지시사항</h3>
        <textarea
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          rows={2}
          placeholder="이번 주 핵심 지시사항을 입력하세요..."
          value={directive}
          onChange={(e) => saveDirective(e.target.value)}
        />
      </div>
    </div>
  );
}
