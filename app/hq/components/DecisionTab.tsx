"use client";

import { useState, useEffect } from "react";
import { HQRole, Decision } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const STATUS_FLOW = ["제안", "검토", "확정", "실행"] as const;
type DecisionStatus = typeof STATUS_FLOW[number];
const STATUS_COLORS: Record<DecisionStatus, { bg: string; dot: string }> = {
  "제안": { bg: "bg-slate-50 text-slate-600", dot: "bg-slate-400" },
  "검토": { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  "확정": { bg: "bg-blue-50 text-blue-700", dot: "bg-blue-400" },
  "실행": { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
};

const IMPACT_LEVELS = ["상", "중", "하"] as const;
type ImpactLevel = typeof IMPACT_LEVELS[number];
const IMPACT_COLORS: Record<ImpactLevel, string> = {
  "상": "bg-red-50 text-red-600",
  "중": "bg-amber-50 text-amber-600",
  "하": "bg-slate-50 text-slate-500",
};

interface EnrichedDecision extends Decision {
  status?: DecisionStatus;
  impact?: ImpactLevel;
  relatedGoal?: string;
  votes?: { up: string[]; down: string[] };
}

export default function DecisionTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [list, setList] = useState<EnrichedDecision[]>([]);
  const [title, setTitle] = useState("");
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [owner, setOwner] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [impact, setImpact] = useState<ImpactLevel>("중");
  const [relatedGoal, setRelatedGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    const s = sb();
    if (!s) return setLoading(false);
    const { data } = await s
      .from("hq_decisions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data)
      setList(
        data.map((r: any) => ({
          id: r.id,
          title: r.title,
          decision: r.decision,
          reason: r.reason,
          owner: r.owner,
          date: r.created_at,
          followUp: r.follow_up || "",
          status: r.status ?? "제안",
          impact: r.impact ?? "중",
          relatedGoal: r.related_goal ?? "",
          votes: r.votes ?? { up: [], down: [] },
        }))
      );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!title.trim() || !decision.trim())
      return flash("제목과 결정사항을 입력하세요");
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_decisions").insert({
      title: title.trim(),
      decision: decision.trim(),
      reason: reason.trim(),
      owner: owner.trim() || userName,
      follow_up: followUp.trim(),
      impact,
      related_goal: relatedGoal.trim(),
      status: "제안",
      votes: { up: [], down: [] },
      created_at: new Date().toISOString(),
    });
    if (error) return flash("저장 실패: " + error.message);
    flash("의사결정이 기록되었습니다");
    setTitle("");
    setDecision("");
    setReason("");
    setOwner("");
    setFollowUp("");
    setImpact("중");
    setRelatedGoal("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_decisions").delete().eq("id", id);
    flash("삭제되었습니다");
    load();
  };

  const updateStatus = async (d: EnrichedDecision, newStatus: DecisionStatus) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_decisions").update({ status: newStatus }).eq("id", d.id);
    flash(`상태: ${newStatus}`);
    load();
  };

  const vote = async (d: EnrichedDecision, type: "up" | "down") => {
    const s = sb();
    if (!s) return;
    const votes = { ...(d.votes ?? { up: [], down: [] }) };
    const opposite = type === "up" ? "down" : "up";
    // Remove from opposite if exists
    votes[opposite] = votes[opposite].filter(u => u !== userName);
    // Toggle current
    if (votes[type].includes(userName)) {
      votes[type] = votes[type].filter(u => u !== userName);
    } else {
      votes[type] = [...votes[type], userName];
    }
    await s.from("hq_decisions").update({ votes }).eq("id", d.id);
    load();
  };

  const canManage = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">의사결정 기록</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={L}>제목</label>
              <input
                className={I}
                placeholder="의사결정 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className={L}>책임자</label>
              <input
                className={I}
                placeholder="책임자 이름"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={L}>영향도</label>
              <div className="flex gap-2">
                {IMPACT_LEVELS.map(lv => (
                  <button
                    key={lv}
                    onClick={() => setImpact(lv)}
                    className={`${BADGE} transition-all ${impact === lv ? IMPACT_COLORS[lv] + " ring-2 ring-offset-1 ring-blue-300" : "bg-slate-50 text-slate-400"}`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={L}>연관 목표/태스크</label>
              <input
                className={I}
                placeholder="관련 목표 또는 태스크"
                value={relatedGoal}
                onChange={(e) => setRelatedGoal(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={L}>결정사항</label>
            <textarea
              className={`${I} min-h-[80px] resize-y`}
              placeholder="어떤 결정을 내렸는지 작성하세요"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className={L}>근거/이유</label>
            <textarea
              className={`${I} min-h-[80px] resize-y`}
              placeholder="결정의 근거와 이유를 작성하세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className={L}>후속 조치</label>
            <input
              className={I}
              placeholder="후속으로 필요한 액션"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </div>
          <button className={B} onClick={add}>
            기록 저장
          </button>
        </div>
      </div>

      {/* List / Timeline toggle */}
      <div className={C}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            의사결정 로그{" "}
            <span className="text-sm font-normal text-slate-400">
              ({list.length}건)
            </span>
          </h3>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
            >
              목록
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === "timeline" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
            >
              타임라인
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-8 text-center">불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            기록된 의사결정이 없습니다
          </p>
        ) : viewMode === "list" ? (
          /* LIST VIEW */
          <div className="space-y-3">
            {list.map((d) => {
              const expanded = expandedId === d.id;
              const st = STATUS_COLORS[d.status ?? "제안"];
              const upActive = d.votes?.up?.includes(userName);
              const downActive = d.votes?.down?.includes(userName);
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Header */}
                  <div
                    className="flex items-start justify-between gap-3 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : d.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`${BADGE} ${st.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot} mr-1.5`} />
                          {d.status ?? "제안"}
                        </span>
                        <span className={`${BADGE} ${IMPACT_COLORS[d.impact ?? "중"]}`}>
                          영향 {d.impact ?? "중"}
                        </span>
                        {d.relatedGoal && (
                          <span className={`${BADGE} bg-indigo-50 text-indigo-600`}>
                            {d.relatedGoal}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">{d.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {displayName(d.owner)} ·{" "}
                        {new Date(d.date).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Vote buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); vote(d, "up"); }}
                          className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-all ${
                            upActive ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          <span>{"👍"}</span>
                          <span>{d.votes?.up?.length ?? 0}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); vote(d, "down"); }}
                          className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-all ${
                            downActive ? "bg-red-50 text-red-600 font-semibold" : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          <span>{"👎"}</span>
                          <span>{d.votes?.down?.length ?? 0}</span>
                        </button>
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      {/* Status flow */}
                      {canManage && (
                        <div className="flex items-center gap-1 mb-3">
                          <span className="text-xs font-semibold text-slate-500 mr-2">상태 변경</span>
                          {STATUS_FLOW.map((s, idx) => {
                            const isCurrent = s === (d.status ?? "제안");
                            const sc = STATUS_COLORS[s];
                            return (
                              <div key={s} className="flex items-center">
                                <button
                                  onClick={() => updateStatus(d, s)}
                                  className={`${BADGE} transition-all ${isCurrent ? sc.bg + " ring-2 ring-offset-1 ring-blue-300" : "bg-slate-50 text-slate-400 hover:text-slate-600"}`}
                                >
                                  {s}
                                </button>
                                {idx < STATUS_FLOW.length - 1 && (
                                  <svg className="w-4 h-4 text-slate-300 mx-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="bg-blue-50/60 rounded-lg px-3 py-2">
                        <span className="text-[11px] font-semibold text-blue-500 block mb-0.5">
                          결정사항
                        </span>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {d.decision}
                        </p>
                      </div>
                      {d.reason && (
                        <div className="bg-slate-50 rounded-lg px-3 py-2">
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                            근거
                          </span>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {d.reason}
                          </p>
                        </div>
                      )}
                      {d.followUp && (
                        <div className="bg-amber-50/60 rounded-lg px-3 py-2">
                          <span className="text-[11px] font-semibold text-amber-500 block mb-0.5">
                            후속 조치
                          </span>
                          <p className="text-sm text-slate-700">{d.followUp}</p>
                        </div>
                      )}

                      {/* Voters list */}
                      {(d.votes?.up?.length || d.votes?.down?.length) ? (
                        <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500">
                          {d.votes!.up.length > 0 && (
                            <p><span className="font-semibold">찬성:</span> {d.votes!.up.join(", ")}</p>
                          )}
                          {d.votes!.down.length > 0 && (
                            <p><span className="font-semibold">반대:</span> {d.votes!.down.join(", ")}</p>
                          )}
                        </div>
                      ) : null}

                      {canManage && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => remove(d.id)}
                            className="rounded-xl bg-red-50 text-red-600 font-semibold px-4 py-2 text-sm hover:bg-red-100 transition-all"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* TIMELINE VIEW */
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-slate-200" />
            {list.map((d, idx) => {
              const st = STATUS_COLORS[d.status ?? "제안"];
              return (
                <div key={d.id} className="relative mb-6 last:mb-0">
                  {/* Dot */}
                  <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white ${st.dot}`} />
                  <div className="rounded-xl border border-slate-100 p-4 bg-white hover:bg-slate-50/40 transition-colors">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`${BADGE} ${st.bg}`}>{d.status ?? "제안"}</span>
                      <span className={`${BADGE} ${IMPACT_COLORS[d.impact ?? "중"]}`}>영향 {d.impact ?? "중"}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">{d.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{d.decision}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-400">
                        {displayName(d.owner)} · {new Date(d.date).toLocaleDateString("ko-KR")}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{"👍"} {d.votes?.up?.length ?? 0}</span>
                        <span>{"👎"} {d.votes?.down?.length ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
