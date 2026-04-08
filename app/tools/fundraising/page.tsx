"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";
import SimDataPicker from "@/components/SimDataPicker";
import type { SimulatorSnapshot } from "@/lib/useSimulatorData";

const TABS = ["밸류에이션", "IR 덱 가이드", "투자 유형", "미팅 체크리스트"] as const;
type Tab = (typeof TABS)[number];
const KEY = "vela-fundraising";
const fmt = (n: number) => n.toLocaleString("ko-KR");

const IR_SLIDES = [
  { id: "cover", title: "표지", guide: "회사명, 로고, 한 줄 소개 (10자 이내). 깔끔하고 인상적인 첫 페이지.", example: "\"로즈 카페 — MZ세대를 위한 디저트 공간\"" },
  { id: "problem", title: "문제 정의 (Problem)", guide: "고객이 겪는 구체적인 불편함/문제. 데이터나 사례로 뒷받침하면 효과적.", example: "\"강남 직장인 72%가 점심 후 카페를 찾지만, 대기시간 평균 15분\"" },
  { id: "solution", title: "해결 방안 (Solution)", guide: "우리 서비스/제품이 어떻게 문제를 해결하는지. 스크린샷이나 사진 포함.", example: "\"사전주문 + AI 좌석 배정으로 대기시간 0분\"" },
  { id: "market", title: "시장 규모 (TAM/SAM/SOM)", guide: "TAM(전체 시장) → SAM(유효 시장) → SOM(초기 목표 시장). 출처 명시 필수.", example: "TAM 50조 → SAM 5조 → SOM 500억 (카페 디저트 시장)" },
  { id: "bm", title: "비즈니스 모델", guide: "어디서 돈을 버는지 명확히. 매출 구조, 객단가, 반복매출 여부.", example: "음료 마진 70% + 디저트 구독 월 29,000원" },
  { id: "traction", title: "트랙션/성과 지표", guide: "매출, 고객수, 성장률, 재방문율 등 핵심 KPI. 그래프로 우상향 트렌드 강조.", example: "월매출 3,200만원 (MoM +15%), 재방문율 45%" },
  { id: "competition", title: "경쟁 분석", guide: "경쟁사 대비 포지셔닝. 2x2 매트릭스나 비교표 활용. 차별점 강조.", example: "가격×품질 매트릭스에서 '합리적 프리미엄' 포지션" },
  { id: "team", title: "팀 소개", guide: "핵심 멤버의 관련 경력과 역할. 이 팀이 왜 이 문제를 풀 수 있는지.", example: "CTO: 전 배민 개발팀장 / CEO: 외식업 10년 운영" },
  { id: "finance", title: "재무 계획", guide: "향후 3년 매출/비용 예측. 보수적 + 기본 시나리오. BEP 시점 명시.", example: "2년차 BEP 달성, 3년차 연매출 10억 목표" },
  { id: "use-of-funds", title: "자금 사용 계획", guide: "투자금을 어디에 쓸 것인지 비율로 명시. 인건비, 마케팅, R&D, 운영 등.", example: "인건비 40% / 마케팅 30% / 매장 확장 20% / 운영 10%" },
  { id: "milestone", title: "마일스톤", guide: "투자 후 6개월/12개월/18개월 달성 목표. 구체적이고 측정 가능해야.", example: "6개월: 2호점 오픈 / 12개월: 월매출 1억 / 18개월: 프랜차이즈 론칭" },
  { id: "ask", title: "Ask (투자 요청)", guide: "요청 금액, 지분율 또는 밸류에이션, 투자 조건. 명확하고 자신감 있게.", example: "Pre-money 10억, 시리즈 시드 2억 투자 유치 (지분 16.7%)" },
];

const INVEST_TYPES = [
  { id: "angel", title: "엔젤 투자", emoji: "😇", amount: "1천~5천만원", equity: "5~15%", stage: "아이디어~초기", duration: "1~3개월",
    pros: ["빠른 의사결정", "경영 조언 제공", "네트워크 연결"], cons: ["투자 금액 한정", "개인 성향에 따라 다름"],
    howTo: "엔젤투자 매칭 플랫폼(비긴메이트, 와디즈), 창업 네트워킹 행사, 지인 소개" },
  { id: "seed", title: "시드 투자 (VC/액셀러레이터)", emoji: "🌱", amount: "3천만~3억원", equity: "10~25%", stage: "초기(MVP~초기매출)", duration: "3~6개월",
    pros: ["전문 멘토링", "후속 투자 연결", "브랜드 신뢰도 상승"], cons: ["지분 희석", "투자 심사 까다로움"],
    howTo: "데모데이 참가, IR 피칭, VC 콜드메일, 액셀러레이터 프로그램 지원" },
  { id: "gov", title: "정부 지원금", emoji: "🏛️", amount: "1천만~1억원", equity: "0% (비지분)", stage: "예비~초기", duration: "2~4개월",
    pros: ["지분 희석 없음", "정부 인증 효과", "교육/멘토링 병행"], cons: ["서류 작업 많음", "사용처 제한", "경쟁률 높음"],
    howTo: "K-Startup, 소상공인시장진흥공단 사이트에서 공고 확인" },
  { id: "crowd", title: "크라우드펀딩", emoji: "👥", amount: "500만~5천만원", equity: "리워드형 0% / 증권형 5~15%", stage: "제품 출시 전후", duration: "1~2개월",
    pros: ["시장 검증 동시 진행", "초기 고객 확보", "홍보 효과"], cons: ["목표 미달 시 전액 반환", "수수료 10~15%"],
    howTo: "와디즈, 텀블벅에서 프로젝트 등록. 매력적인 리워드 설계 필수." },
  { id: "loan", title: "은행 대출", emoji: "🏦", amount: "1천만~5억원", equity: "0%", stage: "매출 발생 후", duration: "2~4주",
    pros: ["지분 희석 없음", "안정적 자금"], cons: ["이자 부담", "담보/보증 필요", "상환 의무"],
    howTo: "주거래 은행, 소상공인 정책자금, 신용보증재단 보증서 활용" },
  { id: "franchise", title: "프랜차이즈 투자", emoji: "🏪", amount: "1억~10억원", equity: "사업 구조에 따라 다름", stage: "검증된 모델", duration: "3~12개월",
    pros: ["대규모 자금", "빠른 확장"], cons: ["운영 자율성 제한", "로열티 부담"],
    howTo: "프랜차이즈 박람회, 가맹본부 직접 제안" },
];

const MEETING_BEFORE = [
  "투자자 프로필 & 포트폴리오 사전 조사",
  "IR 덱 최종 검토 (오탈자, 숫자 정확성)",
  "핵심 피칭 3분 버전 리허설 3회 이상",
  "예상 질문 20개 & 답변 준비",
  "데모/시제품 동작 확인",
  "재무 데이터 최신화 (이번 달 수치까지)",
  "팀원 역할 분담 (누가 어떤 질문 답변)",
  "명함, 사업자등록증 사본, 정관 준비",
];
const MEETING_DURING = [
  "첫 3분에 핵심 가치 전달 (엘리베이터 피치)",
  "숫자 기반으로 설명 (\"많이\"가 아닌 \"45% 증가\")",
  "질문에 모르면 솔직히 인정 → 후속 답변 약속",
  "투자자의 피드백을 경청하고 메모",
  "다음 단계(후속 미팅/자료 전달) 합의",
];
const MEETING_AFTER = [
  "24시간 내 감사 이메일 발송",
  "요청 자료 3일 내 전달",
  "미팅 내용 정리 → 팀 공유",
  "투자자 피드백 반영 → IR 덱 업데이트",
  "2주 후 진행상황 업데이트 메일",
];
const TOP_QUESTIONS = [
  { q: "왜 이 사업을 하시나요?", a: "개인적 경험/전문성에서 출발한 진정성 있는 동기를 설명" },
  { q: "시장 규모가 얼마나 되나요?", a: "TAM→SAM→SOM 순서로, 출처와 함께 설명" },
  { q: "경쟁사 대비 차별점은?", a: "고객 관점에서 '왜 우리를 선택하는지' 데이터로 설명" },
  { q: "수익 모델은?", a: "매출 구조, 단가, 마진율을 구체적으로" },
  { q: "현재 트랙션은?", a: "매출, 고객수, 성장률 등 핵심 KPI 수치" },
  { q: "투자금을 어디에 쓸 건가요?", a: "인건비/마케팅/R&D 등 비율로 명확히" },
  { q: "팀 구성은?", a: "각 멤버의 핵심 역량과 이 팀이 적합한 이유" },
  { q: "리스크는 뭔가요?", a: "솔직히 인정하되, 대응 방안까지 함께 설명" },
  { q: "Exit 전략은?", a: "M&A, IPO, 프랜차이즈 확장 등 구체적 시나리오" },
  { q: "다른 투자자 미팅도 진행 중인가요?", a: "긍정적 시그널이 있으면 공유, 없어도 솔직히" },
];

export default function FundraisingPage() {
  const [tab, setTab] = useState<Tab>("밸류에이션");
  const [annualRev, setAnnualRev] = useState(0);
  const [annualProfit, setAnnualProfit] = useState(0);
  const [industry, setIndustry] = useState("cafe");
  const [tangibleAssets, setTangibleAssets] = useState(0);
  const [investAmount, setInvestAmount] = useState(0);
  const { data: frData, update: setFrData, status, userId } = useCloudSync<{ irChecks: Record<string, boolean>; mtChecks: Record<string, boolean> }>(KEY, { irChecks: {}, mtChecks: {} });
  const irChecks = frData.irChecks;
  const mtChecks = frData.mtChecks;
  const setIrChecks = (fn: (p: Record<string, boolean>) => Record<string, boolean>) => setFrData({ ...frData, irChecks: typeof fn === "function" ? fn(frData.irChecks) : fn });
  const setMtChecks = (fn: (p: Record<string, boolean>) => Record<string, boolean>) => setFrData({ ...frData, mtChecks: typeof fn === "function" ? fn(frData.mtChecks) : fn });
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const simFields = (sim: SimulatorSnapshot) => [
    { key: "annualRev", label: "연 매출", value: `${Math.round(sim.totalSales * 12 / 10000).toLocaleString()}만원`, rawValue: Math.round(sim.totalSales * 12 / 10000) },
    { key: "annualProfit", label: "연 순이익", value: `${Math.round(sim.profit * 12 / 10000).toLocaleString()}만원`, rawValue: Math.round(sim.profit * 12 / 10000) },
    { key: "industry", label: "업종", value: sim.industry, rawValue: sim.industry },
  ];
  const applySimSelected = (selected: Record<string, number | string>) => {
    if (selected.annualRev !== undefined) setAnnualRev(selected.annualRev as number);
    if (selected.annualProfit !== undefined) setAnnualProfit(selected.annualProfit as number);
    if (selected.industry !== undefined) setIndustry(selected.industry as string);
  };

  const multiples: Record<string, [number, number]> = { cafe: [1.5, 3], restaurant: [2, 4], bar: [1.5, 3], finedining: [2.5, 5], gogi: [2, 4] };
  const [mLow, mHigh] = multiples[industry] ?? [2, 4];

  const valuation = useMemo(() => {
    const revLow = annualRev * mLow;
    const revHigh = annualRev * mHigh;
    const profitLow = annualProfit * 5;
    const profitHigh = annualProfit * 10;
    const assetVal = tangibleAssets;
    const low = Math.max(revLow, profitLow, assetVal);
    const high = Math.max(revHigh, profitHigh, assetVal);
    const equityPct = investAmount > 0 && high > 0 ? Math.round(investAmount / ((low + high) / 2) * 100) : 0;
    return { revLow, revHigh, profitLow, profitHigh, assetVal, low, high, equityPct };
  }, [annualRev, annualProfit, tangibleAssets, investAmount, mLow, mHigh]);

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white outline-none transition";
  const cardCls = "bg-white ring-1 ring-slate-200 rounded-3xl p-6 mb-4";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <Link href="/tools" className="text-xs text-slate-400 hover:text-slate-600 transition">← 도구 목록</Link>
          <div className="mt-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>💎</span> 투자 유치 도구
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">투자 유치 도구</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm">밸류에이션, IR 덱, 투자자 미팅까지 한 번에 준비하세요.</p>
              <CloudSyncBadge status={status} userId={userId} />
            </div>
            <SimDataPicker fields={simFields} onApply={applySimSelected} />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* 밸류에이션 */}
          {tab === "밸류에이션" && (
            <>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-4">💰 밸류에이션 계산</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>연 매출 (만원)</label>
                    <input className={inputCls} inputMode="numeric" value={annualRev || ""} onChange={e => setAnnualRev(Number(e.target.value.replace(/[^0-9]/g, "")))} />
                  </div>
                  <div>
                    <label className={labelCls}>연 순이익 (만원)</label>
                    <input className={inputCls} inputMode="numeric" value={annualProfit || ""} onChange={e => setAnnualProfit(Number(e.target.value.replace(/[^0-9]/g, "")))} />
                  </div>
                  <div>
                    <label className={labelCls}>업종</label>
                    <select className={inputCls} value={industry} onChange={e => setIndustry(e.target.value)}>
                      <option value="cafe">카페</option><option value="restaurant">음식점</option><option value="bar">술집/바</option>
                      <option value="finedining">파인다이닝</option><option value="gogi">고깃집</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>유형자산 (만원)</label>
                    <input className={inputCls} inputMode="numeric" value={tangibleAssets || ""} onChange={e => setTangibleAssets(Number(e.target.value.replace(/[^0-9]/g, "")))} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>투자 요청금 (만원)</label>
                    <input className={inputCls} inputMode="numeric" value={investAmount || ""} onChange={e => setInvestAmount(Number(e.target.value.replace(/[^0-9]/g, "")))} />
                  </div>
                </div>
              </div>
              {(annualRev > 0 || annualProfit > 0) && (
                <div className={cardCls}>
                  <h3 className="font-bold text-slate-900 text-sm mb-3">📊 추정 밸류에이션</h3>
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-600">매출 멀티플 ({mLow}~{mHigh}x)</span>
                      <span className="font-bold">{fmt(valuation.revLow)} ~ {fmt(valuation.revHigh)}만원</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-600">순이익 멀티플 (5~10x)</span>
                      <span className="font-bold">{fmt(valuation.profitLow)} ~ {fmt(valuation.profitHigh)}만원</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-600">자산 기반</span>
                      <span className="font-bold">{fmt(valuation.assetVal)}만원</span>
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">종합 추정 밸류에이션</p>
                    <p className="text-xl font-extrabold text-amber-600">{fmt(valuation.low)} ~ {fmt(valuation.high)}만원</p>
                    {investAmount > 0 && (
                      <p className="text-xs text-slate-500 mt-2">투자 {fmt(investAmount)}만원 시 예상 지분율: <b className="text-amber-600">{valuation.equityPct}%</b></p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* IR 덱 가이드 */}
          {tab === "IR 덱 가이드" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-sm">📑 IR 덱 12 슬라이드</h3>
                <span className="text-xs text-slate-400">{Object.values(irChecks).filter(Boolean).length}/{IR_SLIDES.length}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Object.values(irChecks).filter(Boolean).length / IR_SLIDES.length * 100}%` }} />
              </div>
              <div className="space-y-2">
                {IR_SLIDES.map((slide, i) => (
                  <div key={slide.id} className={`rounded-xl p-3 transition ${irChecks[slide.id] ? "bg-amber-50" : "bg-slate-50"}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={!!irChecks[slide.id]}
                        onChange={e => setIrChecks(p => ({ ...p, [slide.id]: e.target.checked }))} className="mt-0.5 accent-amber-600" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-amber-600">#{i + 1}</span>
                        <span className={`text-sm font-bold ml-2 ${irChecks[slide.id] ? "text-slate-400 line-through" : "text-slate-900"}`}>{slide.title}</span>
                        <p className="text-xs text-slate-500 mt-1">{slide.guide}</p>
                        <p className="text-[11px] text-slate-400 mt-1 italic">예시: {slide.example}</p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 투자 유형 */}
          {tab === "투자 유형" && (
            <div className="space-y-3">
              {INVEST_TYPES.map(type => (
                <div key={type.id} className={cardCls}>
                  <button onClick={() => setExpandedType(expandedType === type.id ? null : type.id)} className="w-full text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{type.emoji}</span>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-sm">{type.title}</h4>
                        <div className="flex gap-3 mt-1 text-xs text-slate-500">
                          <span>💰 {type.amount}</span>
                          <span>📊 {type.equity}</span>
                        </div>
                      </div>
                      <span className="text-slate-400 text-xs">{expandedType === type.id ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {expandedType === type.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-slate-500">적합 단계:</span> <b>{type.stage}</b></div>
                        <div><span className="text-slate-500">소요 기간:</span> <b>{type.duration}</b></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1"><p className="font-bold text-emerald-600 mb-1">장점</p>{type.pros.map(p => <p key={p} className="text-slate-600">✅ {p}</p>)}</div>
                        <div className="flex-1"><p className="font-bold text-red-500 mb-1">단점</p>{type.cons.map(c => <p key={c} className="text-slate-600">⚠️ {c}</p>)}</div>
                      </div>
                      <p className="text-slate-600"><b>찾는 법:</b> {type.howTo}</p>
                      {type.id === "gov" && <Link href="/tools/gov-support" className="text-blue-600 font-semibold">→ 정부 지원사업 매칭 바로가기</Link>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 미팅 체크리스트 */}
          {tab === "미팅 체크리스트" && (
            <>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">📋 미팅 전 준비</h3>
                <div className="space-y-1">
                  {MEETING_BEFORE.map(item => (
                    <label key={item} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={!!mtChecks[item]} onChange={e => setMtChecks(p => ({ ...p, [item]: e.target.checked }))} className="accent-amber-600" />
                      <span className={`text-xs ${mtChecks[item] ? "text-slate-400 line-through" : "text-slate-700"}`}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">🤝 미팅 중 팁</h3>
                {MEETING_DURING.map((item, i) => (
                  <p key={i} className="text-xs text-slate-600 py-1.5 border-b border-slate-50 last:border-0">💡 {item}</p>
                ))}
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">📩 미팅 후 팔로업</h3>
                <div className="space-y-1">
                  {MEETING_AFTER.map(item => (
                    <label key={item} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={!!mtChecks[item]} onChange={e => setMtChecks(p => ({ ...p, [item]: e.target.checked }))} className="accent-amber-600" />
                      <span className={`text-xs ${mtChecks[item] ? "text-slate-400 line-through" : "text-slate-700"}`}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">❓ 자주 받는 질문 TOP 10</h3>
                {TOP_QUESTIONS.map((qa, i) => (
                  <div key={i} className="py-2 border-b border-slate-50 last:border-0">
                    <p className="text-xs font-bold text-slate-900">{i + 1}. {qa.q}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">💡 {qa.a}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
