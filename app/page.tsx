"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import EventPopup from "@/components/EventPopup";
import { LandingStyles } from "@/app/components/landing/LandingStyles";
import { HeroSection } from "@/app/components/landing/HeroSection";
import { FeaturesSection } from "@/app/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/app/components/landing/HowItWorksSection";
import { PricingSection } from "@/app/components/landing/PricingSection";
import { TestimonialsSection } from "@/app/components/landing/TestimonialsSection";
import { GameBannerSection } from "@/app/components/landing/GameBannerSection";
import { FAQSection } from "@/app/components/landing/FAQSection";
import { CTASection } from "@/app/components/landing/CTASection";
import { ContactSection } from "@/app/components/landing/ContactSection";
import { FooterSection } from "@/app/components/landing/FooterSection";
import { MemberHome } from "@/app/components/landing/MemberHome";

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
  return (
    <>
      <LandingStyles />
      <HeroSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <ContactSection />
      <FooterSection />
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
    const params = new URLSearchParams(window.location.search);
    if (params.get("landing") === "1") { setLoggedIn(false); return; }

    const sb = createSupabaseBrowserClient();
    const timeout = setTimeout(() => { setLoggedIn(false); }, 5000); // 5초 타임아웃

    sb.auth.getUser().then(({ data }: { data: { user: unknown } }) => {
      clearTimeout(timeout);
      const val = !!data.user;
      setLoggedIn(val);
      localStorage.setItem("vela-logged-in", val ? "1" : "0");
      if (val) {
        const onboarded = localStorage.getItem("vela-onboarded") === "1";
        if (params.get("signup") === "success" && !onboarded) {
          router.replace("/onboarding");
        } else {
          router.replace("/home");
        }
      }
    }).catch(() => { clearTimeout(timeout); setLoggedIn(false); });

    return () => clearTimeout(timeout);
  }, [router]);

  // ?landing=1 이나 #해시 접근 시 랜딩 표시, 아니면 /home으로
  const hasHash = typeof window !== "undefined" && window.location.hash.length > 0;
  const forceLanding = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("landing") === "1";

  // 로그인 상태 + 강제 랜딩 아닌 경우 → /home 리다이렉트 대기
  if (loggedIn && !hasHash && !forceLanding) {
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
