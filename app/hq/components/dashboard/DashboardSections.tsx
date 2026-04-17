"use client";
import type { Tab, Goal, Task, AAR, Feedback } from "@/app/hq/types";
import type { Metric } from "@/app/hq/types";
import { fmt, today, C, BADGE, ST, useTeamDisplayNames } from "@/app/hq/utils";

type Comment = { id: string; author: string; text: string; time: string };

interface SharedProps {
  go: (tab: Tab) => void;
  userName: string;
}

// ── Stats Cards ──
export function StatsSection({ totalUsers, todaySignups, totalRevenue, activeSubs }: {
  totalUsers: number; todaySignups: number; totalRevenue: number; activeSubs: number;
}) {
  const items = [
    { label: "총 사용자", value: fmt(totalUsers), sub: "명", icon: "👥", gradient: "from-blue-500 to-blue-600" },
    { label: "오늘 가입", value: fmt(todaySignups), sub: "명", icon: "📈", gradient: "from-emerald-500 to-emerald-600" },
    { label: "총 매출", value: `₩${fmt(totalRevenue)}`, sub: "", icon: "💰", gradient: "from-amber-500 to-orange-500" },
    { label: "활성 구독", value: fmt(activeSubs), sub: "건", icon: "⭐", gradient: "from-purple-500 to-violet-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className={`${C} !p-3.5 relative overflow-hidden`}>
          <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${s.gradient} opacity-[0.07] rounded-bl-[2rem]`} />
          <p className="text-[11px] font-semibold text-slate-400 mb-1">{s.label}</p>
          <p className="text-xl font-bold text-slate-900">{s.value}<span className="text-xs font-medium text-slate-400 ml-0.5">{s.sub}</span></p>
        </div>
      ))}
    </div>
  );
}

// ── Today Tasks ──
export function TodayTasksSection({ tasks, go, openTask }: SharedProps & {
  tasks: Task[];
  openTask: (t: Task) => void;
}) {
  const todayTasks = tasks.filter(t => t.deadline === today() || t.status === "pending" || t.status === "planned");
  return (
    <div className={`${C} !p-4`}>
      <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
        <span>📌</span> 오늘 할 일
        <span className="text-[10px] text-slate-400 font-normal">({todayTasks.length}건)</span>
      </h3>
      {todayTasks.length === 0 ? (
        <div className="text-center py-3">
          <span className="text-2xl block mb-1">📭</span>
          <p className="text-sm text-slate-400">오늘 예정된 할 일이 없습니다.</p>
          <button onClick={() => go("task")} className="text-xs text-[#3182F6] hover:underline mt-1">태스크 탭에서 추가하세요 &rarr;</button>
        </div>
      ) : (
        <div className="space-y-1 max-h-[180px] overflow-y-auto">
          {todayTasks.slice(0, 8).map(t => {
            const isDone = t.status === "completed";
            return (
              <div key={t.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded-lg hover:bg-slate-50 transition cursor-pointer" onClick={() => openTask(t)}>
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
}

// ── Approvals & Attendance ──
export function ApprovalsAttendanceSection({ pendingApprovals, attendanceIn, attendanceOut, go }: SharedProps & {
  pendingApprovals: number; attendanceIn: number; attendanceOut: number;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("approval")}>
        <h3 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5"><span>📋</span> 미결 결재</h3>
        <div className="flex items-center justify-between">
          <p className={`text-xl font-bold ${pendingApprovals > 0 ? "text-amber-600" : "text-emerald-600"}`}>{pendingApprovals}건</p>
          <span className="text-[10px] text-slate-400">결재함 →</span>
        </div>
      </div>
      <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("attendance")}>
        <h3 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5"><span>⏰</span> 오늘 출근 현황</h3>
        <div className="flex items-center gap-4">
          <div><p className="text-base font-bold text-[#3182F6]">{attendanceIn}명</p><p className="text-[10px] text-slate-400">출근</p></div>
          <div className="w-px h-6 bg-slate-200" />
          <div><p className="text-base font-bold text-slate-400">{attendanceOut}명</p><p className="text-[10px] text-slate-400">미출근</p></div>
        </div>
      </div>
    </div>
  );
}

// ── Recent Activity ──
export function RecentActivitySection({ recentActivity, go }: SharedProps & {
  recentActivity: { type: string; icon: string; title: string; time: string; tab: Tab }[];
}) {
  if (recentActivity.length === 0) return null;
  return (
    <div className={`${C} !p-3`}>
      <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><span>🕐</span> 최근 활동</h3>
      <div className="space-y-0.5">
        {recentActivity.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors" onClick={() => go(a.tab)}>
            <span className="text-sm flex-shrink-0">{a.icon}</span>
            <span className="truncate text-slate-700 flex-1">{a.title}</span>
            <span className={`${BADGE} text-[9px] bg-slate-100 text-slate-500`}>{a.type}</span>
            <span className="text-[10px] text-slate-400 flex-shrink-0">{a.time ? new Date(a.time).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KPI ──
export function KpiSection({ metrics, go }: SharedProps & { metrics: Metric[] }) {
  const latest = metrics[0];
  const last7 = metrics.slice(0, 7).reverse();
  const maxRev = Math.max(...last7.map((m) => m.revenue || 0), 1);

  return (
    <div>
      {latest && (
        <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20 mb-4`} onClick={() => go("kpi")}>
          <h3 className="mb-2 text-xs font-bold text-slate-700">최근 KPI ({latest.date}) <span className="text-[10px] text-slate-400 font-normal">→ 상세보기</span></h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div><p className="text-[11px] text-slate-500">매출</p><p className="text-sm font-bold text-slate-900">₩{fmt(latest.revenue)}</p></div>
            <div><p className="text-[11px] text-slate-500">사용자</p><p className="text-sm font-bold text-slate-900">{fmt(latest.users_count)}</p></div>
            <div><p className="text-[11px] text-slate-500">전환율</p><p className="text-sm font-bold text-slate-900">{latest.conversion_rate}%</p></div>
            <div><p className="text-[11px] text-slate-500">이익</p><p className={`text-sm font-bold ${latest.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>₩{fmt(latest.profit)}</p></div>
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
                  <span className="text-[9px] font-semibold text-slate-600">₩{fmt(m.revenue)}</span>
                  <div className="w-full rounded-lg bg-[#3182F6]/80 transition-all" style={{ height: `${h}%`, minHeight: 4 }} />
                  <span className="text-[9px] text-slate-400">{m.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Goals ──
export function GoalsSection({ goals, go }: SharedProps & { goals: Goal[] }) {
  const activeGoals = goals.filter((g) => g.status === "active");
  const achievedGoals = goals.filter((g) => g.status === "completed").length;
  const totalGoals = goals.length || 1;

  return (
    <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("goal")}>
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
}

// ── Tasks ──
export function TasksSection({ tasks, comments, go, openTask }: SharedProps & {
  tasks: Task[]; comments: Record<string, Comment[]>;
  openTask: (t: Task) => void;
}) {
  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "planned").length;
  return (
    <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("task")}>
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
}

// ── Feedback ──
export function FeedbackSectionDash({ feedbacks, comments, go, openFeedback }: SharedProps & {
  feedbacks: Feedback[]; comments: Record<string, Comment[]>;
  openFeedback: (f: Feedback) => void;
}) {
  const feedbackCount = feedbacks.filter(f => f.status !== "완료").length;
  return (
    <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("feedback")}>
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
}

// ── AARs ──
export function AarsSection({ aars, go }: SharedProps & { aars: AAR[] }) {
  const monthAars = aars.filter((a) => a.date?.startsWith(today().slice(0, 7))).length;
  return (
    <div className={`${C} !p-3 cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("aar")}>
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
}
