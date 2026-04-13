"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { PLANS } from "@/lib/plans";
import EventPopup from "@/components/EventPopup";

/* ── 미니 시뮬레이터 ── */
function MiniSim() {
  const [seats, setSeats] = useState(28);
  const [spend, setSpend] = useState(20000);
  const [turn, setTurn] = useState(1.4);
  const [cogsRate, setCogsRate] = useState(33);

  const sales = Math.round(seats * spend * turn * 26);
  const cost = Math.round(sales * cogsRate / 100 + 600 * 10000 + 250 * 10000 + 500000);
  const profit = sales - cost;
  const margin = sales > 0 ? ((profit / sales) * 100).toFixed(1) : "0";
  const fmt = (n: number) => Math.abs(n).toLocaleString("ko-KR");

  const sliders = [
    { label: "좌석 수", value: seats, display: `${seats}석`, min: 5, max: 80, step: 1, set: setSeats },
    { label: "객단가", value: spend, display: `${spend.toLocaleString()}원`, min: 3000, max: 100000, step: 1000, set: setSpend },
    { label: "회전율", value: turn, display: `${turn.toFixed(1)}회`, min: 0.5, max: 6, step: 0.1, set: setTurn },
    { label: "원가율", value: cogsRate, display: `${cogsRate}%`, min: 15, max: 55, step: 1, set: setCogsRate },
  ];

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 shadow-lg p-5 sm:p-7">
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-bold text-slate-900 dark:text-white">수익 미리보기</span>
        <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full font-semibold">슬라이더를 움직여보세요</span>
      </div>

      <div className="space-y-4 mb-5">
        {sliders.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">{s.label}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{s.display}</span>
            </div>
            <input
              type="range" min={s.min} max={s.max} step={s.step} value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="w-full accent-blue-500 h-1.5"
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-400 font-semibold">예상 월 매출</span>
          <span className="text-lg font-extrabold text-slate-900 dark:text-white">{fmt(sales)}원</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400 font-semibold">예상 순이익</span>
          <span className={`text-xl font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {profit >= 0 ? "+" : "-"}{fmt(profit)}원
          </span>
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${profit >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(Math.max(Number(margin), 0), 100)}%` }}
          />
        </div>
        <p className={`text-right text-[11px] font-semibold mt-1 ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          순이익률 {margin}%
        </p>
      </div>

      <Link
        href="/simulator"
        className="block w-full text-center bg-blue-600 text-white py-3.5 rounded-xl text-sm font-bold active:scale-[0.98] transition"
      >
        상세 분석하기 →
      </Link>
    </div>
  );
}

/* ── FadeIn ── */
function FadeIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "opacity 0.5s ease, transform 0.5s ease" }}
    >
      {children}
    </div>
  );
}

/* ── 랜딩 콘텐츠 ── */
function LandingContent() {
  const formMsgRef = useRef<HTMLParagraphElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const btn = submitBtnRef.current;
    const msg = formMsgRef.current;
    if (!btn || !msg) return;
    btn.textContent = "전송 중..."; btn.disabled = true; msg.style.display = "none";
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameRef.current?.value, email: emailRef.current?.value, message: messageRef.current?.value }),
      });
      if (res.ok) {
        btn.textContent = "전송 완료 ✓"; msg.style.display = "block"; msg.style.color = "#059669"; msg.textContent = "문의가 접수되었습니다.";
        (e.target as HTMLFormElement).reset();
      } else { btn.textContent = "재시도"; msg.style.display = "block"; msg.style.color = "#ef4444"; msg.textContent = "전송 실패. 다시 시도해주세요."; btn.disabled = false; }
    } catch { btn.textContent = "재시도"; msg.style.display = "block"; msg.style.color = "#ef4444"; msg.textContent = "네트워크 오류"; btn.disabled = false; }
    setTimeout(() => { if (btn?.textContent === "전송 완료 ✓") { btn.textContent = "문의 보내기"; btn.disabled = false; } }, 4000);
  }

  const FEATURE_CATEGORIES = [
    {
      key: "revenue", label: "💰 수익 분석", desc: "매출·원가·인건비·세금 시뮬레이션",
      items: [
        { icon: "🧮", title: "메뉴별 원가 계산", desc: "식재료 원가 → 원가율·건당 순익 자동 계산", tag: "원가" },
        { icon: "👥", title: "인건비 스케줄러", desc: "직원별 시급·근무시간 → 월간 인건비 예측", tag: "원가" },
        { icon: "🧾", title: "세금 계산기", desc: "부가세·종소세 예상액 자동 산출", tag: "세금" },
      ],
    },
    {
      key: "ai", label: "🤖 AI 도구", desc: "AI가 자동으로 생성·분석",
      items: [
        { icon: "🛵", title: "배달앱 매출 분석", desc: "정산서 업로드 → 수수료·실매출 AI 자동 분석", tag: "AI" },
        { icon: "📊", title: "리뷰 감정 분석", desc: "네이버·배민 리뷰 → AI 감정·키워드 분석", tag: "AI" },
        { icon: "📱", title: "SNS 콘텐츠 생성", desc: "메뉴·이벤트 → 인스타 캡션 AI 자동 생성", tag: "AI" },
      ],
    },
    {
      key: "startup", label: "🚀 창업 준비", desc: "사업계획·자금·법인·인수인계",
      items: [
        { icon: "🗺️", title: "AI 상권 분석", desc: "입지 조건 → 상권 적합도 AI 리포트", tag: "AI" },
        { icon: "📄", title: "손익계산서 PDF", desc: "시뮬레이션 데이터 → P&L 리포트 즉시 출력", tag: "PDF" },
        { icon: "📈", title: "매출 예측 AI", desc: "과거 데이터 기반 3개월 매출 자동 예측", tag: "AI" },
      ],
    },
  ];

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 px-4 pt-24 pb-16 sm:pt-32 sm:pb-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* 좌측 텍스트 */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                외식업 AI 경영 분석
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-5">
                매장 수익을<br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">한눈에 파악하세요</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed mb-7 max-w-md">
                좌석 수, 객단가, 비용만 입력하면 AI가 수익성을 분석하고 맞춤 전략을 제안합니다. 30개 이상의 경영 도구를 무료로 시작하세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-7 py-4 rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] transition"
                >
                  무료로 시작하기
                </Link>
                <Link
                  href="/tools"
                  className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-7 py-4 rounded-2xl text-sm font-bold active:scale-[0.98] transition"
                >
                  도구 둘러보기
                </Link>
              </div>
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                카카오 로그인 3초 · 무료 플랜 제공
              </p>
            </div>

            {/* 우측 미니 시뮬레이터 */}
            <div className="hidden sm:block">
              <MiniSim />
            </div>
          </div>

          {/* 통계 바 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 sm:mt-16 pt-8 border-t border-slate-200 dark:border-slate-700">
            {[
              { num: "30+", label: "경영 도구" },
              { num: "5", label: "업종 지원" },
              { num: "20+", label: "재무 지표" },
              { num: "AI", label: "실시간 전략" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{s.num}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 모바일 미니 시뮬레이터 */}
      <section className="sm:hidden px-4 -mt-4 mb-8">
        <MiniSim />
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="bg-white dark:bg-slate-900 px-4 py-16 sm:py-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              핵심 기능
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">사장님에게 필요한 모든 도구</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">원가 계산부터 AI 분석까지, 매장 운영에 필요한 도구를 한곳에서.</p>
          </FadeIn>
          {FEATURE_CATEGORIES.map((cat) => (
            <FadeIn key={cat.key} className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                  {cat.label.split(" ")[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{cat.label}</h3>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{cat.items.length}개</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 via-slate-200 dark:via-slate-700 to-transparent mb-5" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {cat.items.map((f) => (
                  <div key={f.title} className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 sm:p-6 ring-1 ring-slate-100 dark:ring-slate-700 hover:ring-blue-200 hover:shadow-md transition group">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition">
                      {f.icon}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">{f.desc}</p>
                    <span className="inline-block text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{f.tag}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          ))}
          <FadeIn className="text-center mt-8">
            <Link href="/tools" className="text-sm font-semibold text-blue-600 active:text-blue-800 transition">
              전체 도구 보기 →
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-slate-50 dark:bg-slate-950 px-4 py-16 sm:py-24 md:px-8">
        <div className="mx-auto max-w-4xl">
          <FadeIn className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              이용 방법
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">3분이면 충분합니다</h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", icon: "📝", title: "3분 만에 입력", desc: "업종·좌석·객단가·비용을 입력하세요. POS 파일 업로드도 가능합니다.", color: "bg-blue-600" },
              { step: "2", icon: "🤖", title: "AI가 즉시 분석", desc: "20개 이상 재무 지표를 계산하고 현재 상태를 진단합니다.", color: "bg-indigo-600" },
              { step: "3", icon: "🚀", title: "바로 실행", desc: "AI 추천 전략을 확인하고 실행 계획을 세우세요.", color: "bg-emerald-600" },
            ].map((s) => (
              <FadeIn key={s.step}>
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 ring-1 ring-slate-200 dark:ring-slate-700 text-center relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1 ${s.color}`} />
                  <div className="text-3xl mb-3">{s.icon}</div>
                  <div className={`inline-block ${s.color} text-white text-[10px] font-bold px-3 py-1 rounded-full mb-3`}>STEP {s.step}</div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="bg-white dark:bg-slate-900 px-4 py-16 sm:py-24 md:px-8">
        <div className="mx-auto max-w-3xl">
          <FadeIn className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              요금제
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">심플한 요금제</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">무료로 시작하고, 필요할 때 업그레이드하세요.</p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANS.map((p) => (
              <FadeIn key={p.plan}>
                <div className={`rounded-2xl p-6 sm:p-8 relative ${p.popular ? "bg-slate-900 text-white ring-2 ring-blue-600" : "bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700"}`}>
                  {p.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      가장 인기
                    </div>
                  )}
                  <p className={`text-xs font-semibold mb-1 ${p.popular ? "text-slate-400" : "text-slate-500"}`}>{p.plan}</p>
                  <p className="text-3xl font-black mb-1">
                    {p.price}<span className={`text-sm font-medium ${p.popular ? "text-slate-400" : "text-slate-400"}`}>{p.unit}</span>
                  </p>
                  <p className={`text-xs mb-6 ${p.popular ? "text-slate-400" : "text-slate-500"}`}>{p.desc}</p>
                  <ul className="space-y-2.5 mb-6">
                    {p.landingFeatures.map((f: string) => (
                      <li key={f} className={`flex items-center gap-2 text-xs ${p.popular ? "text-slate-300" : "text-slate-600"}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${p.popular ? "bg-blue-600 text-white" : "bg-emerald-100 text-emerald-600"}`}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.href}
                    className={`block w-full text-center py-3.5 rounded-xl text-sm font-bold transition active:scale-[0.98] ${
                      p.popular
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {p.btn}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BANNER ── */}
      <section className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-4 py-12 sm:py-16 md:px-8">
        <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-white">
          {[
            { num: "30+", label: "경영 도구", sub: "원가부터 AI까지" },
            { num: "무료", label: "시작 가능", sub: "카카오 3초 로그인" },
            { num: "5", label: "업종 지원", sub: "카페·음식점·바 등" },
            { num: "24/7", label: "AI 상담", sub: "언제든 질문 가능" },
          ].map((s) => (
            <FadeIn key={s.label}>
              <p className="text-2xl sm:text-4xl font-black">{s.num}</p>
              <p className="text-xs sm:text-sm font-semibold mt-1 text-white/90">{s.label}</p>
              <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">{s.sub}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-slate-50 dark:bg-slate-950 px-4 py-16 sm:py-24 md:px-8">
        <div className="mx-auto max-w-2xl">
          <FadeIn className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              FAQ
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">자주 묻는 질문</h2>
          </FadeIn>
          <div className="space-y-3">
            {[
              { q: "VELA는 어떤 서비스인가요?", a: "외식업 사장님을 위한 AI 기반 경영 분석 도구입니다. 수익 시뮬레이션, AI 브리핑, 메뉴 원가 분석 등 매장 운영에 필요한 핵심 기능을 제공합니다." },
              { q: "무료 플랜에서 유료로 전환하면 데이터가 유지되나요?", a: "네, 기존에 저장한 시뮬레이션 데이터는 모두 유지됩니다." },
              { q: "언제든지 구독을 취소할 수 있나요?", a: "네, 언제든 취소 가능합니다. 취소 후에도 결제 기간까지 유료 기능을 사용할 수 있습니다." },
              { q: "결제는 어떤 방법으로 가능한가요?", a: "신용카드, 체크카드 등 토스페이먼츠를 통한 다양한 결제 방법을 지원합니다." },
            ].map((faq) => (
              <FadeIn key={faq.q}>
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 ring-1 ring-slate-200 dark:ring-slate-700">
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Q. {faq.q}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-slate-900 px-4 py-16 sm:py-20 md:px-8 text-center">
        <div className="mx-auto max-w-lg">
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">지금 바로 시작하세요</h2>
            <p className="text-sm text-slate-400 mb-8">카카오 로그인 3초면 모든 도구를 무료로 사용할 수 있습니다.</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] transition"
            >
              무료로 시작하기
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="bg-white dark:bg-slate-900 px-4 py-16 sm:py-24 md:px-8">
        <div className="mx-auto max-w-4xl">
          <FadeIn className="mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              문의
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">궁금한 게 있으신가요?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">서비스 도입, 기능 제안, 파트너십 등 편하게 남겨주세요.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 space-y-5">
              {[
                { label: "이메일", value: "mnhyuk@velaanalytics.com" },
                { label: "운영 시간", value: "평일 10:00 — 18:00" },
                { label: "응답 시간", value: "영업일 기준 1일 이내" },
              ].map((c) => (
                <div key={c.label}>
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-1">{c.label}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{c.value}</p>
                </div>
              ))}
            </div>
            <form className="md:col-span-3 space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">이름</label>
                  <input ref={nameRef} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white px-4 py-3 text-base outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-slate-700 transition" placeholder="홍길동" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">연락처</label>
                  <input className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white px-4 py-3 text-base outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-slate-700 transition" placeholder="010-0000-0000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">이메일</label>
                <input ref={emailRef} type="email" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white px-4 py-3 text-base outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-slate-700 transition" placeholder="your@email.com" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">문의 내용</label>
                <textarea ref={messageRef} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white px-4 py-3 text-base outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-slate-700 transition resize-y min-h-[120px]" placeholder="궁금한 점을 자유롭게 적어주세요." required />
              </div>
              <button ref={submitBtnRef} type="submit" className="bg-blue-600 text-white px-6 py-3.5 rounded-xl text-sm font-bold active:scale-[0.98] transition">
                문의 보내기
              </button>
              <p ref={formMsgRef} className="text-xs hidden" />
            </form>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 px-4 py-12 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
            <p className="text-lg font-black text-white">VELA<span className="text-blue-500">.</span></p>
            <div className="flex flex-wrap gap-4">
              {[
                { label: "도구", href: "#features" },
                { label: "시뮬레이터", href: "/simulator" },
                { label: "커뮤니티", href: "/community" },
                { label: "요금제", href: "#pricing" },
                { label: "FAQ", href: "#faq" },
                { label: "문의", href: "#contact" },
              ].map((l) => (
                <Link key={l.label} href={l.href} className="text-xs text-slate-400 hover:text-white transition">{l.label}</Link>
              ))}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed mb-6">
            상호명: 벨라솔루션 | 대표자: 김민혁<br />
            사업자등록번호: 777-17-02386 | 통신판매업 신고번호: 제2026-대전중구-0222호<br />
            주소: 대전광역시 중구 당디로96번길 9, 204호(유천동)<br />
            전화번호: 010-2863-3754 | 이메일: mnhyuk@velaanalytics.com
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} VELA. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/terms" className="text-xs text-slate-500 hover:text-white transition">이용약관</Link>
              <Link href="/privacy" className="text-xs text-slate-500 hover:text-white transition">개인정보처리방침</Link>
              <Link href="/refund" className="text-xs text-slate-500 hover:text-white transition">환불 정책</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ── 라우터 ── */
export default function HomePage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    const sbKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (sbKey) {
      try { return !!JSON.parse(localStorage.getItem(sbKey) ?? "null"); } catch { return false; }
    }
    return localStorage.getItem("vela-logged-in") === "1";
  });

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }: { data: { user: unknown } }) => {
      const val = !!data.user;
      setLoggedIn(val);
      localStorage.setItem("vela-logged-in", val ? "1" : "0");
      if (val) {
        // 신규 가입 → 온보딩
        const params = new URLSearchParams(window.location.search);
        const onboarded = localStorage.getItem("vela-onboarded") === "1";
        if (params.get("signup") === "success" && !onboarded) {
          router.replace("/onboarding");
        } else {
          router.replace("/home");
        }
      }
    });
  }, [router]);

  // 해시 앵커(#features 등) 접근 시 랜딩 표시
  const hasHash = typeof window !== "undefined" && window.location.hash.length > 0;

  // 로그인 확인 중 또는 리다이렉트 중
  if (loggedIn && !hasHash) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <EventPopup />
      <LandingContent />
    </>
  );
}
