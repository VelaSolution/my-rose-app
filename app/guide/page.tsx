"use client";

import Link from "next/link";

const SECTIONS = [
  {
    title: "시작하기",
    icon: "🚀",
    items: [
      { label: "수익 시뮬레이터로 내 매장 분석하기", href: "/simulator", desc: "매출·원가·인건비를 입력하면 순이익과 손익분기점을 자동으로 계산합니다." },
      { label: "대시보드에서 월별 매출 관리하기", href: "/dashboard", desc: "매월 실제 매출을 등록하면 추이와 성장률을 한눈에 볼 수 있어요." },
      { label: "AI 브리핑으로 경영 조언 받기", href: "/simulator", desc: "시뮬레이션 결과를 기반으로 AI가 맞춤 경영 조언을 생성합니다." },
    ],
  },
  {
    title: "원가 관리",
    icon: "🧮",
    items: [
      { label: "메뉴별 원가 계산기", href: "/tools/menu-cost", desc: "식재료 원가를 입력하면 원가율과 건당 순이익을 자동으로 계산합니다." },
      { label: "적정 원가율 기준", href: "/community", desc: "카페 25~30%, 음식점 30~35%, 바 20~28%가 업계 평균입니다. 커뮤니티 벤치마크 탭에서 확인하세요." },
      { label: "원가 절감 실전 팁", href: "/community", desc: "제철 식재료 활용, 거래처 2곳 유지, 발주 주기 조정으로 원가를 10% 이상 줄일 수 있습니다." },
    ],
  },
  {
    title: "인건비 & 세금",
    icon: "👥",
    items: [
      { label: "인건비 스케줄러", href: "/tools/labor", desc: "직원별 시급·근무시간을 설정하면 주간·월간 인건비를 예측합니다." },
      { label: "세금 계산기", href: "/tools/tax", desc: "매출 기반 부가세·종합소득세 예상액을 자동으로 산출합니다." },
      { label: "4대보험 계산 팁", href: "/tools/labor", desc: "직원 급여의 약 9.4%가 사업주 부담 4대보험료입니다. 인건비 스케줄러에서 자동 계산하세요." },
    ],
  },
  {
    title: "매출 성장",
    icon: "📈",
    items: [
      { label: "SNS 콘텐츠 생성기", href: "/tools/sns-content", desc: "메뉴·이벤트 정보를 입력하면 인스타그램 캡션을 AI가 자동 생성합니다." },
      { label: "리뷰 답변 생성기", href: "/tools/review-reply", desc: "고객 리뷰를 붙여넣으면 AI가 맞춤 답변 초안을 작성합니다." },
      { label: "상권 분석 도우미", href: "/tools/area-analysis", desc: "입지 조건을 입력하면 AI가 상권 적합도를 평가합니다." },
    ],
  },
  {
    title: "창업 준비",
    icon: "✅",
    items: [
      { label: "창업 체크리스트", href: "/tools/startup-checklist", desc: "업종별 인허가·준비물·타임라인을 단계별로 안내합니다." },
      { label: "사업계획서 도우미", href: "/tools/business-plan", desc: "6단계로 사업계획서를 작성하고 미리보기·복사할 수 있습니다." },
      { label: "정부 지원사업 매칭", href: "/tools/gov-support", desc: "사업 단계·지역·조건 입력 → 20개 이상 정부 지원 프로그램 중 매칭." },
      { label: "법인 설립 가이드", href: "/tools/incorporation", desc: "개인 vs 법인 세금 비교, 설립 절차 체크리스트, 비용 시뮬레이터." },
      { label: "재무 시뮬레이션", href: "/tools/financial-sim", desc: "런웨이, 손익분기점, 12개월 현금흐름을 3가지 시나리오로 비교." },
      { label: "투자 유치 도구", href: "/tools/fundraising", desc: "밸류에이션 계산, IR 덱 12슬라이드 가이드, 투자자 미팅 체크리스트." },
      { label: "손익계산서 PDF", href: "/tools/pl-report", desc: "시뮬레이션 데이터로 월별 P&L 리포트를 PDF로 출력합니다." },
      { label: "초기 투자금 계산", href: "/simulator", desc: "시뮬레이터에서 보증금·인테리어·장비 비용을 입력하면 투자 회수 기간을 계산합니다." },
    ],
  },
  {
    title: "세무·인사 관리",
    icon: "🧾",
    items: [
      { label: "세무·회계 가이드", href: "/tools/tax-guide", desc: "세금 캘린더, 부가세·소득세·4대보험 계산기, 외식업 절세 전략 10선." },
      { label: "인력 채용 도구", href: "/tools/hiring", desc: "급여 계산기, 근로계약서 자동 생성, 채용공고 템플릿 3종." },
      { label: "인건비 계산기 (법정)", href: "/tools/labor-law", desc: "주휴수당·야간수당·4대보험까지 자동 반영한 실제 인건비를 계산합니다." },
    ],
  },
  {
    title: "커뮤니티 & 소통",
    icon: "💬",
    items: [
      { label: "사장님 커뮤니티", href: "/community", desc: "수익 공유, 질문, 꿀팁, 익명 상담까지 — 같은 고민을 가진 사장님들과 소통하세요." },
      { label: "익명 경영 상담", href: "/community", desc: "말 못할 고민을 익명으로 올리면 AI 컨설턴트가 맞춤 조언을 드립니다." },
      { label: "경영 시뮬레이션 게임", href: "/game", desc: "90일간 가상 매장을 운영하며 경영 감각을 키워보세요." },
    ],
  },
];

const TEMPLATES = [
  { icon: "📊", title: "사장님 Notion 템플릿", desc: "매장 운영 일지, 월별 매출 트래커, 주간 체크리스트, 메뉴 관리 템플릿 (Coming Soon)", href: "" },
];

export default function GuidePage() {
  return (
    <>
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mt-6 mb-10">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              📖 사장님 가이드
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              VELA 활용 가이드
            </h1>
            <p className="text-slate-500 text-sm">
              매장 운영에 VELA를 200% 활용하는 방법을 알려드려요.
            </p>
          </div>

          {/* 템플릿 다운로드 */}
          <div className="rounded-3xl bg-slate-900 p-6 mb-8">
            <h2 className="text-white font-bold text-base mb-3">📋 무료 템플릿</h2>
            {TEMPLATES.map((t) => (
              <div
                key={t.title}
                className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 opacity-70"
              >
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{t.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{t.desc}</p>
                </div>
                <span className="text-amber-400 text-xs font-semibold bg-amber-400/20 px-3 py-1.5 rounded-xl">Coming Soon</span>
              </div>
            ))}
          </div>

          {/* 가이드 섹션 */}
          <div className="space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.title} className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                <h2 className="text-base font-bold text-slate-900 mb-4">
                  {section.icon} {section.title}
                </h2>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block rounded-2xl bg-slate-50 p-4 hover:bg-slate-100 transition group"
                    >
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 rounded-3xl bg-blue-600 p-6 text-center">
            <p className="text-white font-bold text-lg mb-2">지금 바로 시작해보세요</p>
            <p className="text-blue-200 text-sm mb-4">시뮬레이터로 내 매장을 분석하는 데 3분이면 충분합니다.</p>
            <Link
              href="/simulator"
              className="inline-block rounded-2xl bg-white text-blue-600 font-bold text-sm px-6 py-3 hover:bg-blue-50 transition"
            >
              시뮬레이터 시작하기 →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
