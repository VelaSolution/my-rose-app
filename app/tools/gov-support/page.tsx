"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import { useSimulatorData } from "@/lib/useSimulatorData";
import CloudSyncBadge from "@/components/CloudSyncBadge";

type Stage = "예비창업" | "1년미만" | "1~3년" | "3년이상";
type Revenue = "없음" | "1억미만" | "1~3억" | "3~5억" | "5억이상";
type ProgramType = "대출" | "보조금" | "보증" | "컨설팅";

interface Profile {
  stage: Stage;
  industry: string;
  region: string;
  revenue: Revenue;
  youth: boolean;
  female: boolean;
  disabled: boolean;
  social: boolean;
  lowCredit: boolean;
}

interface Program {
  name: string;
  org: string;
  maxAmount: string;
  rate?: string;
  type: ProgramType;
  stages: Stage[];
  regions: string[];
  conditions: string[];
  desc: string;
  applyMonths: number[];
}

const REGIONS = ["전국", "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const TYPE_COLOR: Record<ProgramType, { bg: string; text: string }> = {
  "대출": { bg: "bg-blue-50", text: "text-blue-600" },
  "보조금": { bg: "bg-emerald-50", text: "text-emerald-600" },
  "보증": { bg: "bg-purple-50", text: "text-purple-600" },
  "컨설팅": { bg: "bg-amber-50", text: "text-amber-600" },
};
const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

const PROGRAMS: Program[] = [
  { name: "소상공인 정책자금 (일반경영안정)", org: "소상공인시장진흥공단", maxAmount: "최대 1억원", rate: "연 2~3.5%", type: "대출", stages: ["1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "소상공인 경영 안정을 위한 저금리 정책 대출. 업력 제한 없이 소상공인이면 신청 가능.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "소상공인 정책자금 (성장촉진)", org: "소상공인시장진흥공단", maxAmount: "최대 1억원", rate: "연 2~3%", type: "대출", stages: ["1년미만", "1~3년"], regions: ["전국"], conditions: [], desc: "혁신형 소상공인 및 성장 가능성이 높은 사업체 대상 우대 금리 대출.", applyMonths: [1, 2, 3, 4, 5] },
  { name: "소상공인 특별경영안정자금", org: "소상공인시장진흥공단", maxAmount: "최대 7천만원", rate: "연 2%", type: "대출", stages: ["1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "재해, 경기 침체 등 특수 상황 시 긴급 지원되는 저금리 자금.", applyMonths: [3, 4, 5, 6] },
  { name: "예비창업패키지", org: "중소벤처기업부", maxAmount: "최대 1억원", type: "보조금", stages: ["예비창업"], regions: ["전국"], conditions: [], desc: "예비창업자 대상 사업화 자금 + 교육 + 멘토링 패키지. 경쟁률 높음.", applyMonths: [2, 3] },
  { name: "초기창업패키지", org: "중소벤처기업부", maxAmount: "최대 1억원", type: "보조금", stages: ["1년미만", "1~3년"], regions: ["전국"], conditions: [], desc: "창업 3년 이내 기업 대상. 사업화 자금 + 전담 멘토 배정.", applyMonths: [1, 2, 3] },
  { name: "청년창업사관학교", org: "중소벤처기업부", maxAmount: "최대 1억원", type: "보조금", stages: ["예비창업", "1년미만"], regions: ["전국"], conditions: ["youth"], desc: "만 39세 이하 예비/초기 창업자. 입주 공간 + 자금 + 교육 통합 지원.", applyMonths: [1, 2] },
  { name: "여성기업 종합지원", org: "여성기업종합지원센터", maxAmount: "최대 3억원", rate: "연 2.5%", type: "대출", stages: ["예비창업", "1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: ["female"], desc: "여성 CEO 기업 대상 우대 금리 대출 및 경영 컨설팅.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "신사업창업사관학교 (중장년)", org: "중소벤처기업부", maxAmount: "최대 5천만원", type: "보조금", stages: ["예비창업"], regions: ["전국"], conditions: [], desc: "40세 이상 중장년 예비창업자 대상 특화 프로그램.", applyMonths: [2, 3, 4] },
  { name: "지역신용보증재단 창업보증", org: "지역신용보증재단", maxAmount: "최대 2억원", type: "보증", stages: ["예비창업", "1년미만", "1~3년"], regions: ["전국"], conditions: [], desc: "은행 대출 시 담보 부족분을 보증서로 대체. 지역별 운영.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "서울신용보증재단 소상공인보증", org: "서울신용보증재단", maxAmount: "최대 1억원", type: "보증", stages: ["예비창업", "1년미만", "1~3년", "3년이상"], regions: ["서울"], conditions: [], desc: "서울 소재 소상공인 전용 보증 프로그램. 0.5~1% 보증료.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "경기신용보증재단 창업보증", org: "경기신용보증재단", maxAmount: "최대 2억원", type: "보증", stages: ["예비창업", "1년미만", "1~3년"], regions: ["경기"], conditions: [], desc: "경기도 소재 창업자/소상공인 전용 보증.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "소상공인 디지털전환 지원", org: "소상공인시장진흥공단", maxAmount: "최대 400만원", type: "보조금", stages: ["1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "키오스크, POS, 배달앱 도입 등 디지털 전환 비용 보조.", applyMonths: [3, 4, 5, 6] },
  { name: "배달특급 입점 지원", org: "경기도", maxAmount: "수수료 0%", type: "보조금", stages: ["1년미만", "1~3년", "3년이상"], regions: ["경기"], conditions: [], desc: "경기도 공공배달앱 '배달특급' 입점 및 수수료 면제.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "고용촉진장려금", org: "고용노동부", maxAmount: "월 60만원/인 (1년)", type: "보조금", stages: ["1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "취업 취약계층 고용 시 인건비 보조. 직원 채용 후 신청.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "두루누리 사회보험료 지원", org: "국민연금공단", maxAmount: "4대보험료 80% 지원", type: "보조금", stages: ["1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "10인 미만 사업장, 월 보수 260만원 미만 근로자 대상.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "일자리안정자금", org: "고용노동부", maxAmount: "월 최대 11만원/인", type: "보조금", stages: ["1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "최저임금 준수 30인 미만 사업장의 인건비 부담 완화.", applyMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "소상공인 경영컨설팅 (무료)", org: "소상공인시장진흥공단", maxAmount: "무료", type: "컨설팅", stages: ["예비창업", "1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "세무, 마케팅, 경영 전략 전문가 무료 컨설팅 연 2회.", applyMonths: [3, 4, 5, 6, 7, 8, 9, 10] },
  { name: "HACCP 인증 지원", org: "식품의약품안전처", maxAmount: "최대 3천만원", type: "보조금", stages: ["1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "식품안전관리인증(HACCP) 시설 개선 및 인증 비용 보조.", applyMonths: [2, 3, 4] },
  { name: "소상공인 스마트상점 기술보급", org: "소상공인시장진흥공단", maxAmount: "최대 800만원", type: "보조금", stages: ["1년미만", "1~3년", "3년이상"], regions: ["전국"], conditions: [], desc: "스마트 기기(AI 주문, IoT 등) 도입 비용 보조.", applyMonths: [4, 5, 6] },
  { name: "장애인기업 종합지원", org: "한국장애인기업협회", maxAmount: "최대 5천만원", type: "보조금", stages: ["예비창업", "1년미만", "1~3년"], regions: ["전국"], conditions: ["disabled"], desc: "장애인 사업주 대상 창업 자금 및 경영 지원.", applyMonths: [3, 4, 5] },
];

const KEY = "vela-gov-support-profile";

const defaultProfile: Profile = {
  stage: "예비창업", industry: "restaurant", region: "전국", revenue: "없음",
  youth: false, female: false, disabled: false, social: false, lowCredit: false,
};

export default function GovSupportPage() {
  const { data: profile, update: setProfileCloud, status, userId } = useCloudSync<Profile>(KEY, defaultProfile);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"result" | "calendar">("result");
  const simData = useSimulatorData();

  const up = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfileCloud({ ...profile, [k]: v });

  const applySimData = () => {
    if (!simData) return;
    const rev = simData.totalSales * 12;
    const revBucket = rev === 0 ? "없음" as const : rev < 10000_0000 ? "1억미만" as const : rev < 30000_0000 ? "1~3억" as const : rev < 50000_0000 ? "3~5억" as const : "5억이상" as const;
    setProfileCloud({ ...profile, industry: simData.industry, revenue: revBucket });
  };

  const matched = useMemo(() => {
    return PROGRAMS.map(prog => {
      let score = 0; let max = 0;
      // stage
      max += 3;
      if (prog.stages.includes(profile.stage)) score += 3;
      // region
      max += 2;
      if (prog.regions.includes("전국") || prog.regions.includes(profile.region)) score += 2;
      // conditions
      const conds = prog.conditions;
      if (conds.length === 0) { max += 1; score += 1; }
      else {
        max += conds.length * 2;
        conds.forEach(c => {
          if (c === "youth" && profile.youth) score += 2;
          if (c === "female" && profile.female) score += 2;
          if (c === "disabled" && profile.disabled) score += 2;
        });
      }
      const pct = Math.round(score / max * 100);
      return { ...prog, matchPct: pct };
    }).filter(p => p.matchPct >= 50).sort((a, b) => b.matchPct - a.matchPct);
  }, [profile]);

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white outline-none transition";
  const cardCls = "bg-white ring-1 ring-slate-200 rounded-3xl p-6 mb-4";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

  const currentMonth = new Date().getMonth(); // 0-indexed

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-3xl">
          <Link href="/tools" className="text-xs text-slate-400 hover:text-slate-600 transition">← 도구 목록</Link>
          <div className="mt-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>🏛️</span> 정부 지원사업
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">정부 지원사업 매칭</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm">내 조건에 맞는 정부 지원 프로그램을 찾아드립니다.</p>
              <CloudSyncBadge status={status} userId={userId} />
            </div>
            {simData && (
              <button onClick={applySimData} className="mt-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                🔗 시뮬레이터 데이터 불러오기
              </button>
            )}
          </div>

          {/* 조건 입력 */}
          <div className={cardCls}>
            <h3 className="font-bold text-slate-900 text-sm mb-4">🔍 내 조건 입력</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>사업 단계</label>
                <select className={inputCls} value={profile.stage} onChange={e => up("stage", e.target.value as Stage)}>
                  <option value="예비창업">예비창업자</option>
                  <option value="1년미만">1년 미만</option>
                  <option value="1~3년">1~3년</option>
                  <option value="3년이상">3년 이상</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>지역</label>
                <select className={inputCls} value={profile.region} onChange={e => up("region", e.target.value)}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>연 매출</label>
                <select className={inputCls} value={profile.revenue} onChange={e => up("revenue", e.target.value as Revenue)}>
                  <option value="없음">없음 (예비창업)</option>
                  <option value="1억미만">1억 미만</option>
                  <option value="1~3억">1~3억</option>
                  <option value="3~5억">3~5억</option>
                  <option value="5억이상">5억 이상</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>업종</label>
                <select className={inputCls} value={profile.industry} onChange={e => up("industry", e.target.value)}>
                  <option value="cafe">카페</option>
                  <option value="restaurant">음식점</option>
                  <option value="bar">술집·바</option>
                  <option value="finedining">파인다이닝</option>
                  <option value="gogi">고깃집</option>
                  <option value="etc">기타</option>
                </select>
              </div>
            </div>
            <label className={labelCls}>추가 조건</label>
            <div className="flex flex-wrap gap-2">
              {([["youth", "청년 (만 39세 이하)"], ["female", "여성"], ["disabled", "장애인"], ["social", "사회적경제기업"], ["lowCredit", "저신용자"]] as const).map(([k, label]) => (
                <label key={k} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${profile[k] ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  <input type="checkbox" className="sr-only" checked={profile[k]} onChange={e => up(k, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab("result")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${tab === "result" ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-200 text-slate-500"}`}>
              📋 매칭 결과 ({matched.length})
            </button>
            <button onClick={() => setTab("calendar")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${tab === "calendar" ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-200 text-slate-500"}`}>
              📅 신청 캘린더
            </button>
          </div>

          {/* 매칭 결과 */}
          {tab === "result" && (
            <div className="space-y-3">
              {matched.length === 0 && (
                <div className={cardCls}>
                  <p className="text-sm text-slate-400 text-center py-8">조건에 맞는 지원사업이 없습니다. 조건을 조정해보세요.</p>
                </div>
              )}
              {matched.map(prog => (
                <div key={prog.name} className={cardCls}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TYPE_COLOR[prog.type].bg} ${TYPE_COLOR[prog.type].text}`}>{prog.type}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${prog.matchPct >= 80 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                          매칭 {prog.matchPct}%
                        </span>
                        {prog.applyMonths.includes(currentMonth + 1) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-500">신청가능</span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{prog.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{prog.org}</p>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-slate-600">💰 {prog.maxAmount}</span>
                        {prog.rate && <span className="text-slate-600">📊 {prog.rate}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setExpanded(expanded === prog.name ? null : prog.name)}
                    className="text-xs text-blue-600 font-semibold mt-2">{expanded === prog.name ? "접기 ▲" : "자세히 보기 ▼"}</button>
                  {expanded === prog.name && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2">
                      <p>{prog.desc}</p>
                      <p><b>신청 시기:</b> {prog.applyMonths.map(m => `${m}월`).join(", ")}</p>
                      <p><b>대상 지역:</b> {prog.regions.join(", ")}</p>
                      <p><b>대상 단계:</b> {prog.stages.join(", ")}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 신청 캘린더 */}
          {tab === "calendar" && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MONTH_NAMES.map((name, i) => {
                const monthPrograms = matched.filter(p => p.applyMonths.includes(i + 1));
                const isCurrent = i === currentMonth;
                return (
                  <div key={name} className={`rounded-2xl p-3 text-center ${isCurrent ? "bg-slate-900 text-white ring-2 ring-blue-400" : "bg-white ring-1 ring-slate-200"}`}>
                    <p className={`text-xs font-bold mb-1 ${isCurrent ? "text-blue-300" : "text-slate-500"}`}>{name}</p>
                    <p className={`text-lg font-extrabold ${isCurrent ? "text-white" : "text-slate-900"}`}>{monthPrograms.length}</p>
                    <p className={`text-[10px] ${isCurrent ? "text-slate-300" : "text-slate-400"}`}>건 신청가능</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
