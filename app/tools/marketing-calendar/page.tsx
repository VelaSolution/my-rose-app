"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";

const CALENDAR = [
  { month: 1, title: "신년 시즌", events: ["신년 이벤트 (1/1~1/3)", "신정 연휴 프로모션"], tips: ["연초 메뉴 리뉴얼 발표", "신년 한정 메뉴 출시", "직장인 연초 모임 단체 예약 유도"], color: "#3182F6" },
  { month: 2, title: "발렌타인·비수기", events: ["발렌타인데이 (2/14)", "설날 연휴"], tips: ["커플 세트 메뉴 2주 전 SNS 노출", "설날 영업 공지 미리 게시", "비수기 할인 쿠폰으로 단골 유지"], color: "#EC4899" },
  { month: 3, title: "봄 시즌 시작", events: ["화이트데이 (3/14)", "신학기 시작"], tips: ["봄 시즌 메뉴 출시 (제철: 냉이, 달래)", "학교/학원가 전단지 배포", "네이버 플레이스 봄 사진 교체"], color: "#10B981" },
  { month: 4, title: "꽃놀이 성수기", events: ["벚꽃 시즌", "식목일 (4/5)"], tips: ["테이크아웃/도시락 메뉴 추가", "야외 좌석 정비 → SNS 포토스팟", "4월은 외식 지출 연중 최고 — 신메뉴 골든타임"], color: "#F59E0B" },
  { month: 5, title: "가정의 달", events: ["어린이날 (5/5)", "어버이날 (5/8)", "스승의날 (5/15)"], tips: ["가족 단체 코스 2주 전부터 예약", "선물세트/상품권 판매", "어버이날 감사 이벤트 SNS 콘텐츠"], color: "#EF4444" },
  { month: 6, title: "여름 대비", events: ["장마 시작", "현충일 (6/6)"], tips: ["배달 메뉴 강화 (비 오는 날 배달 1.5배)", "여름 한정 메뉴 출시 (냉면, 빙수)", "에어컨 점검 + 전기료 대비"], color: "#6366F1" },
  { month: 7, title: "여름 성수기", events: ["초복/중복", "여름 휴가 시즌 시작"], tips: ["파트타이머 채용 (8월 대비)", "냉장 관리 강화 (식품안전)", "SNS에 시원한 메뉴 사진 집중"], color: "#0EA5E9" },
  { month: 8, title: "휴가 시즌", events: ["말복", "광복절 (8/15)"], tips: ["사장님 휴가 계획 (매출 가장 낮은 주)", "가을 메뉴 9월 출시 목표로 준비", "여름 한정 메뉴 재고 정리"], color: "#F97316" },
  { month: 9, title: "가을 시즌", events: ["추석 연휴", "가을 시즌 시작"], tips: ["추석 선물세트/명절 메뉴 판매", "가을 제철 재료 메뉴 (버섯, 고구마, 밤)", "추석 연휴 영업 계획 공지"], color: "#D97706" },
  { month: 10, title: "4분기 전략", events: ["한글날 (10/9)", "할로윈 (10/31)"], tips: ["할로윈 이벤트 (카페/바 업종 객단가 +30%)", "연간 식재료비 재협상 시기", "연말 목표 달성 전략 수립"], color: "#8B5CF6" },
  { month: 11, title: "연말 준비", events: ["빼빼로데이 (11/11)", "수능 (11/중순)"], tips: ["12월 송년회 예약 11월부터 시작", "겨울 메뉴 출시 (국물, 따뜻한 음료)", "연말정산 대비 경비 정리"], color: "#059669" },
  { month: 12, title: "연말 특수", events: ["크리스마스 (12/25)", "송년회 시즌"], tips: ["단체 예약 노쇼 방지 (예약금 제도)", "현금 확보 (매출 20% 유보 → 1월 대비)", "올해 매출 정산 + 내년 목표 설정"], color: "#DC2626" },
];

type CalendarCloudData = { notes: Record<number, string> };
const CALENDAR_DEFAULT: CalendarCloudData = { notes: {} };

export default function MarketingCalendarPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const [notes, setNotes] = useState<Record<number, string>>({});
  const { data: cloudData, update: cloudUpdate, status: syncStatus, userId: syncUserId } = useCloudSync<CalendarCloudData>("vela-marketing-calendar", CALENDAR_DEFAULT);

  // Load from cloud on mount
  useEffect(() => {
    if (cloudData.notes) setNotes(cloudData.notes);
  }, [cloudData]);

  const updateNote = (month: number, value: string) => {
    const next = { ...notes, [month]: value };
    setNotes(next);
    cloudUpdate({ notes: next });
  };

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>📅</span> 마케팅 캘린더
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">시즌 마케팅 캘린더</h1>
              <CloudSyncBadge status={syncStatus} userId={syncUserId} />
            </div>
            <p className="text-slate-500 text-sm">매월 놓치면 안 되는 이벤트와 마케팅 전략을 확인하세요.</p>
          </div>

          <div className="space-y-4">
            {CALENDAR.map(m => {
              const isCurrent = m.month === currentMonth;
              const isUpcoming = m.month === (currentMonth % 12) + 1;
              return (
                <div key={m.month}
                  className={`rounded-3xl bg-white p-6 ring-1 transition ${isCurrent ? "ring-2 ring-blue-500 shadow-lg" : "ring-slate-200"}`}
                  style={isCurrent ? { borderLeft: `4px solid ${m.color}` } : {}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black" style={{ color: m.color }}>{m.month}월</span>
                      <span className="font-bold text-slate-900">{m.title}</span>
                      {isCurrent && <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">이번 달</span>}
                      {isUpcoming && <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">다음 달</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {m.events.map(e => (
                      <span key={e} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{e}</span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {m.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs mt-0.5" style={{ color: m.color }}>●</span>
                        <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="메모를 입력하세요..."
                      value={notes[m.month] ?? ""}
                      onChange={(e) => updateNote(m.month, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition placeholder:text-slate-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-center">
            <p className="text-white font-bold mb-2">마케팅 콘텐츠가 필요하세요?</p>
            <p className="text-slate-400 text-sm mb-4">AI가 SNS 게시글, 리뷰 답변, 프로모션 문구를 자동 생성합니다.</p>
            <Link href="/tools/sns-content" className="inline-block rounded-xl bg-blue-600 text-white text-sm font-bold px-5 py-2.5 hover:bg-blue-700 transition">SNS 콘텐츠 생성기 →</Link>
          </div>
        </div>
      </main>
    </>
  );
}
