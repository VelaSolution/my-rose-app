"use client";
import { SurveyItem, SurveyResponse } from "@/app/hq/types";
import { C, B2 } from "@/app/hq/utils";

interface Props {
  survey: SurveyItem;
  responses: SurveyResponse[];
  responseRate: { pct: number; total: number } | null;
  onBack: () => void;
  onExportCsv: () => void;
}

function RenderBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="mb-3">
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
}

function RenderStars({ avg }: { avg: number }) {
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
}

export default function SurveyResult({ survey, responses: surveyResponses, responseRate: rate, onBack, onExportCsv }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={B2}>&larr; 목록</button>
          <h2 className="text-sm font-bold text-slate-700">설문 결과</h2>
          <span className="text-xs text-slate-400">{surveyResponses.length}명 참여</span>
        </div>
        <button onClick={onExportCsv} className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-xs hover:bg-emerald-100 transition-all">
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
        <h3 className="text-lg font-bold text-slate-800 mb-1">{survey.title}</h3>
        {survey.description && <p className="text-sm text-slate-500 mb-5">{survey.description}</p>}
        <div className="space-y-6">
          {survey.questions.map((q, qi) => (
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
                    return <RenderBar key={opt} label={opt} count={count} total={surveyResponses.length} />;
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
                        <RenderStars avg={avg} />
                        <span className="text-xs text-slate-400">/ 5.0 ({scores.length}명)</span>
                      </div>
                    </div>
                    {[5, 4, 3, 2, 1].map(n => {
                      const count = scores.filter(s => s === n).length;
                      return <RenderBar key={n} label={`${n}점`} count={count} total={scores.length} />;
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
