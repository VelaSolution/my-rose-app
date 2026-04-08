"use client";

import { useState } from "react";
import Link from "next/link";

const FAQ_SECTIONS = [
  {
    title: "시작하기", icon: "🚀",
    items: [
      { q: "VELA는 무료인가요?", a: "기본 도구들은 무료입니다. AI 도구와 고급 기능은 스탠다드/프로 플랜에서 사용 가능합니다." },
      { q: "회원가입은 어떻게 하나요?", a: "이메일 또는 Google/Kakao 계정으로 간편하게 가입할 수 있습니다." },
      { q: "시뮬레이터는 어떻게 사용하나요?", a: "업종, 좌석수, 객단가, 비용을 입력하면 자동으로 수익을 분석합니다. 3분이면 충분합니다." },
      { q: "데이터는 어디에 저장되나요?", a: "로그인하면 클라우드에 자동 저장됩니다. 비로그인 시에는 브라우저 로컬에 저장됩니다." },
    ],
  },
  {
    title: "도구 사용법", icon: "🛠️",
    items: [
      { q: "시뮬레이터 데이터를 도구에서 사용할 수 있나요?", a: "네! 각 도구에서 '🔗 시뮬레이터 데이터 연동' 버튼을 누르면 원하는 항목을 선택해서 자동으로 채울 수 있습니다." },
      { q: "CSV로 데이터를 내보낼 수 있나요?", a: "일일매출, 경쟁매장 가격, 재무시뮬레이션 등에서 CSV 내보내기가 가능합니다." },
      { q: "다른 기기에서도 데이터를 볼 수 있나요?", a: "로그인하면 클라우드 동기화를 통해 어디서든 같은 데이터를 사용할 수 있습니다." },
      { q: "다크모드는 어떻게 켜나요?", a: "상단 네비게이션 바의 🌙 버튼을 클릭하면 됩니다. 시스템 설정에 따라 자동 감지도 됩니다." },
      { q: "키보드 단축키가 있나요?", a: "Ctrl+K (Mac: ⌘K)를 누르면 빠른 검색 팔레트가 열립니다. 도구와 페이지를 즉시 이동할 수 있습니다." },
    ],
  },
  {
    title: "AI 기능", icon: "🤖",
    items: [
      { q: "AI 도구는 어떤 모델을 사용하나요?", a: "Anthropic의 Claude 모델을 사용합니다." },
      { q: "AI 생성 콘텐츠의 정확도는?", a: "AI가 생성한 콘텐츠는 참고용입니다. 실제 사용 전 반드시 검토해주세요." },
      { q: "월간 AI 팁은 어떻게 받나요?", a: "도구 목록 페이지에서 시뮬레이터 데이터가 있으면 '✨ AI 맞춤 팁 생성' 버튼이 나타납니다. 한 달에 1회 생성됩니다." },
      { q: "AI 사용 횟수 제한이 있나요?", a: "분당 10회 요청 제한이 있습니다. 스탠다드/프로 플랜은 더 많은 사용량을 제공합니다." },
    ],
  },
  {
    title: "결제 & 플랜", icon: "💳",
    items: [
      { q: "플랜 업그레이드는 어떻게 하나요?", a: "가격 페이지에서 원하는 플랜을 선택하고 결제하면 즉시 적용됩니다." },
      { q: "환불 정책은 어떻게 되나요?", a: "결제 후 7일 이내 미사용 시 전액 환불 가능합니다." },
      { q: "결제 수단은?", a: "카드, 토스, 카카오페이 등 다양한 결제 수단을 지원합니다." },
    ],
  },
  {
    title: "게임", icon: "🎮",
    items: [
      { q: "게임 데이터는 저장되나요?", a: "로컬과 클라우드 모두 저장됩니다. 다른 기기에서도 이어할 수 있습니다." },
      { q: "시즌 랭킹은 어떻게 작동하나요?", a: "매월 1일에 시즌 랭킹이 초기화됩니다. 이전 시즌 기록은 유지됩니다." },
      { q: "시뮬레이터 데이터로 게임을 할 수 있나요?", a: "네! 게임 설정에서 '내 시뮬레이션 불러오기' 버튼으로 실제 매장 데이터를 적용할 수 있습니다." },
    ],
  },
  {
    title: "기술 지원", icon: "🔧",
    items: [
      { q: "앱이 제대로 작동하지 않아요", a: "브라우저 캐시를 지우고 새로고침해보세요. 문제가 지속되면 문의해주세요." },
      { q: "PWA 설치는 어떻게 하나요?", a: "모바일: 브라우저 메뉴에서 '홈 화면에 추가'. 데스크탑: 주소창 오른쪽의 설치 아이콘을 클릭하세요." },
      { q: "데이터 백업은 어떻게 하나요?", a: "프로필 페이지에서 '데이터 백업' 섹션을 이용하세요. JSON 파일로 내보내기/가져오기가 가능합니다." },
      { q: "문의는 어디로 하나요?", a: "홈페이지 하단의 문의 폼을 이용하거나 support@velaanalytics.com으로 이메일 보내주세요." },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = search.trim()
    ? FAQ_SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i => i.q.toLowerCase().includes(search.toLowerCase()) || i.a.toLowerCase().includes(search.toLowerCase())),
      })).filter(s => s.items.length > 0)
    : FAQ_SECTIONS;

  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition">← 홈</Link>
        <div className="mt-4 mb-6">
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            ❓ 도움말
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">자주 묻는 질문</h1>
          <p className="text-slate-500 text-sm">VELA 사용에 대한 궁금한 점을 찾아보세요.</p>
        </div>

        <div className="relative mb-6">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="질문 검색..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm focus:border-blue-400 outline-none transition"
          />
        </div>

        <div className="space-y-4">
          {filtered.map(section => (
            <div key={section.title} className="bg-white ring-1 ring-slate-200 rounded-3xl p-5">
              <h2 className="text-base font-bold text-slate-900 mb-3">{section.icon} {section.title}</h2>
              <div className="space-y-1">
                {section.items.map(item => {
                  const key = `${section.title}-${item.q}`;
                  const isOpen = expanded === key;
                  return (
                    <div key={key}>
                      <button onClick={() => setExpanded(isOpen ? null : key)}
                        className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition">
                        <span className="text-xs text-slate-400">{isOpen ? "▼" : "▶"}</span>
                        <span className="text-sm font-semibold text-slate-700 flex-1">{item.q}</span>
                      </button>
                      {isOpen && (
                        <div className="ml-7 px-3 pb-3 text-sm text-slate-500 leading-relaxed">{item.a}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🤔</div>
              <p className="text-slate-500 text-sm">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-slate-900 rounded-3xl p-6 text-center">
          <p className="text-white font-bold text-sm mb-1">찾으시는 답변이 없나요?</p>
          <p className="text-slate-400 text-xs mb-4">홈페이지 하단 문의 폼으로 질문을 보내주세요.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/tools" className="rounded-xl bg-white text-slate-900 font-semibold px-5 py-2.5 text-sm hover:bg-slate-100 transition">
              도구 둘러보기
            </Link>
            <Link href="/#contact" className="rounded-xl bg-white/10 text-white font-semibold px-5 py-2.5 text-sm hover:bg-white/20 transition">
              문의하기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
