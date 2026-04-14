"use client";
import { SurveyQuestion } from "@/app/hq/types";
import { I, C, L, B, B2 } from "@/app/hq/utils";

const Q_TYPES: SurveyQuestion["type"][] = ["단일선택", "복수선택", "서술형", "평점"];

interface Props {
  title: string;
  setTitle: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  deadline: string;
  setDeadline: (v: string) => void;
  questions: SurveyQuestion[];
  setQuestions: (q: SurveyQuestion[]) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function SurveyCreate({
  title, setTitle, desc, setDesc, deadline, setDeadline,
  questions, setQuestions, onBack, onSubmit,
}: Props) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className={B2}>&larr; 목록</button>
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
        <button onClick={onBack} className={B2}>취소</button>
        <button onClick={onSubmit} className={B}>설문 생성</button>
      </div>
    </div>
  );
}
