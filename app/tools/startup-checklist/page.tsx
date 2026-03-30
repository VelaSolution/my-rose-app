"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ToolNav from "@/components/ToolNav";

type CheckItem = {
  id: string;
  label: string;
  desc?: string;
  required: boolean;
  done: boolean;
  link?: string;
  memo?: string;
};

type Phase = {
  id: string;
  title: string;
  emoji: string;
  timeline: string;
  items: Omit<CheckItem, "done">[];
};

// ─── 체크리스트 데이터 ─────────────────────────────────────────────────────────

type PhaseBase = Omit<Phase, "items"> & { items: Omit<CheckItem, "done">[] };

const PHASES_BASE: PhaseBase[] = [
  {
    id: "planning",
    title: "사업 기획",
    emoji: "💡",
    timeline: "D-180 ~ D-90",
    items: [
      { id: "concept", label: "사업 컨셉 및 타깃 고객 정의", desc: "업종·메뉴 방향성, 주요 고객층(연령·성별·직업) 명확히 정의. ex) 20~35세 직장인 대상 점심 특화 한식 뷔페", required: true },
      { id: "market", label: "상권 조사 및 입지 분석", desc: "유동 인구, 경쟁 업체, 임대료 비교 — 상권분석 도우미 활용 권장", required: true, link: "/tools/area-analysis" },
      { id: "competitor", label: "경쟁 업체 벤치마킹 (3곳 이상)", desc: "가격대·메뉴·서비스·인테리어 비교 분석. 차별화 포인트 도출", required: false },
      { id: "menu-plan", label: "메뉴 기획 및 레시피 개발", desc: "시그니처 메뉴 3~5개, 원가율 30~40% 이하 목표. 메뉴 원가 계산기 활용", required: true, link: "/tools/menu-cost" },
      { id: "revenue-sim", label: "수익 시뮬레이션 작성", desc: "VELA 시뮬레이터로 월 매출·순이익·BEP 사전 검증 필수", required: true, link: "/simulator" },
      { id: "budget", label: "초기 투자 비용 산정", desc: "보증금·권리금·인테리어·기기·운영예비자금 합산. 시뮬레이터 3단계에서 자동 계산", required: true },
      { id: "funding", label: "자금 조달 방법 결정 (자기자본/대출/투자)", desc: "소상공인 정책자금·중진공 창업자금·은행 담보대출 비교 검토", required: true },
    ],
  },
  {
    id: "legal",
    title: "법적 절차",
    emoji: "📋",
    timeline: "D-90 ~ D-60",
    items: [
      { id: "biz-reg", label: "사업자등록 (세무서 or 홈택스)", desc: "개인사업자: 간이과세/일반과세 선택 — 연 매출 8천만원 기준. 법인은 별도 등기 필요", required: true, link: "https://www.hometax.go.kr" },
      { id: "food-license", label: "식품위생법상 영업 허가/신고", desc: "일반음식점 영업신고 or 즉석판매제조가공업 — 관할 구청 위생과 방문", required: true },
      { id: "health-cert", label: "영업자 위생교육 이수", desc: "식품위생교육원 온라인 수강 가능 (6시간). 매년 갱신 필요", required: true },
      { id: "health-check", label: "건강진단 (보건증)", desc: "직원 포함 음식 취급자 전원 필수. 보건소·지정 의원 발급, 유효기간 1년", required: true },
      { id: "fire-safety", label: "소방시설 완비증명서 확인", desc: "소방서 발급. 100㎡ 이상 시 소방안전관리자 선임 필요", required: true },
      { id: "alcohol", label: "주류 판매 허가 (해당 시)", desc: "관할 세무서 신청 — 일반음식점 주류 판매는 별도 허가 불필요, 단 주점업은 필요", required: false },
      { id: "franchise", label: "프랜차이즈 계약 검토 (해당 시)", desc: "공정거래위원회 가맹사업정보 확인 권장. 계약 전 변호사 검토 추천", required: false },
      { id: "insurance", label: "사업장 화재보험 가입", desc: "임차인 배상책임보험 포함 권장. 월 3~5만원 수준", required: true },
    ],
  },
  {
    id: "location",
    title: "공간 준비",
    emoji: "🏠",
    timeline: "D-90 ~ D-45",
    items: [
      { id: "lease", label: "임대차 계약 체결", desc: "건물 용도(근린생활시설), 전대 동의, 원상복구 조항 필수 확인. 공인중개사 통해 등기부등본 열람", required: true },
      { id: "interior-design", label: "인테리어 설계 및 업체 선정", desc: "평당 단가 확인. 시공 기간(통상 4~8주) 고려해 일정 역산", required: true },
      { id: "interior-work", label: "인테리어 공사 진행", desc: "공사 중 진척률 주간 체크. 마감 품질·전기·배관 직접 확인 필수", required: true },
      { id: "signage", label: "간판 제작 및 설치", desc: "옥외광고물법 신고 필요 (관할 구청). 야간 LED 조명 고려", required: true },
      { id: "equipment", label: "주방 기기·집기 구매 및 설치", desc: "신품 vs 중고 비교. A/S 여부 확인. 가스·전기 용량 사전 체크", required: true },
      { id: "pos-system", label: "POS 시스템 도입", desc: "월 구독형 vs 단말기 구매 비교. 배달앱·키오스크 연동 여부 확인", required: true },
      { id: "wifi", label: "인터넷·CCTV 설치", desc: "사업장 전용 인터넷 개통(통상 2주 소요). CCTV 4채널 이상 권장", required: false },
    ],
  },
  {
    id: "hr",
    title: "인력·운영",
    emoji: "👥",
    timeline: "D-45 ~ D-14",
    items: [
      { id: "hire", label: "직원 채용 (알바천국, 사람인 등)", desc: "채용 2~4주 전 공고 필수. 주방·홀 인원 구분하여 채용. 4대보험 가입 의무", required: true },
      { id: "labor-contract", label: "근로계약서 작성", desc: "표준 근로계약서 사용 권장. 근로시간·임금·휴일 명시. 미작성 시 과태료 500만원", required: true },
      { id: "training", label: "직원 위생·서비스 교육", desc: "손 씻기·교차오염 방지 등 위생교육 의무. 서비스 롤플레이 실습 권장", required: true },
      { id: "supplier", label: "식자재 공급업체 계약", desc: "주거래 1~2곳 + 대체 업체 1곳 확보. 단가·배송 조건·결제 주기 확인", required: true },
      { id: "sop", label: "운영 매뉴얼 작성", desc: "개점·마감·위생 점검 루틴 문서화. 직원 이직 시 업무 공백 최소화", required: false },
      { id: "delivery-app", label: "배달앱 입점 신청 (배민/쿠팡이츠)", desc: "심사 기간 약 7~14일 소요. 수수료 구조(중개수수료 6.8%~) 사전 검토", required: false },
    ],
  },
  {
    id: "marketing",
    title: "마케팅·홍보",
    emoji: "📣",
    timeline: "D-30 ~ D-0",
    items: [
      { id: "sns-setup", label: "인스타그램·블로그 계정 개설", desc: "개점 한 달 전부터 사전 팔로워 확보. 해시태그 전략 수립. SNS 콘텐츠 생성기 활용", required: false, link: "/tools/sns-content" },
      { id: "naver-place", label: "네이버 플레이스 등록", desc: "사업자등록증 필요. 리뷰 관리·메뉴·영업시간 정확히 입력. 개점 2주 전 등록 권장", required: true },
      { id: "kakao-map", label: "카카오맵 등록", desc: "카카오 비즈니스 채널 연동 시 예약·쿠폰 기능 활용 가능", required: true },
      { id: "google-map", label: "구글맵 등록", desc: "외국인 방문객 많은 상권 필수. Google Business Profile 무료 등록", required: false },
      { id: "grand-open", label: "그랜드오픈 이벤트 기획", desc: "SNS 콘텐츠 생성기 활용 권장. 개점 기념 할인·무료 증정 이벤트로 초기 방문객 확보", required: false, link: "/tools/sns-content" },
      { id: "flyer", label: "전단지·쿠폰 제작 (주변 반경 배포)", desc: "반경 500m 이내 배포. QR코드 삽입으로 SNS 팔로워 유도", required: false },
      { id: "photo", label: "메뉴 사진 촬영 (전문 or DIY)", desc: "자연광 활용, 흰 배경 권장. 주요 메뉴 5~10개 이상 촬영. 스마트폰으로도 충분히 가능", required: true },
    ],
  },
  {
    id: "finance",
    title: "재무 준비",
    emoji: "💰",
    timeline: "D-30 ~ 개점 후",
    items: [
      { id: "bank-account", label: "사업용 은행 계좌 개설", required: true },
      { id: "card-terminal", label: "카드 단말기 임대 계약", required: true },
      { id: "cash-register", label: "현금영수증 가맹점 가입 (의무)", required: true, link: "https://www.hometax.go.kr" },
      { id: "accounting", label: "회계 소프트웨어 or 세무사 계약", required: true },
      { id: "emergency-fund", label: "운영 예비자금 3개월치 확보", desc: "개점 초기 매출 부진 대비", required: true },
      { id: "tax-plan", label: "세금 납부 계획 수립", desc: "세금 계산기로 미리 시뮬레이션", required: true, link: "/tools/tax" },
    ],
  },
];

function buildState(phases: PhaseBase[], industry: string) {
  // 업종별 특수 항목 추가
  const extras: Record<string, { phaseId: string; item: Omit<CheckItem, "done"> }[]> = {
    bar: [
      { phaseId: "legal", item: { id: "alcohol-bar", label: "일반음식점 주류 판매 신고 확인", desc: "유흥업과 혼동 주의", required: true } },
    ],
    cafe: [
      { phaseId: "legal", item: { id: "cafe-ice", label: "즉석판매제조가공업 신고 (디저트 직접 제조 시)", required: false } },
    ],
    finedining: [
      { phaseId: "legal", item: { id: "wine-import", label: "주류 수입 관련 면허 검토 (와인 셀러 운영 시)", required: false } },
      { phaseId: "hr", item: { id: "sommelier", label: "소믈리에·파티시에 등 전문 인력 채용", required: false } },
    ],
    gogi: [
      { phaseId: "legal", item: { id: "gogi-dual1", label: "이중사업자 구조 검토 (세무사 상담 필수)", desc: "1호 음식점업 + 2호 축산물판매업 구조", required: true } },
      { phaseId: "legal", item: { id: "gogi-livestock", label: "축산물판매업 영업허가 신청", desc: "관할 시·군·구청 위생과 또는 농식품부", required: true } },
      { phaseId: "legal", item: { id: "gogi-haccp", label: "HACCP 인증 검토 (냉장·냉동 보관 기준 준수)", required: false } },
      { phaseId: "legal", item: { id: "gogi-origin", label: "원산지 표시 의무 준비 (돼지·소 원산지 메뉴판 표기)", required: true } },
      { phaseId: "finance", item: { id: "gogi-biz2-account", label: "2호 사업자 별도 계좌·카드단말 개설", desc: "1호·2호 매출·매입 분리 필수", required: true } },
      { phaseId: "finance", item: { id: "gogi-taxadvisor", label: "이중사업자 전문 세무사 계약", desc: "부가세 매입세액 공제 최적화", required: true } },
      { phaseId: "hr", item: { id: "gogi-butcher", label: "정육 처리 인력 확보 또는 외주 계약", required: false } },
    ],
  };

  return phases.map((phase) => ({
    ...phase,
    items: [
      ...phase.items,
      ...(extras[industry] ?? []).filter(e => e.phaseId === phase.id).map(e => e.item),
    ].map(item => ({ ...item, done: false })),
  }));
}

const INDUSTRIES = [
  { id: "cafe", label: "카페", emoji: "☕" },
  { id: "restaurant", label: "음식점", emoji: "🍽️" },
  { id: "bar", label: "술집/바", emoji: "🍺" },
  { id: "finedining", label: "파인다이닝", emoji: "✨" },
  { id: "gogi", label: "고깃집", emoji: "🥩" },
];

export default function StartupChecklistPage() {
  const [industry, setIndustry] = useState("cafe");
  const [phases, setPhases] = useState(() => buildState(PHASES_BASE, "cafe"));
  const [expandedPhase, setExpandedPhase] = useState<string | null>("planning");
  const [memoMap, setMemoMap] = useState<Record<string, string>>({});
  const [openMemo, setOpenMemo] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const changeIndustry = (ind: string) => {
    setIndustry(ind);
    setPhases(buildState(PHASES_BASE, ind));
  };

  const updateMemo = (itemId: string, value: string) => {
    setMemoMap(prev => ({ ...prev, [itemId]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleItem = (phaseId: string, itemId: string) => {
    setPhases(prev => prev.map(p =>
      p.id === phaseId
        ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }
        : p
    ));
  };

  const totalItems = phases.flatMap(p => p.items).length;
  const doneItems = phases.flatMap(p => p.items).filter(i => i.done).length;
  const requiredItems = phases.flatMap(p => p.items).filter(i => i.required);
  const doneRequired = requiredItems.filter(i => i.done).length;
  const progress = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap');
        body{font-family:'Pretendard',-apple-system,sans-serif}
        @media print {
          .no-print { display: none !important; }
          nav, aside { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; padding-top: 0 !important; }
          .rounded-3xl, .rounded-2xl { border-radius: 8px !important; }
          .shadow-sm { box-shadow: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
      <NavBar />
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>
          </div>

          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                <span>✅</span> 창업 체크리스트
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">창업 체크리스트</h1>
              <p className="text-slate-500 text-sm">업종별 인허가·준비사항을 단계별로 확인하세요.</p>
            </div>
            <button
              onClick={handlePrint}
              className="no-print flex-shrink-0 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition mt-1"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 5V2h8v3M3 10H1V5h12v5h-2M3 8h8v4H3V8z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              PDF 저장
            </button>
          </div>

          {/* 업종 선택 */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                onClick={() => changeIndustry(ind.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
                  industry === ind.id ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{ind.emoji}</span>{ind.label}
              </button>
            ))}
          </div>

          {/* 진행률 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">전체 진행률</h2>
              <span className="text-2xl font-extrabold text-slate-900">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 mb-4">
              <div
                className="h-3 rounded-full bg-slate-900 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{doneItems}</p>
                <p className="text-xs text-slate-400">완료 항목</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-cyan-600">{doneRequired}/{requiredItems.length}</p>
                <p className="text-xs text-slate-400">필수 항목</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-400">{totalItems - doneItems}</p>
                <p className="text-xs text-slate-400">남은 항목</p>
              </div>
            </div>
          </div>

          {/* 단계별 체크리스트 */}
          <div className="space-y-3">
            {phases.map((phase) => {
              const phaseDone = phase.items.filter(i => i.done).length;
              const phaseTotal = phase.items.length;
              const isExpanded = expandedPhase === phase.id;

              return (
                <div key={phase.id} className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
                  <button
                    className="w-full px-6 py-4 flex items-center gap-3 text-left"
                    onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                  >
                    <span className="text-2xl">{phase.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{phase.title}</span>
                        <span className="text-xs text-slate-400">{phase.timeline}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 max-w-[120px]">
                          <div
                            className="h-1.5 rounded-full bg-slate-900 transition-all"
                            style={{ width: `${phaseTotal > 0 ? (phaseDone / phaseTotal) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{phaseDone}/{phaseTotal}</span>
                      </div>
                    </div>
                    {phaseDone === phaseTotal && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">완료 ✓</span>
                    )}
                    <svg
                      width="16" height="16" viewBox="0 0 16 16" fill="none"
                      className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    >
                      <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {phase.items.map((item) => (
                        <div key={item.id} className={`px-6 py-4 transition ${item.done ? "bg-slate-50" : "hover:bg-slate-50"}`}>
                          <label className="flex items-start gap-4 cursor-pointer">
                            <div className="mt-0.5 flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggleItem(phase.id, item.id)}
                                className="w-4 h-4 accent-slate-900"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold ${item.done ? "line-through text-slate-400" : "text-slate-800"}`}>
                                  {item.label}
                                </span>
                                {item.required && (
                                  <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md flex-shrink-0">필수</span>
                                )}
                              </div>
                              {item.desc && (
                                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.link && !item.done && (
                                <Link
                                  href={item.link}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-semibold text-blue-500 hover:text-blue-600 transition"
                                >
                                  바로가기 →
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setOpenMemo(openMemo === item.id ? null : item.id); }}
                                className={`text-xs px-2 py-1 rounded-lg transition ${memoMap[item.id] ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400 hover:text-slate-600"}`}
                              >
                                {memoMap[item.id] ? "📝 메모" : "메모"}
                              </button>
                            </div>
                          </label>
                          {openMemo === item.id && (
                            <div className="mt-2 ml-8">
                              <textarea
                                value={memoMap[item.id] ?? ""}
                                onChange={(e) => updateMemo(item.id, e.target.value)}
                                placeholder="메모를 입력하세요..."
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 resize-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-100 px-5 py-4 text-xs text-slate-500 leading-relaxed">
            💡 <strong className="text-slate-700">Tip.</strong> 체크 상태는 브라우저 새로고침 시 초기화됩니다. 진행 상황은 별도로 저장해두시길 권장합니다. 인허가 요건은 지자체별로 상이할 수 있으니 관할 구청에서 최종 확인하세요.
          </div>
        </div>
      </main>
    </>
  );
}
