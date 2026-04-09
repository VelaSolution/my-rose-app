"use client";
import { useState, useEffect } from "react";
import type { HQRole, Mett, Metric, Goal, Task, AAR, Tab, Feedback } from "@/app/hq/types";
import { sb, fmt, today, I, C, B, BADGE, ST } from "@/app/hq/utils";

type Comment = { id: string; author: string; text: string; time: string };
type DetailItem = { type: "task" | "feedback"; id: string; title: string; status: string; extra: Record<string, string> };

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
  onNavigate?: (tab: Tab) => void;
}

export default function Dashboard({ userId, userName, myRole, flash, onNavigate }: Props) {
  const go = (tab: Tab) => onNavigate?.(tab);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
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
      setTotalUsers(pAll.count ?? 0);
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

  function saveDirective(v: string) {
    setDirective(v);
    const s = sb();
    if (s) s.from("hq_directives").upsert({ user_id: userId, content: v, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).then(() => {});
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
    extra: { 담당자: t.assignee || "-", 마감일: t.deadline || "-", 결과: t.result || "-" },
  });

  const openFeedback = (f: Feedback) => setDetail({
    type: "feedback", id: f.id, title: f.title, status: f.status,
    extra: { 유형: f.type, 우선순위: f.priority, 설명: f.description || "-", 작성자: f.author, 날짜: f.date },
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

  return (
    <div className="space-y-6">
      {/* 상세 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setDetail(null); setCommentText(""); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{detail.type === "task" ? "✅" : "🐛"}</span>
                <h3 className="text-lg font-bold text-slate-900 flex-1">{detail.title}</h3>
                <span className={`${BADGE} ${(ST[detail.status] ?? ST.pending).bg}`}>{(ST[detail.status] ?? ST.pending).label}</span>
                <button onClick={() => { setDetail(null); setCommentText(""); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
              </div>
              <p className="text-xs text-slate-400">{detail.type === "task" ? "태스크" : "피드백"}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* 상세 정보 */}
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(detail.extra).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{k}</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{v}</p>
                  </div>
                ))}
              </div>

              {/* 댓글 */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">댓글 ({(comments[detail.id] ?? []).length})</h4>
                {(comments[detail.id] ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">아직 댓글이 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {(comments[detail.id] ?? []).map(c => (
                      <div key={c.id} className="bg-slate-50 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 bg-[#3182F6] rounded-full flex items-center justify-center">
                            <span className="text-[9px] text-white font-bold">{c.author[0]}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{c.author}</span>
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
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
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
          <h2 className="text-xl font-bold text-slate-900">현황판</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {userName}님, 오늘도 좋은 하루 되세요.
          </p>
        </div>
        <span className={`${BADGE} bg-blue-50 text-blue-700`}>{myRole}</span>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "총 사용자", value: fmt(totalUsers), color: "text-slate-900" },
          { label: "오늘 가입", value: fmt(todaySignups), color: "text-[#3182F6]" },
          { label: "총 매출", value: `₩${fmt(totalRevenue)}`, color: "text-emerald-600" },
          { label: "활성 구독", value: fmt(activeSubs), color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className={C}>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Manual KPI */}
      {latest && (
        <div className={`${C} cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("kpi")}>
          <h3 className="mb-3 text-sm font-bold text-slate-700">최근 KPI ({latest.date}) <span className="text-[10px] text-slate-400 font-normal">→ 상세보기</span></h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">매출</p>
              <p className="text-base font-bold text-slate-900">₩{fmt(latest.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">사용자</p>
              <p className="text-base font-bold text-slate-900">{fmt(latest.users_count)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">전환율</p>
              <p className="text-base font-bold text-slate-900">{latest.conversion_rate}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">이익</p>
              <p className={`text-base font-bold ${latest.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                ₩{fmt(latest.profit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7-day Revenue Chart */}
      {last7.length > 0 && (
        <div className={C}>
          <h3 className="mb-4 text-sm font-bold text-slate-700">7일 매출 추이</h3>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {last7.map((m) => {
              const h = Math.max((m.revenue / maxRev) * 100, 4);
              return (
                <div key={m.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-600">
                    ₩{fmt(m.revenue)}
                  </span>
                  <div
                    className="w-full rounded-lg bg-[#3182F6]/80 transition-all"
                    style={{ height: `${h}%`, minHeight: 4 }}
                  />
                  <span className="text-[10px] text-slate-400">
                    {m.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "대기 태스크", value: pendingTasks, bg: "bg-amber-50 text-amber-700", tab: "task" as Tab },
          { label: "목표 달성률", value: `${Math.round((achievedGoals / totalGoals) * 100)}%`, bg: "bg-emerald-50 text-emerald-700", tab: "goal" as Tab },
          { label: "미해결 피드백", value: feedbackCount, bg: "bg-red-50 text-red-600", tab: "feedback" as Tab },
          { label: "이번 달 AAR", value: monthAars, bg: "bg-blue-50 text-blue-700", tab: "aar" as Tab },
        ].map((s) => (
          <div key={s.label} className={`${C} cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go(s.tab)}>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.bg.split(" ")[1]}`}>{s.value}</p>
            <p className="mt-1 text-[10px] text-slate-400">클릭하여 이동 →</p>
          </div>
        ))}
      </div>

      {/* Weekly Directive */}
      <div className={C}>
        <h3 className="mb-2 text-sm font-bold text-slate-700">주간 지시사항</h3>
        <textarea
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          rows={3}
          placeholder="이번 주 핵심 지시사항을 입력하세요..."
          value={directive}
          onChange={(e) => saveDirective(e.target.value)}
        />
      </div>

      {/* Quick Cards Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Mission */}
        {metts[0] && (
          <div className={`${C} cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("mett")}>
            <h3 className="mb-2 text-sm font-bold text-slate-700">현재 임무 <span className="text-[10px] text-slate-400 font-normal">→</span></h3>
            <p className="text-sm text-slate-800 leading-relaxed">{metts[0].mission}</p>
            <p className="mt-2 text-xs text-slate-400">
              위협: {metts[0].enemy} / 환경: {metts[0].terrain}
            </p>
          </div>
        )}

        {/* Active Goals */}
        <div className={`${C} cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("goal")}>
          <h3 className="mb-2 text-sm font-bold text-slate-700">활성 목표 <span className="text-[10px] text-slate-400 font-normal">→</span></h3>
          {activeGoals.length === 0 ? (
            <p className="text-sm text-slate-400">설정된 목표가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {activeGoals.slice(0, 2).map((g) => {
                const pct = g.target_value ? Math.round((g.current_value / g.target_value) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{g.title}</span>
                      <span className="text-xs font-semibold text-[#3182F6]">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#3182F6] transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className={`${C} cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("task")}>
          <h3 className="mb-2 text-sm font-bold text-slate-700">최근 태스크 <span className="text-[10px] text-slate-400 font-normal">→</span></h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400">태스크가 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {tasks.slice(0, 4).map((t) => {
                const st = ST[t.status] ?? ST.pending;
                const cmtCount = (comments[t.id] ?? []).length;
                return (
                  <div key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded-lg px-1 py-0.5 -mx-1 transition-colors"
                    onClick={(e) => { e.stopPropagation(); openTask(t); }}>
                    <span className={`${BADGE} text-[10px] ${st.bg}`}>{st.label}</span>
                    <span className="truncate text-slate-700">{t.title}</span>
                    {cmtCount > 0 && <span className="text-[10px] text-slate-400 flex-shrink-0">💬{cmtCount}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Feedback */}
        <div className={`${C} cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("feedback")}>
          <h3 className="mb-2 text-sm font-bold text-slate-700">최근 피드백 <span className="text-[10px] text-slate-400 font-normal">→</span></h3>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-slate-400">피드백이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {feedbacks.slice(0, 4).map((f) => {
                const cmtCount = (comments[f.id] ?? []).length;
                return (
                  <div key={f.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 rounded-lg px-1 py-0.5 -mx-1 transition-colors"
                    onClick={(e) => { e.stopPropagation(); openFeedback(f); }}>
                    <span className={`${BADGE} text-[10px] ${f.status === "완료" ? "bg-emerald-50 text-emerald-700" : f.status === "진행" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{f.status}</span>
                    <span className="truncate text-slate-700">{f.title}</span>
                    <span className={`${BADGE} text-[9px] ${f.priority === "높음" ? "bg-red-50 text-red-600" : f.priority === "낮음" ? "bg-slate-50 text-slate-500" : "bg-amber-50 text-amber-600"}`}>{f.priority}</span>
                    {cmtCount > 0 && <span className="text-[10px] text-slate-400 flex-shrink-0">💬{cmtCount}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent AARs */}
        <div className={`${C} cursor-pointer hover:ring-2 hover:ring-[#3182F6]/20`} onClick={() => go("aar")}>
          <h3 className="mb-2 text-sm font-bold text-slate-700">최근 AAR <span className="text-[10px] text-slate-400 font-normal">→</span></h3>
          {aars.length === 0 ? (
            <p className="text-sm text-slate-400">AAR이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {aars.slice(0, 3).map((a) => (
                <div key={a.id} className="text-sm">
                  <span className="text-xs text-slate-400">{a.date}</span>
                  <p className="truncate text-slate-700">{a.goal}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Operating Rhythm */}
      <div className={C}>
        <h3 className="mb-3 text-sm font-bold text-slate-700">운영 리듬</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50/60 p-3">
            <p className="text-xs font-bold text-blue-700">Daily</p>
            <ul className="mt-1 space-y-0.5 text-xs text-blue-900/70">
              <li>- 태스크 상태 업데이트</li>
              <li>- KPI 기록</li>
              <li>- 팀 체크인</li>
            </ul>
          </div>
          <div className="rounded-xl bg-emerald-50/60 p-3">
            <p className="text-xs font-bold text-emerald-700">Weekly</p>
            <ul className="mt-1 space-y-0.5 text-xs text-emerald-900/70">
              <li>- 주간 지시사항 갱신</li>
              <li>- 목표 진척 검토</li>
              <li>- AAR 작성</li>
            </ul>
          </div>
          <div className="rounded-xl bg-amber-50/60 p-3">
            <p className="text-xs font-bold text-amber-700">Monthly</p>
            <ul className="mt-1 space-y-0.5 text-xs text-amber-900/70">
              <li>- METT-TC 갱신</li>
              <li>- 목표 재설정</li>
              <li>- 전략 리뷰</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
