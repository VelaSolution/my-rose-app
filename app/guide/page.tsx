"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

// ── 업종별 추천 도구 ──
const INDUSTRY_GUIDES: Record<string, { label: string; icon: string; tools: string[] }> = {
  cafe: { label: "카페", icon: "☕", tools: ["simulator", "menu-cost", "labor", "sns-content", "review-reply", "area-analysis"] },
  restaurant: { label: "음식점", icon: "🍽️", tools: ["simulator", "menu-cost", "labor", "delivery-analysis", "card-sales", "hiring"] },
  bar: { label: "술집/바", icon: "🍺", tools: ["simulator", "menu-cost", "labor", "menu-pricing", "sns-content", "tax"] },
  finedining: { label: "파인다이닝", icon: "✨", tools: ["simulator", "menu-cost", "labor", "review-reply", "financial-sim", "hiring"] },
  gogi: { label: "고깃집", icon: "🥩", tools: ["simulator", "menu-cost", "labor", "delivery-analysis", "card-sales", "review-reply"] },
};

// ── 단계별 온보딩 ──
const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "내 매장 시뮬레이션 해보기",
    time: "3분",
    icon: "🎯",
    color: "from-blue-500 to-blue-600",
    href: "/simulator",
    description: "좌석 수, 객단가, 원가율을 입력하면 예상 매출과 순이익을 바로 확인할 수 있어요.",
    steps: [
      "시뮬레이터 페이지에서 '업종'을 선택하세요",
      "좌석 수, 객단가, 회전율을 입력하세요",
      "원가율과 인건비를 조정하면 순이익이 실시간으로 변해요",
      "AI 브리핑 버튼을 누르면 맞춤 경영 조언을 받을 수 있어요",
    ],
    tip: "처음이라면 기본값 그대로 두고 객단가만 바꿔보세요. 숫자 감이 바로 옵니다.",
  },
  {
    step: 2,
    title: "메뉴 원가 계산하기",
    time: "5분",
    icon: "🧮",
    color: "from-emerald-500 to-teal-500",
    href: "/tools/menu-cost",
    description: "각 메뉴의 식재료 원가를 입력하면 원가율과 건당 순이익을 자동 계산해요.",
    steps: [
      "메뉴 이름과 판매가격을 입력하세요",
      "'재료 추가' 버튼으로 식재료를 하나씩 넣으세요",
      "원가율이 자동으로 계산돼요 (목표: 30~35%)",
      "여러 메뉴를 추가해서 전체 원가 구조를 파악하세요",
    ],
    tip: "대표 메뉴 3~5개만 먼저 입력하면 전체 원가율을 예측할 수 있어요.",
  },
  {
    step: 3,
    title: "인건비 관리하기",
    time: "5분",
    icon: "👥",
    color: "from-amber-500 to-orange-500",
    href: "/tools/labor",
    description: "직원별 시급, 근무시간을 설정하면 주휴수당·4대보험까지 포함한 실제 인건비를 보여줘요.",
    steps: [
      "'직원 추가' 버튼으로 직원을 등록하세요",
      "시급과 근무 요일/시간을 설정하세요",
      "주휴수당과 4대보험이 자동으로 계산돼요",
      "전체 인건비 합계가 월/연 단위로 표시돼요",
    ],
    tip: "2026 최저시급은 10,320원이에요. 시급을 이보다 낮게 설정하면 경고가 뜹니다.",
  },
  {
    step: 4,
    title: "대시보드로 매출 추적하기",
    time: "2분",
    icon: "📊",
    color: "from-purple-500 to-violet-600",
    href: "/dashboard",
    description: "매월 실제 매출을 입력하면 성장률, 목표 달성률을 자동으로 추적해요.",
    steps: [
      "대시보드 페이지에서 '매출 등록' 버튼을 누르세요",
      "이번 달 매출, 지출을 입력하세요",
      "그래프에서 월별 매출 추이를 확인하세요",
      "시뮬레이션 예측치와 실제 매출을 비교해보세요",
    ],
    tip: "매달 1일에 지난 달 매출을 입력하는 습관을 만들면 경영 흐름이 보여요.",
  },
  {
    step: 5,
    title: "AI 도구 활용하기",
    time: "1분씩",
    icon: "🤖",
    color: "from-pink-500 to-rose-500",
    href: "/tools",
    description: "SNS 콘텐츠, 리뷰 답변, 상권 분석까지 — AI가 초안을 만들어드려요.",
    steps: [
      "도구 페이지에서 원하는 AI 도구를 선택하세요",
      "필요한 정보를 입력하세요 (메뉴명, 리뷰 내용 등)",
      "AI가 생성한 결과를 확인하고 복사하세요",
      "필요에 따라 수정해서 바로 사용하세요",
    ],
    tip: "리뷰 답변 생성기가 가장 즉시 효과가 큰 도구예요. 부정 리뷰에 답변하는 시간을 90% 줄여줘요.",
  },
];

// ── 도구 사전 ──
const TOOL_INFO: Record<string, { name: string; icon: string; desc: string; href: string }> = {
  "simulator": { name: "수익 시뮬레이터", icon: "🎯", desc: "매출·원가·인건비 한번에 시뮬레이션", href: "/simulator" },
  "menu-cost": { name: "메뉴 원가 계산기", icon: "🧮", desc: "메뉴별 원가율·순이익 자동 계산", href: "/tools/menu-cost" },
  "labor": { name: "인건비 스케줄러", icon: "👥", desc: "직원별 시급·근무시간·4대보험 관리", href: "/tools/labor" },
  "sns-content": { name: "SNS 콘텐츠 생성", icon: "📱", desc: "인스타·블로그 홍보글 AI 생성", href: "/tools/sns-content" },
  "review-reply": { name: "리뷰 답변 생성", icon: "💬", desc: "고객 리뷰에 맞춤 답변 AI 작성", href: "/tools/review-reply" },
  "area-analysis": { name: "상권 분석", icon: "📍", desc: "입지 조건별 상권 적합도 분석", href: "/tools/area-analysis" },
  "delivery-analysis": { name: "배달 분석", icon: "🛵", desc: "배달 매출·수수료 분석", href: "/tools/delivery-analysis" },
  "card-sales": { name: "카드매출 분석", icon: "💳", desc: "카드 매출 데이터 분석", href: "/tools/card-sales" },
  "hiring": { name: "인력 채용 도구", icon: "📋", desc: "급여 계산·근로계약서·채용공고", href: "/tools/hiring" },
  "menu-pricing": { name: "메뉴 가격 전략", icon: "💰", desc: "메뉴 가격 최적화 분석", href: "/tools/menu-pricing" },
  "tax": { name: "세금 계산기", icon: "🧾", desc: "부가세·종합소득세 예상액 산출", href: "/tools/tax" },
  "financial-sim": { name: "재무 시뮬레이션", icon: "📈", desc: "런웨이·손익분기점·현금흐름", href: "/tools/financial-sim" },
};

// ── FAQ ──
const FAQS = [
  { q: "VELA는 무료인가요?", a: "기본 기능(시뮬레이터, 대시보드)은 무료입니다. AI 도구와 고급 분석은 프로 플랜(월 29,900원)에서 이용 가능해요." },
  { q: "입력한 데이터는 어디에 저장되나요?", a: "로그인 상태에서는 클라우드(Supabase)에 안전하게 저장돼요. 어떤 기기에서든 접속하면 데이터가 동기화됩니다. 비로그인 시에는 브라우저에만 저장돼요." },
  { q: "시뮬레이터 결과가 정확한가요?", a: "업계 평균 데이터를 기반으로 하지만, 실제 운영 환경에 따라 차이가 있을 수 있어요. 3개월간 실제 매출을 입력하면 예측 정확도가 높아집니다." },
  { q: "AI 기능은 어떤 모델을 사용하나요?", a: "Claude (Anthropic)를 사용합니다. 외식업 전문 프롬프트로 최적화되어 있어 일반 ChatGPT보다 업종 맞춤 답변을 제공해요." },
  { q: "직원이 여러 명인데 인건비 관리가 되나요?", a: "네! 인건비 스케줄러에서 직원을 무제한 추가할 수 있고, 각각의 시급·근무시간·요일을 따로 설정할 수 있어요. 전체 합계도 자동 계산됩니다." },
  { q: "모바일에서도 사용할 수 있나요?", a: "네, 모바일 웹에서 완벽하게 동작합니다. 홈 화면에 추가하면 앱처럼 사용할 수 있어요." },
  { q: "데이터를 내보낼 수 있나요?", a: "대시보드와 인건비 스케줄러에서 CSV 다운로드가 가능하고, 손익계산서는 PDF로 출력할 수 있어요." },
];

export default function GuidePage() {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [industry, setIndustry] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  // 유저 업종 불러오기
  useEffect(() => {
    (async () => {
      try {
        const sb = createSupabaseBrowserClient();
        if (!sb) return;
        const { data: { user } } = await sb.auth.getUser();
        if (user?.user_metadata?.industry) setIndustry(user.user_metadata.industry);
      } catch {}
      // 진행 상태 로드
      try {
        const saved = localStorage.getItem("vela_guide_completed");
        if (saved) setCompletedSteps(new Set(JSON.parse(saved)));
      } catch {}
    })();
  }, []);

  const toggleStep = (step: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step); else next.add(step);
      try { localStorage.setItem("vela_guide_completed", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const progress = Math.round((completedSteps.size / ONBOARDING_STEPS.length) * 100);
  const recommendedTools = industry && INDUSTRY_GUIDES[industry] ? INDUSTRY_GUIDES[industry].tools : null;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4">
      <div className="mx-auto max-w-3xl">

        {/* 헤더 */}
        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            📖 사장님 가이드
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            VELA 시작 가이드
          </h1>
          <p className="text-slate-500 text-sm">
            처음 오셨나요? 5단계만 따라하면 매장 경영이 숫자로 보이기 시작해요.
          </p>
        </div>

        {/* 진행률 */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-slate-900">시작 가이드 진행률</p>
              <p className="text-xs text-slate-400 mt-0.5">{completedSteps.size}/{ONBOARDING_STEPS.length}단계 완료</p>
            </div>
            <span className={`text-2xl font-extrabold ${progress === 100 ? "text-emerald-500" : "text-[#3182F6]"}`}>{progress}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-emerald-500" : "bg-[#3182F6]"}`} style={{ width: `${progress}%` }} />
          </div>
          {progress === 100 && (
            <p className="text-xs text-emerald-600 font-semibold mt-2">🎉 모든 단계를 완료했어요! 이제 VELA 마스터입니다.</p>
          )}
        </div>

        {/* 5단계 온보딩 */}
        <div className="space-y-3 mb-8">
          {ONBOARDING_STEPS.map((s, idx) => {
            const isDone = completedSteps.has(s.step);
            const isOpen = expandedStep === idx;
            return (
              <div key={s.step} className={`rounded-2xl bg-white ring-1 transition-all ${isDone ? "ring-emerald-200 bg-emerald-50/30" : "ring-slate-200"}`}>
                {/* 헤더 */}
                <button onClick={() => setExpandedStep(isOpen ? null : idx)} className="w-full flex items-center gap-4 p-4 text-left">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${isDone ? "bg-emerald-100" : `bg-gradient-to-br ${s.color} text-white`}`}>
                    {isDone ? "✅" : s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">STEP {s.step}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{s.time}</span>
                    </div>
                    <p className={`text-sm font-bold mt-0.5 ${isDone ? "text-emerald-700 line-through" : "text-slate-900"}`}>{s.title}</p>
                  </div>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}>
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>

                {/* 상세 */}
                {isOpen && (
                  <div className="px-4 pb-5 border-t border-slate-100">
                    <p className="text-sm text-slate-600 mt-4 mb-4">{s.description}</p>

                    {/* 단계별 방법 */}
                    <div className="space-y-2.5 mb-4">
                      {s.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-slate-700">{step}</p>
                        </div>
                      ))}
                    </div>

                    {/* 팁 */}
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-4">
                      <p className="text-xs text-amber-800"><span className="font-bold">💡 팁:</span> {s.tip}</p>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2">
                      <Link href={s.href}
                        className="flex-1 rounded-xl bg-[#3182F6] text-white font-semibold py-3 text-sm text-center hover:bg-[#2672DE] active:scale-[0.98] transition">
                        {s.title} →
                      </Link>
                      <button onClick={() => toggleStep(s.step)}
                        className={`rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        {isDone ? "완료 ✓" : "완료 체크"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 업종별 추천 도구 */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">🎯 업종별 추천 도구</h2>
          <p className="text-xs text-slate-400 mb-4">내 업종에 맞는 도구부터 시작하세요</p>

          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {Object.entries(INDUSTRY_GUIDES).map(([key, val]) => (
              <button key={key} onClick={() => setIndustry(key)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${industry === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {val.icon} {val.label}
              </button>
            ))}
          </div>

          {industry && INDUSTRY_GUIDES[industry] && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INDUSTRY_GUIDES[industry].tools.map(toolKey => {
                const tool = TOOL_INFO[toolKey];
                if (!tool) return null;
                return (
                  <Link key={toolKey} href={tool.href}
                    className="rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition group">
                    <span className="text-lg">{tool.icon}</span>
                    <p className="text-xs font-semibold text-slate-800 mt-1 group-hover:text-[#3182F6] transition">{tool.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{tool.desc}</p>
                  </Link>
                );
              })}
            </div>
          )}

          {!industry && (
            <p className="text-sm text-slate-400 text-center py-4">업종을 선택하면 추천 도구를 보여드려요</p>
          )}
        </div>

        {/* 전체 도구 빠른 링크 */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">🛠️ 전체 도구 한눈에</h2>
            <Link href="/tools" className="text-xs text-[#3182F6] font-semibold hover:underline">전체 보기 →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(TOOL_INFO).map(([key, tool]) => (
              <Link key={key} href={tool.href}
                className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 hover:bg-slate-100 transition">
                <span className="text-base">{tool.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{tool.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">❓ 자주 묻는 질문</h2>
          <div className="space-y-1">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50 rounded-xl px-3 transition">
                  <span className="text-sm font-semibold text-slate-800 pr-4">{faq.q}</span>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${expandedFaq === i ? "rotate-180" : ""}`}>
                    <path d="M3 5l4 4 4-4" />
                  </svg>
                </button>
                {expandedFaq === i && (
                  <div className="px-3 pb-3">
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 추가 도움 */}
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <Link href="/help" className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 hover:ring-[#3182F6]/30 transition group">
            <span className="text-2xl">📚</span>
            <p className="text-sm font-bold text-slate-900 mt-2 group-hover:text-[#3182F6] transition">도움말 센터</p>
            <p className="text-xs text-slate-400 mt-1">기능별 상세 사용법을 확인하세요</p>
          </Link>
          <Link href="/community" className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 hover:ring-[#3182F6]/30 transition group">
            <span className="text-2xl">💬</span>
            <p className="text-sm font-bold text-slate-900 mt-2 group-hover:text-[#3182F6] transition">사장님 커뮤니티</p>
            <p className="text-xs text-slate-400 mt-1">같은 고민을 가진 사장님들과 소통하세요</p>
          </Link>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-[#3182F6] to-[#7C3AED] p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[4rem]" />
          <p className="text-white font-bold text-lg mb-2 relative">지금 바로 시작해보세요</p>
          <p className="text-white/70 text-sm mb-4 relative">시뮬레이터로 내 매장을 분석하는 데 3분이면 충분합니다.</p>
          <Link href="/simulator"
            className="relative inline-block rounded-xl bg-white text-[#3182F6] font-bold text-sm px-6 py-3 hover:bg-white/90 active:scale-[0.98] transition shadow-sm">
            시뮬레이터 시작하기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
