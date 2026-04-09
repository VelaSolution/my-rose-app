"use client";
import { useState, useEffect } from "react";
import type { HQRole, Task, Goal, TaskComment } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, ST } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const STATUSES = [
  { key: "pending", label: "대기" },
  { key: "in_progress", label: "진행중" },
  { key: "review", label: "검토" },
  { key: "completed", label: "완료" },
] as const;

const STATUS_DOT: Record<string, string> = {
  pending: "bg-slate-400",
  in_progress: "bg-amber-400",
  review: "bg-purple-400",
  completed: "bg-emerald-400",
};

const EMPTY = { title: "", assignee: "", deadline: "", goal_id: "" };

export default function TaskTab({ userId, userName, flash }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    load();
    loadComments();
  }, []);

  async function loadComments() {
    const s = sb();
    if (!s) return;
    try {
      const { data } = await s.from("hq_task_comments").select("*").order("created_at", { ascending: true });
      if (data) {
        const grouped: Record<string, TaskComment[]> = {};
        for (const r of data as any[]) {
          const tid = r.task_id;
          if (!grouped[tid]) grouped[tid] = [];
          grouped[tid].push({ id: r.id, author: r.author, text: r.text, time: r.created_at });
        }
        setComments(grouped);
      }
    } catch {}
  }

  async function load() {
    const s = sb();
    if (!s) return;
    const [tRes, gRes] = await Promise.all([
      s.from("hq_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      s.from("hq_goals").select("*").eq("user_id", userId).eq("status", "active"),
    ]);
    setTasks((tRes.data as Task[]) ?? []);
    setGoals((gRes.data as Goal[]) ?? []);
  }

  async function save() {
    if (!form.title.trim()) { flash("태스크 제목을 입력하세요"); return; }
    setSaving(true);
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_tasks").insert({
      user_id: userId,
      title: form.title,
      assignee: form.assignee || userName,
      deadline: form.deadline || null,
      goal_id: form.goal_id || null,
      status: "pending",
      result: "",
    });
    if (error) flash("저장 실패: " + error.message);
    else { flash("태스크 생성 완료"); setForm({ ...EMPTY }); await load(); }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    const s = sb();
    if (!s) return;
    await s.from("hq_tasks").update({ status }).eq("id", id);
    await load();
  }

  async function remove(id: string) {
    const s = sb();
    if (!s) return;
    await s.from("hq_tasks").delete().eq("id", id);
    flash("삭제 완료");
    await load();
  }

  async function addComment(taskId: string) {
    const text = commentInputs[taskId]?.trim();
    if (!text) return;
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_task_comments").insert({ task_id: taskId, author: userName, text });
    if (error) { flash("댓글 저장 실패"); return; }
    setCommentInputs((p) => ({ ...p, [taskId]: "" }));
    loadComments();
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g.title]));

  function dDayBadge(deadline: string | null | undefined) {
    if (!deadline) return null;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const dl = new Date(deadline);
    dl.setHours(0, 0, 0, 0);
    const diff = Math.round((dl.getTime() - todayDate.getTime()) / 86400000);
    if (diff === 0) return <span className={`${BADGE} text-[10px] bg-red-50 text-red-600`}>D-DAY</span>;
    if (diff < 0) return <span className={`${BADGE} text-[10px] bg-red-50 text-red-600`}>D+{Math.abs(diff)} 지연</span>;
    if (diff <= 3) return <span className={`${BADGE} text-[10px] bg-amber-50 text-amber-600`}>D-{diff}</span>;
    return <span className={`${BADGE} text-[10px] bg-slate-50 text-slate-500`}>D-{diff}</span>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">태스크 관리</h2>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            onClick={() => setView("list")}
          >
            리스트
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${view === "kanban" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            onClick={() => setView("kanban")}
          >
            칸반
          </button>
        </div>
      </div>

      {/* Form */}
      <div className={C}>
        <h3 className="mb-4 text-sm font-bold text-slate-700">새 태스크</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={L}>제목</label>
            <input className={I} placeholder="태스크 제목" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label className={L}>담당자</label>
            <input className={I} placeholder={userName} value={form.assignee} onChange={(e) => set("assignee", e.target.value)} />
          </div>
          <div>
            <label className={L}>마감일</label>
            <input type="date" className={I} value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={L}>연결 목표</label>
            <select className={I} value={form.goal_id} onChange={(e) => set("goal_id", e.target.value)}>
              <option value="">없음</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end sm:col-span-2">
            <button className={B} onClick={save} disabled={saving}>
              {saving ? "생성 중..." : "태스크 생성"}
            </button>
          </div>
        </div>
      </div>

      {/* List View */}
      {view === "list" && (
        <div className="space-y-2">
          {tasks.map((t) => {
            const st = ST[t.status] ?? ST.pending;
            const dot = STATUS_DOT[t.status] ?? "bg-slate-400";
            const tc = comments[t.id] ?? [];
            const isExpanded = expandedTask === t.id;
            return (
              <div key={t.id} className={C}>
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="truncate text-sm font-semibold text-slate-800 text-left hover:text-[#3182F6]"
                        onClick={() => setExpandedTask(isExpanded ? null : t.id)}
                      >
                        {t.title}
                      </button>
                      {dDayBadge(t.deadline)}
                      {t.goal_id && goalMap[t.goal_id] && (
                        <span className={`${BADGE} text-[10px] bg-blue-50 text-blue-600`}>
                          {goalMap[t.goal_id]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {t.assignee} &middot; {t.deadline || "마감일 없음"}
                    </p>
                  </div>
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none"
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <button className="text-xs text-red-400 hover:text-red-600" onClick={() => remove(t.id)}>
                    삭제
                  </button>
                </div>

                {/* Comments */}
                {isExpanded && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {tc.length > 0 && (
                      <div className="mb-2 space-y-1.5">
                        {tc.map((c) => (
                          <div key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                            <span className="font-semibold text-slate-700">{c.author}</span>
                            <span className="ml-2 text-slate-400">{new Date(c.time).toLocaleString("ko-KR")}</span>
                            <p className="mt-0.5 text-slate-600">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-blue-400"
                        placeholder="코멘트 입력..."
                        value={commentInputs[t.id] ?? ""}
                        onChange={(e) => setCommentInputs((p) => ({ ...p, [t.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addComment(t.id)}
                      />
                      <button className={`${B2} text-xs`} onClick={() => addComment(t.id)}>
                        추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {tasks.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">태스크가 없습니다.</p>
          )}
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            const dot = STATUS_DOT[col.key];
            return (
              <div key={col.key} className="rounded-2xl bg-slate-50/80 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  <h4 className="text-xs font-bold text-slate-600">{col.label}</h4>
                  <span className="ml-auto text-xs text-slate-400">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <div key={t.id} className="rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{t.title}</p>
                        {dDayBadge(t.deadline)}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {t.assignee} &middot; {t.deadline || "마감일 없음"}
                      </p>
                      {t.goal_id && goalMap[t.goal_id] && (
                        <span className={`${BADGE} mt-1.5 text-[10px] bg-blue-50 text-blue-600`}>
                          {goalMap[t.goal_id]}
                        </span>
                      )}
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {STATUSES.filter((s) => s.key !== col.key).map((s) => (
                          <button
                            key={s.key}
                            className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                            onClick={() => updateStatus(t.id, s.key)}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-300">비어 있음</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
