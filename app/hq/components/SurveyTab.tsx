"use client";
import { useState, useEffect, useMemo } from "react";
import { HQRole, SurveyItem, SurveyQuestion, SurveyResponse } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const Q_TYPES: SurveyQuestion["type"][] = ["단일선택", "복수선택", "서술형", "평점"];

const STATUS_STYLE: Record<string, string> = {
  "진행중": "bg-blue-50 text-blue-700",
  "마감": "bg-slate-100 text-slate-500",
  "예정": "bg-amber-50 text-amber-700",
};

type View = "list" | "create" | "answer" | "result";

export default function SurveyTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(0);

  // Create form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  // Answer form
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const loadSurveys = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data, error } = await s.from("hq_surveys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        const todayStr = today();
        const mapped = data.map((d: any) => ({
          id: d.id,
          title: d.title ?? "",
          description: d.description ?? "",
          author: d.author ?? "",
          deadline: d.deadline ?? "",
          status: d.status ?? "진행중",
          questions: d.questions ?? [],
          responses: d.responses ?? 0,
          date: d.created_at?.slice(0, 10) ?? todayStr,
        }));

        // Auto-close expired surveys
        const expiredIds: string[] = [];
        for (const survey of mapped) {
          if (survey.deadline < todayStr && survey.status !== "마감") {
            survey.status = "마감";
            expiredIds.push(survey.id);
          }
        }
        if (expiredIds.length > 0) {
          for (const id of expiredIds) {
            await s.from("hq_surveys").update({ status: "마감" }).eq("id", id);
          }
        }

        setSurveys(mapped);
      }
    } catch (e) {
      console.error("SurveyTab loadSurveys error:", e);
    }
  };

  const loadResponses = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { data, error } = await s.from("hq_survey_responses").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      if (data) {
        setResponses(data.map((d: any) => ({
          id: d.id,
          surveyId: d.survey_id ?? "",
          answers: d.answers ?? {},
          respondent: d.respondent ?? "",
          date: d.created_at?.slice(0, 10) ?? today(),
        })));
      }
    } catch (e) {
      console.error("SurveyTab loadResponses error:", e);
    }
  };

  const loadTeamCount = async () => {
    const s = sb();
    if (!s) return;
    try {
      const { count } = await s.from("hq_team").select("*", { count: "exact", head: true });
      setTeamCount(count ?? 0);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadSurveys();
    loadResponses();
    loadTeamCount();
  }, []);

  const addQuestion = () => {
    setQuestions([...questions, { id: crypto.randomUUID(), type: "단일선택", question: "", options: ["옵션 1", "옵션 2"] }]);
  };

  const updateQuestion = (idx: number, patch: Partial<SurveyQuestion>) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const addOption = (qIdx: number) => {
    const q = questions[qIdx];
    updateQuestion(qIdx, { options: [...(q.options || []), `옵션 ${(q.options?.length || 0) + 1}`] });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const q = questions[qIdx];
    updateQuestion(qIdx, { options: (q.options || []).filter((_, i) => i !== oIdx) });
  };

  const updateOption = (qIdx: number, oIdx: number, val: string) => {
    const q = questions[qIdx];
    updateQuestion(qIdx, { options: (q.options || []).map((o, i) => i === oIdx ? val : o) });
  };

  const createSurvey = async () => {
    if (!title.trim()) { flash("제목을 입력하세요"); return; }
    if (questions.length === 0) { flash("질문을 추가하세요"); return; }
    if (!deadline) { flash("마감일을 설정하세요"); return; }
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_surveys").insert({
        title: title.trim(),
        description: desc.trim(),
        author: userName,
        deadline,
        status: deadline > today() ? "진행중" : "마감",
        questions,
        responses: 0,
      });
      if (error) throw error;
      await loadSurveys();
      flash("설문이 생성되었습니다");
      setTitle(""); setDesc(""); setDeadline(""); setQuestions([]);
      setView("list");
    } catch (e) {
      console.error("createSurvey error:", e);
      flash("설문 생성 실패");
    }
  };

  const openAnswer = (id: string) => {
    const already = responses.find(r => r.surveyId === id && r.respondent === userName);
    if (already) { flash("이미 참여한 설문입니다"); return; }
    setSelectedId(id);
    setAnswers({});
    setView("answer");
  };

  const submitAnswer = async () => {
    if (!selectedId) return;
    const survey = surveys.find(s => s.id === selectedId);
    if (!survey) return;
    for (const q of survey.questions) {
      const a = answers[q.id];
      if (!a || (Array.isArray(a) && a.length === 0) || (typeof a === "string" && !a.trim())) {
        flash("모든 질문에 답변해 주세요"); return;
      }
    }
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    try {
      const { error } = await s.from("hq_survey_responses").insert({
        survey_id: selectedId,
        respondent: userName,
        answers,
      });
      if (error) throw error;
      await s.from("hq_surveys").update({ responses: (survey.responses ?? 0) + 1 }).eq("id", selectedId);
      await loadSurveys();
      await loadResponses();
      flash("설문 제출 완료");
      setView("list");
    } catch (e) {
      console.error("submitAnswer error:", e);
      flash("설문 제출 실패");
    }
  };

  const openResult = (id: string) => {
    setSelectedId(id);
    setView("result");
  };

  const selected = surveys.find(s => s.id === selectedId);
  const surveyResponses = responses.filter(r => r.surveyId === selectedId);

  // Export CSV
  const exportCsv = () => {
    if (!selected) return;
    const headers = ["응답자", "날짜", ...selected.questions.map(q => q.question)];
    const rows = surveyResponses.map(r => {
      const row = [r.respondent, r.date];
      for (const q of selected.questions) {
        const a = r.answers[q.id];
        row.push(Array.isArray(a) ? a.join("; ") : String(a ?? ""));
      }
      return row;
    });
    const csv = "﻿" + [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `설문결과_${selected.title}_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash("CSV 다운로드 완료");
  };

  // Enhanced bar chart helper
  const renderBar = (label: string, count: number, total: number) => {
    const pct = total === 0 ? 0 : Math.round((count / total) * 100);
    return (
      <div key={label} className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-600 font-medium">{label}</span>
          <span className="text-slate-500 font-semibold">{count}표 ({pct}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-6 relative overflow-hidden">
          <div
            className="bg-[#3182F6] h-6 rounded-full transition-all duration-500 flex items-center"
            style={{ width: `${Math.max(pct, 2)}%` }}
          >
            {pct > 15 && <span className="text-[10px] text-white font-bold ml-auto pr-2">{pct}%</span>}
          </div>
          {pct <= 15 && pct > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">{pct}%</span>
          )}
        </div>
      </div>
    );
  };

  // Star display
  const renderStars = (avg: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(avg)) {
        stars.push(<span key={i} className="text-amber-400 text-lg">&#9733;</span>);
      } else if (i - 0.5 <= avg) {
        stars.push(<span key={i} className="text-amber-400 text-lg">&#9733;</span>);
      } else {
        stars.push(<span key={i} className="text-slate-200 text-lg">&#9733;</span>);
      }
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  // Response rate
  const responseRate = (surveyResCount: number) => {
    if (teamCount === 0) return null;
    const pct = Math.round((surveyResCount / teamCount) * 100);
    return { pct, total: teamCount };
  };

  // ---- VIEWS ----
  if (view === "create") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className={B2}>&larr; 목록</button>
          <h2 className="text-sm font-bold text-slate-700">설문 만들기</h2>
        </div>
        <div className={C}>
          <div className="space-y-4">
            <div>
              <label className={L}>설문 제목</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="설문 제목" className={I} />
            </div>
            <div>
              <label className={L}>설명</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="설문 설명 (선택)" rows={2} className={I} />
            </div>
            <div>
              <label className={L}>마감일</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={I} />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className={C}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">질문 목록 ({questions.length})</h3>
            <button onClick={addQuestion} className={B}>+ 질문 추가</button>
          </div>
          {questions.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">질문을 추가해 주세요</p>
          )}
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs font-bold text-[#3182F6] bg-blue-50 rounded-lg px-2 py-1 shrink-0">Q{qi + 1}</span>
                  <input
                    value={q.question}
                    onChange={e => updateQuestion(qi, { question: e.target.value })}
                    placeholder="질문을 입력하세요"
                    className={`${I} flex-1`}
                  />
                  <button onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600 text-sm shrink-0">삭제</button>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-slate-400">유형:</label>
                  <select
                    value={q.type}
                    onChange={e => {
                      const t = e.target.value as SurveyQuestion["type"];
                      updateQuestion(qi, {
                        type: t,
                        options: (t === "단일선택" || t === "복수선택") ? (q.options?.length ? q.options : ["옵션 1", "옵션 2"]) : undefined
                      });
                    }}
                    className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-white"
                  >
                    {Q_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {(q.type === "단일선택" || q.type === "복수선택") && (
                  <div className="space-y-2 ml-7">
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-xs text-slate-300">{oi + 1}.</span>
                        <input
                          value={opt}
                          onChange={e => updateOption(qi, oi, e.target.value)}
                          className="flex-1 text-sm rounded-lg border border-slate-200 px-3 py-1.5 bg-white focus:border-blue-400 outline-none"
                        />
                        <button onClick={() => removeOption(qi, oi)} className="text-xs text-slate-400 hover:text-red-500">&times;</button>
                      </div>
                    ))}
                    <button onClick={() => addOption(qi)} className="text-xs text-[#3182F6] font-semibold hover:underline">+ 옵션 추가</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => setView("list")} className={B2}>취소</button>
          <button onClick={createSurvey} className={B}>설문 생성</button>
        </div>
      </div>
    );
  }

  if (view === "answer" && selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className={B2}>&larr; 목록</button>
          <h2 className="text-sm font-bold text-slate-700">설문 참여</h2>
        </div>
        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-1">{selected.title}</h3>
          {selected.description && <p className="text-sm text-slate-500 mb-4">{selected.description}</p>}
          <div className="space-y-5">
            {selected.questions.map((q, qi) => (
              <div key={q.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  <span className="text-[#3182F6] mr-1">Q{qi + 1}.</span> {q.question}
                </p>
                {q.type === "단일선택" && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oi) => (
                      <label key={oi} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                          className="accent-[#3182F6]"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "복수선택" && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt, oi) => {
                      const arr = (answers[q.id] as string[] | undefined) || [];
                      return (
                        <label key={oi} className="flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={arr.includes(opt)}
                            onChange={() => {
                              const next = arr.includes(opt) ? arr.filter(a => a !== opt) : [...arr, opt];
                              setAnswers({ ...answers, [q.id]: next });
                            }}
                            className="accent-[#3182F6]"
                          />
                          <span className="text-sm text-slate-600 group-hover:text-slate-800">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {q.type === "서술형" && (
                  <textarea
                    value={(answers[q.id] as string) || ""}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="답변을 입력하세요"
                    rows={3}
                    className={I}
                  />
                )}
                {q.type === "평점" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setAnswers({ ...answers, [q.id]: String(n) })}
                        className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                          answers[q.id] === String(n)
                            ? "bg-[#3182F6] text-white shadow-md"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setView("list")} className={B2}>취소</button>
            <button onClick={submitAnswer} className={B}>제출하기</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "result" && selected) {
    const rate = responseRate(surveyResponses.length);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("list")} className={B2}>&larr; 목록</button>
            <h2 className="text-sm font-bold text-slate-700">설문 결과</h2>
            <span className="text-xs text-slate-400">{surveyResponses.length}명 참여</span>
          </div>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-xs hover:bg-emerald-100 transition-all">
            CSV 다운로드
          </button>
        </div>

        {/* Response rate */}
        {rate && (
          <div className={C}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-500">응답률</h4>
              <span className="text-sm font-bold text-[#3182F6]">{rate.pct}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#3182F6] rounded-full transition-all" style={{ width: `${rate.pct}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{surveyResponses.length}명 / 전체 {rate.total}명</p>
          </div>
        )}

        <div className={C}>
          <h3 className="text-lg font-bold text-slate-800 mb-1">{selected.title}</h3>
          {selected.description && <p className="text-sm text-slate-500 mb-5">{selected.description}</p>}
          <div className="space-y-6">
            {selected.questions.map((q, qi) => (
              <div key={q.id} className="p-4 rounded-xl border border-slate-100">
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  <span className="text-[#3182F6] mr-1">Q{qi + 1}.</span> {q.question}
                  <span className="text-xs text-slate-400 ml-2">({q.type})</span>
                </p>
                {(q.type === "단일선택" || q.type === "복수선택") && (
                  <div>
                    {(q.options || []).map(opt => {
                      const count = surveyResponses.filter(r => {
                        const a = r.answers[q.id];
                        return Array.isArray(a) ? a.includes(opt) : a === opt;
                      }).length;
                      return renderBar(opt, count, surveyResponses.length);
                    })}
                  </div>
                )}
                {q.type === "서술형" && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {surveyResponses.map(r => {
                      const a = r.answers[q.id];
                      if (!a) return null;
                      return (
                        <div key={r.id} className="text-sm p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-xs text-slate-400">{r.respondent}:</span>
                          <p className="text-slate-600 mt-0.5">{String(a)}</p>
                        </div>
                      );
                    })}
                    {surveyResponses.length === 0 && <p className="text-sm text-slate-400">아직 응답이 없습니다</p>}
                  </div>
                )}
                {q.type === "평점" && (() => {
                  const scores = surveyResponses.map(r => Number(r.answers[q.id]) || 0).filter(n => n > 0);
                  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                  return (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl font-bold text-[#3182F6]">{avg.toFixed(1)}</span>
                        <div>
                          {renderStars(avg)}
                          <span className="text-xs text-slate-400">/ 5.0 ({scores.length}명)</span>
                        </div>
                      </div>
                      {[5, 4, 3, 2, 1].map(n => {
                        const count = scores.filter(s => s === n).length;
                        return renderBar(`${n}점`, count, scores.length);
                      })}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700">설문 / 투표</h2>
        <button onClick={() => setView("create")} className={B}>+ 설문 만들기</button>
      </div>

      {surveys.length === 0 ? (
        <div className={C}>
          <p className="text-center text-sm text-slate-400 py-12">등록된 설문이 없습니다</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {surveys.map(s => {
            const hasAnswered = responses.some(r => r.surveyId === s.id && r.respondent === userName);
            const isClosed = s.deadline < today();
            const status = isClosed ? "마감" : s.status;
            const rate = responseRate(s.responses);
            return (
              <div key={s.id} className={`${C} cursor-default`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${BADGE} text-[11px] ${STATUS_STYLE[status]}`}>{status}</span>
                      {hasAnswered && <span className={`${BADGE} text-[11px] bg-emerald-50 text-emerald-600`}>참여완료</span>}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">{s.title}</h3>
                    {s.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{s.description}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{displayName(s.author)}</span>
                    <span>마감: {s.deadline}</span>
                    <span>{s.responses}명 참여</span>
                    {rate && <span className="text-[#3182F6] font-semibold">응답률 {rate.pct}%</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openResult(s.id)} className={B2 + " !text-xs !px-3 !py-1.5"}>결과</button>
                    {!isClosed && !hasAnswered && (
                      <button onClick={() => openAnswer(s.id)} className={`text-xs px-3 py-1.5 rounded-lg bg-[#3182F6] text-white font-semibold hover:bg-[#2672DE] transition-all`}>
                        참여하기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
