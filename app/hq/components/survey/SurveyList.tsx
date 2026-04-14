"use client";
import { SurveyItem, SurveyResponse } from "@/app/hq/types";
import { today, C, B, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

const STATUS_STYLE: Record<string, string> = {
  "진행중": "bg-blue-50 text-blue-700",
  "마감": "bg-slate-100 text-slate-500",
  "예정": "bg-amber-50 text-amber-700",
};

interface Props {
  surveys: SurveyItem[];
  responses: SurveyResponse[];
  userName: string;
  responseRate: (count: number) => { pct: number; total: number } | null;
  onOpenCreate: () => void;
  onOpenAnswer: (id: string) => void;
  onOpenResult: (id: string) => void;
}

export default function SurveyList({
  surveys, responses, userName, responseRate,
  onOpenCreate, onOpenAnswer, onOpenResult,
}: Props) {
  const { displayName } = useTeamDisplayNames();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700">설문 / 투표</h2>
        <button onClick={onOpenCreate} className={B}>+ 설문 만들기</button>
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
                    <button onClick={() => onOpenResult(s.id)} className={"rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold px-3 py-1.5 text-xs hover:bg-slate-50 active:scale-[0.97] transition-all !text-xs !px-3 !py-1.5"}>결과</button>
                    {!isClosed && !hasAnswered && (
                      <button onClick={() => onOpenAnswer(s.id)} className="text-xs px-3 py-1.5 rounded-lg bg-[#3182F6] text-white font-semibold hover:bg-[#2672DE] transition-all">
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
