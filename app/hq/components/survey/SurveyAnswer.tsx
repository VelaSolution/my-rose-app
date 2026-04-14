"use client";
import { SurveyItem } from "@/app/hq/types";
import { I, C, B, B2 } from "@/app/hq/utils";

interface Props {
  survey: SurveyItem;
  answers: Record<string, string | string[]>;
  setAnswers: (a: Record<string, string | string[]>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function SurveyAnswer({ survey, answers, setAnswers, onBack, onSubmit }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className={B2}>&larr; 목록</button>
        <h2 className="text-sm font-bold text-slate-700">설문 참여</h2>
      </div>
      <div className={C}>
        <h3 className="text-lg font-bold text-slate-800 mb-1">{survey.title}</h3>
        {survey.description && <p className="text-sm text-slate-500 mb-4">{survey.description}</p>}
        <div className="space-y-5">
          {survey.questions.map((q, qi) => (
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
          <button onClick={onBack} className={B2}>취소</button>
          <button onClick={onSubmit} className={B}>제출하기</button>
        </div>
      </div>
    </div>
  );
}
