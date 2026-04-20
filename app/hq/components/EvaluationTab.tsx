"use client";
import { useState, useEffect, useMemo } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type EvalPeriod = { id: string; name: string; start_date: string; end_date: string; type: string; status: string };
type Evaluation = {
  id: string; period_id: string; evaluator: string; evaluatee: string;
  type: "자기" | "상사" | "동료"; goals_score: number; competency_score: number;
  comment: string; status: string;
};

type View = "periods" | "create-period" | "eval-list" | "eval-form" | "results";

const EVAL_TYPES = ["MBO", "역량", "다면"] as const;
const STATUS_FLOW = ["작성중", "제출", "검토", "확정"] as const;
const STATUS_COLORS: Record<string, string> = {
  "작성중": "bg-amber-50 text-amber-700",
  "제출": "bg-blue-50 text-blue-700",
  "검토": "bg-purple-50 text-purple-700",
  "확정": "bg-emerald-50 text-emerald-700",
};
const PERIOD_STATUS_COLORS: Record<string, string> = {
  "준비": "bg-slate-100 text-slate-600",
  "진행중": "bg-blue-50 text-blue-700",
  "완료": "bg-emerald-50 text-emerald-700",
};
const SCORES = [1, 2, 3, 4, 5];

const EMPTY_PERIOD = { name: "", start_date: today(), end_date: today(), type: "MBO" as string };
const EMPTY_EVAL = { evaluatee: "", type: "자기" as "자기" | "상사" | "동료", goals_score: 3, competency_score: 3, comment: "" };

export default function EvaluationTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const isAdmin = myRole === "대표" || myRole === "이사";
  const isManager = myRole === "대표" || myRole === "이사" || myRole === "팀장";
  const [view, setView] = useState<View>("periods");
  const [periods, setPeriods] = useState<EvalPeriod[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodForm, setPeriodForm] = useState(EMPTY_PERIOD);
  const [editPeriodId, setEditPeriodId] = useState<string | null>(null);
  const [evalForm, setEvalForm] = useState(EMPTY_EVAL);
  const [editEvalId, setEditEvalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const s = sb(); if (!s) return;
    setLoading(true);
    try {
      const [{ data: p }, { data: e }] = await Promise.all([
        s.from("hq_eval_periods").select("*").order("start_date", { ascending: false }),
        s.from("hq_evaluations").select("*").order("created_at", { ascending: false }),
      ]);
      if (p) setPeriods(p.map((d: any) => ({ id: d.id, name: d.name, start_date: d.start_date, end_date: d.end_date, type: d.type ?? "MBO", status: d.status ?? "준비" })));
      if (e) setEvaluations(e.map((d: any) => ({ id: d.id, period_id: d.period_id, evaluator: d.evaluator, evaluatee: d.evaluatee, type: d.type ?? "자기", goals_score: d.goals_score ?? 0, competency_score: d.competency_score ?? 0, comment: d.comment ?? "", status: d.status ?? "작성중" })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectedPeriod = useMemo(() => periods.find(p => p.id === selectedPeriodId), [periods, selectedPeriodId]);
  const periodEvals = useMemo(() => evaluations.filter(e => e.period_id === selectedPeriodId), [evaluations, selectedPeriodId]);
  const myEvals = useMemo(() => evaluations.filter(e => e.evaluator === userName || e.evaluatee === userName), [evaluations, userName]);

  const handleSavePeriod = async () => {
    if (!periodForm.name) { flash("평가명을 입력하세요"); return; }
    const s = sb(); if (!s) return;
    setSaving(true);
    try {
      const payload = { name: periodForm.name, start_date: periodForm.start_date, end_date: periodForm.end_date, type: periodForm.type, status: "준비" };
      if (editPeriodId) {
        const { error } = await s.from("hq_eval_periods").update(payload).eq("id", editPeriodId);
        if (error) throw error;
        flash("수정되었습니다");
      } else {
        const { error } = await s.from("hq_eval_periods").insert(payload);
        if (error) throw error;
        flash("평가 기간이 생성되었습니다");
      }
      setPeriodForm(EMPTY_PERIOD); setEditPeriodId(null); setView("periods"); load();
    } catch (e) { flash("저장 실패"); console.error(e); }
    setSaving(false);
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("평가 기간을 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_evaluations").delete().eq("period_id", id);
      await s.from("hq_eval_periods").delete().eq("id", id);
      flash("삭제되었습니다"); load();
    } catch (e) { flash("삭제 실패"); }
  };

  const handlePeriodStatusChange = async (id: string, status: string) => {
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_eval_periods").update({ status }).eq("id", id);
      flash("상태가 변경되었습니다"); load();
    } catch (e) { flash("변경 실패"); }
  };

  const handleSaveEval = async () => {
    if (!evalForm.evaluatee) { flash("피평가자를 입력하세요"); return; }
    if (!selectedPeriodId) { flash("평가 기간을 선택하세요"); return; }
    const s = sb(); if (!s) return;
    setSaving(true);
    try {
      const payload = {
        period_id: selectedPeriodId, evaluator: userName, evaluatee: evalForm.type === "자기" ? userName : evalForm.evaluatee,
        type: evalForm.type, goals_score: evalForm.goals_score, competency_score: evalForm.competency_score,
        comment: evalForm.comment, status: "작성중",
      };
      if (editEvalId) {
        const { error } = await s.from("hq_evaluations").update(payload).eq("id", editEvalId);
        if (error) throw error;
        flash("수정되었습니다");
      } else {
        const { error } = await s.from("hq_evaluations").insert(payload);
        if (error) throw error;
        flash("평가가 저장되었습니다");
      }
      setEvalForm(EMPTY_EVAL); setEditEvalId(null); setView("eval-list"); load();
    } catch (e) { flash("저장 실패"); console.error(e); }
    setSaving(false);
  };

  const handleEvalStatusChange = async (evalId: string, status: string) => {
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_evaluations").update({ status }).eq("id", evalId);
      flash(`상태: ${status}`); load();
    } catch (e) { flash("변경 실패"); }
  };

  const handleDeleteEval = async (id: string) => {
    if (!confirm("평가를 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_evaluations").delete().eq("id", id);
      flash("삭제되었습니다"); load();
    } catch (e) { flash("삭제 실패"); }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;

  // 평가 기간 생성/수정 폼
  if (view === "create-period") {
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => { setView("periods"); setEditPeriodId(null); setPeriodForm(EMPTY_PERIOD); }}>← 목록</button>
        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-4">{editPeriodId ? "평가 기간 수정" : "평가 기간 생성"}</h3>
          <div className="space-y-3">
            <div><label className={L}>평가명</label><input value={periodForm.name} onChange={e => setPeriodForm({ ...periodForm, name: e.target.value })} className={I} placeholder="예: 2026 상반기 인사평가" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={L}>시작일</label><input type="date" value={periodForm.start_date} onChange={e => setPeriodForm({ ...periodForm, start_date: e.target.value })} className={I} /></div>
              <div><label className={L}>종료일</label><input type="date" value={periodForm.end_date} onChange={e => setPeriodForm({ ...periodForm, end_date: e.target.value })} className={I} /></div>
            </div>
            <div>
              <label className={L}>평가 유형</label>
              <select value={periodForm.type} onChange={e => setPeriodForm({ ...periodForm, type: e.target.value })} className={I}>
                {EVAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button className={B} onClick={handleSavePeriod} disabled={saving}>{saving ? "저장 중..." : editPeriodId ? "수정" : "생성"}</button>
              <button className={B2} onClick={() => { setView("periods"); setEditPeriodId(null); setPeriodForm(EMPTY_PERIOD); }}>취소</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 평가 작성 폼
  if (view === "eval-form" && selectedPeriod) {
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => { setView("eval-list"); setEditEvalId(null); setEvalForm(EMPTY_EVAL); }}>← 돌아가기</button>
        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-1">{editEvalId ? "평가 수정" : "평가 작성"}</h3>
          <p className="text-sm text-slate-400 mb-4">{selectedPeriod.name} · {selectedPeriod.type}</p>
          <div className="space-y-4">
            <div>
              <label className={L}>평가 유형</label>
              <div className="flex gap-2">
                {(["자기", "상사", "동료"] as const).map(t => (
                  <button key={t} className={`${BADGE} cursor-pointer ${evalForm.type === t ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600"}`} onClick={() => setEvalForm({ ...evalForm, type: t, evaluatee: t === "자기" ? userName : evalForm.evaluatee })}>{t}평가</button>
                ))}
              </div>
            </div>
            {evalForm.type !== "자기" && (
              <div><label className={L}>피평가자</label><input value={evalForm.evaluatee} onChange={e => setEvalForm({ ...evalForm, evaluatee: e.target.value })} className={I} placeholder="이름을 입력하세요" /></div>
            )}
            <div>
              <label className={L}>목표 달성도 (1~5)</label>
              <div className="flex gap-2">
                {SCORES.map(s => (
                  <button key={s} className={`w-10 h-10 rounded-xl font-bold text-sm ${evalForm.goals_score === s ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600"} cursor-pointer`} onClick={() => setEvalForm({ ...evalForm, goals_score: s })}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={L}>역량 점수 (1~5)</label>
              <div className="flex gap-2">
                {SCORES.map(s => (
                  <button key={s} className={`w-10 h-10 rounded-xl font-bold text-sm ${evalForm.competency_score === s ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600"} cursor-pointer`} onClick={() => setEvalForm({ ...evalForm, competency_score: s })}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={L}>코멘트 (강점, 개선 영역, 종합 의견)</label>
              <textarea value={evalForm.comment} onChange={e => setEvalForm({ ...evalForm, comment: e.target.value })} className={`${I} h-32`} placeholder="목표 달성도, 강점, 개선이 필요한 영역을 작성하세요" />
            </div>
            <div className="flex gap-2 pt-2">
              <button className={B} onClick={handleSaveEval} disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
              <button className={B2} onClick={() => { setView("eval-list"); setEditEvalId(null); setEvalForm(EMPTY_EVAL); }}>취소</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 평가 목록 (기간 선택 후)
  if (view === "eval-list" && selectedPeriod) {
    const avgGoals = periodEvals.length > 0 ? (periodEvals.reduce((s, e) => s + e.goals_score, 0) / periodEvals.length).toFixed(1) : "-";
    const avgComp = periodEvals.length > 0 ? (periodEvals.reduce((s, e) => s + e.competency_score, 0) / periodEvals.length).toFixed(1) : "-";
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => { setView("periods"); setSelectedPeriodId(null); }}>← 평가 기간 목록</button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{selectedPeriod.name}</h2>
            <p className="text-sm text-slate-400">{selectedPeriod.type} · {selectedPeriod.start_date} ~ {selectedPeriod.end_date}</p>
          </div>
          <div className="flex gap-2">
            <button className={B} onClick={() => { setEvalForm({ ...EMPTY_EVAL, evaluatee: userName }); setEditEvalId(null); setView("eval-form"); }}>+ 평가 작성</button>
            {isAdmin && <button className={B2} onClick={() => setView("results")}>결과 보기</button>}
          </div>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={C}><p className="text-xs text-slate-400">총 평가</p><p className="text-2xl font-bold text-slate-700">{periodEvals.length}건</p></div>
          <div className={C}><p className="text-xs text-slate-400">평균 목표달성</p><p className="text-2xl font-bold text-blue-600">{avgGoals}</p></div>
          <div className={C}><p className="text-xs text-slate-400">평균 역량</p><p className="text-2xl font-bold text-purple-600">{avgComp}</p></div>
          <div className={C}><p className="text-xs text-slate-400">확정 완료</p><p className="text-2xl font-bold text-emerald-600">{periodEvals.filter(e => e.status === "확정").length}건</p></div>
        </div>

        {/* 평가 리스트 */}
        <div className="space-y-2">
          {periodEvals.length === 0 && <p className="text-sm text-slate-400">작성된 평가가 없습니다</p>}
          {periodEvals.map(ev => {
            const canEdit = ev.evaluator === userName && (ev.status === "작성중" || ev.status === "제출");
            return (
              <div key={ev.id} className={`${C} flex items-center justify-between`}>
                <div>
                  <span className={`${BADGE} ${STATUS_COLORS[ev.status] ?? "bg-slate-100 text-slate-600"} mr-2`}>{ev.status}</span>
                  <span className="text-sm font-medium text-slate-700">{ev.type}평가</span>
                  <span className="text-sm text-slate-500 ml-2">{displayName(ev.evaluator)} → {displayName(ev.evaluatee)}</span>
                  <span className="text-xs text-slate-400 ml-3">목표: {ev.goals_score} · 역량: {ev.competency_score}</span>
                </div>
                <div className="flex gap-2 items-center">
                  {canEdit && (
                    <>
                      <button className="text-xs text-blue-500 hover:text-blue-700" onClick={() => { setEvalForm({ evaluatee: ev.evaluatee, type: ev.type, goals_score: ev.goals_score, competency_score: ev.competency_score, comment: ev.comment }); setEditEvalId(ev.id); setView("eval-form"); }}>수정</button>
                      <button className="text-xs text-[#3182F6]" onClick={() => handleEvalStatusChange(ev.id, "제출")}>제출</button>
                    </>
                  )}
                  {isManager && ev.status === "제출" && (
                    <button className="text-xs text-purple-600" onClick={() => handleEvalStatusChange(ev.id, "검토")}>검토</button>
                  )}
                  {isAdmin && ev.status === "검토" && (
                    <button className="text-xs text-emerald-600" onClick={() => handleEvalStatusChange(ev.id, "확정")}>확정</button>
                  )}
                  {(canEdit || isAdmin) && <button className="text-xs text-red-400 hover:text-red-600" onClick={() => handleDeleteEval(ev.id)}>삭제</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 결과 보기
  if (view === "results" && selectedPeriod) {
    const byPerson = periodEvals.filter(e => e.status === "확정").reduce((acc, e) => {
      if (!acc[e.evaluatee]) acc[e.evaluatee] = [];
      acc[e.evaluatee].push(e);
      return acc;
    }, {} as Record<string, Evaluation[]>);
    return (
      <div className="space-y-5">
        <button className={B2} onClick={() => setView("eval-list")}>← 돌아가기</button>
        <h2 className="text-lg font-bold text-slate-800">{selectedPeriod.name} — 결과</h2>
        {Object.keys(byPerson).length === 0 && <p className="text-sm text-slate-400">확정된 평가가 없습니다</p>}
        {Object.entries(byPerson).map(([person, evals]) => {
          const avgG = (evals.reduce((s, e) => s + e.goals_score, 0) / evals.length).toFixed(1);
          const avgC = (evals.reduce((s, e) => s + e.competency_score, 0) / evals.length).toFixed(1);
          const overall = ((Number(avgG) + Number(avgC)) / 2).toFixed(1);
          return (
            <div key={person} className={C}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">{displayName(person)}</h3>
                <span className={`${BADGE} bg-[#3182F6]/10 text-[#3182F6]`}>종합 {overall}</span>
              </div>
              {/* 레이더 차트 플레이스홀더 */}
              <div className="flex items-center justify-center h-32 rounded-xl bg-slate-50 mb-3">
                <div className="text-center">
                  <div className="flex gap-8 text-sm">
                    <div><p className="text-slate-400">목표달성</p><p className="text-2xl font-bold text-blue-600">{avgG}</p></div>
                    <div><p className="text-slate-400">역량</p><p className="text-2xl font-bold text-purple-600">{avgC}</p></div>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-2">* 레이더 차트 위치</p>
                </div>
              </div>
              <div className="space-y-1">
                {evals.map(e => (
                  <div key={e.id} className="text-xs text-slate-500 p-2 rounded-lg bg-slate-50">
                    <span className="font-medium">{e.type}평가</span> ({displayName(e.evaluator)}) — 목표: {e.goals_score}, 역량: {e.competency_score}
                    {e.comment && <p className="mt-1 text-slate-400">{e.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 평가 기간 목록 (기본 뷰)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">인사평가</h2>
        {isAdmin && <button className={B} onClick={() => { setPeriodForm(EMPTY_PERIOD); setEditPeriodId(null); setView("create-period"); }}>+ 평가 기간 생성</button>}
      </div>

      {periods.length === 0 && <p className="text-sm text-slate-400">등록된 평가 기간이 없습니다</p>}
      <div className="space-y-3">
        {periods.map(p => {
          const pEvals = evaluations.filter(e => e.period_id === p.id);
          const confirmed = pEvals.filter(e => e.status === "확정").length;
          return (
            <div key={p.id} className={`${C} cursor-pointer`} onClick={() => { setSelectedPeriodId(p.id); setView("eval-list"); }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`${BADGE} ${PERIOD_STATUS_COLORS[p.status] ?? "bg-slate-100 text-slate-600"}`}>{p.status}</span>
                  <span className={`${BADGE} bg-slate-100 text-slate-600`}>{p.type}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <select value={p.status} onChange={e => handlePeriodStatusChange(p.id, e.target.value)} className={`${I} w-24 text-xs py-1`}>
                      <option value="준비">준비</option>
                      <option value="진행중">진행중</option>
                      <option value="완료">완료</option>
                    </select>
                    <button className="text-xs text-slate-400 hover:text-blue-600" onClick={() => { setPeriodForm({ name: p.name, start_date: p.start_date, end_date: p.end_date, type: p.type }); setEditPeriodId(p.id); setView("create-period"); }}>수정</button>
                    <button className="text-xs text-red-400 hover:text-red-600" onClick={() => handleDeletePeriod(p.id)}>삭제</button>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-slate-800">{p.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{p.start_date} ~ {p.end_date}</p>
              <div className="flex gap-4 mt-2 text-xs text-slate-400">
                <span>평가 {pEvals.length}건</span>
                <span>확정 {confirmed}건</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 내 평가 요약 */}
      {myEvals.length > 0 && (
        <div className={C}>
          <h3 className="font-semibold text-slate-700 mb-3">내 평가 현황</h3>
          <div className="space-y-2">
            {myEvals.slice(0, 5).map(e => {
              const period = periods.find(p => p.id === e.period_id);
              return (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div>
                    <span className={`${BADGE} ${STATUS_COLORS[e.status] ?? "bg-slate-100 text-slate-600"} mr-2`}>{e.status}</span>
                    <span className="text-sm text-slate-600">{period?.name ?? "알 수 없음"}</span>
                    <span className="text-xs text-slate-400 ml-2">{e.type}평가 · {displayName(e.evaluator)} → {displayName(e.evaluatee)}</span>
                  </div>
                  <span className="text-xs text-slate-500">목표: {e.goals_score} / 역량: {e.competency_score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
