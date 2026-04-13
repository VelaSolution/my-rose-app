"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const INDUSTRY_LABELS: Record<string, string> = {
  cafe: "☕ 카페",
  restaurant: "🍽️ 음식점",
  bar: "🍺 술집/바",
  finedining: "✨ 파인다이닝",
  gogi: "🥩 고깃집",
};

const FIRST_ACTIONS = [
  {
    id: "simulator",
    icon: "🔮",
    title: "수익 시뮬레이터 해보기",
    desc: "3분이면 매장 수익성을 파악할 수 있어요",
    href: "/simulator",
    color: "bg-blue-50 ring-blue-200",
    recommended: true,
  },
  {
    id: "sales",
    icon: "📊",
    title: "이번 달 매출 입력하기",
    desc: "홀 매출 숫자 하나만 입력하면 끝",
    href: "/sales-connect",
    color: "bg-emerald-50 ring-emerald-200",
    recommended: false,
  },
  {
    id: "menu-cost",
    icon: "🧮",
    title: "메뉴 원가 계산해보기",
    desc: "내 메뉴의 실제 수익을 알아보세요",
    href: "/tools/menu-cost",
    color: "bg-amber-50 ring-amber-200",
    recommended: false,
  },
  {
    id: "tools",
    icon: "🛠️",
    title: "도구 둘러보기",
    desc: "30개 이상의 경영 도구를 확인하세요",
    href: "/tools",
    color: "bg-slate-50 ring-slate-200",
    recommended: false,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessStatus, setBusinessStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const meta = user.user_metadata ?? {};
      setName(meta.full_name || meta.nickname || user.email?.split("@")[0] || "사장님");
      setIndustry(meta.industry || "");
      setBusinessStatus(meta.business_status || "");
      setLoading(false);
    }
    load();
  }, [router]);

  const handleComplete = (href: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vela-onboarded", "1");
    }
    router.push(href);
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vela-onboarded", "1");
    }
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </main>
    );
  }

  const statusLabel = businessStatus === "operating" ? "운영 중" : businessStatus === "preparing" ? "준비 중" : "고민 중";

  return (
    <main className="min-h-screen bg-slate-50 px-4 pt-20 pb-24 md:px-8">
      <div className="mx-auto max-w-lg">

        {/* 스텝 인디케이터 */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step >= s ? "w-10 bg-blue-600" : "w-6 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* ── STEP 1: 환영 ── */}
        {step === 1 && (
          <div className="text-center animate-[fadeIn_0.3s_ease]">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              환영합니다, {name}님!
            </h1>
            <p className="text-sm text-slate-500 mb-8">
              VELA가 매장 경영을 도와드릴게요.
            </p>

            {/* 프로필 요약 */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 mb-6 text-left">
              <p className="text-xs font-semibold text-slate-400 mb-3">내 매장 정보</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">이름</span>
                  <span className="text-sm font-bold text-slate-900">{name}</span>
                </div>
                {industry && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">업종</span>
                    <span className="text-sm font-bold text-slate-900">{INDUSTRY_LABELS[industry] ?? industry}</span>
                  </div>
                )}
                {businessStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">현재 상태</span>
                    <span className="text-sm font-bold text-slate-900">{statusLabel}</span>
                  </div>
                )}
              </div>
              <Link href="/profile" className="block text-xs text-blue-600 font-semibold mt-3">
                수정하기 →
              </Link>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full rounded-2xl bg-slate-900 text-white py-4 text-sm font-bold active:scale-[0.98] transition"
            >
              다음
            </button>
          </div>
        )}

        {/* ── STEP 2: VELA 핵심 기능 소개 ── */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.3s_ease]">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                VELA로 할 수 있는 것들
              </h2>
              <p className="text-xs text-slate-500">매장 운영에 필요한 모든 도구가 여기에 있어요.</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { icon: "🔮", title: "수익 시뮬레이터", desc: "매출·비용 입력 → 순이익·BEP 자동 계산" },
                { icon: "🧮", title: "메뉴 원가 계산", desc: "식재료 원가 → 메뉴별 수익성 파악" },
                { icon: "🛵", title: "배달앱 매출 분석", desc: "정산서 업로드 → 수수료·실수령 AI 분석" },
                { icon: "📈", title: "AI 경영 전략", desc: "데이터 기반 맞춤 개선점 추천" },
                { icon: "📊", title: "월별 매출 관리", desc: "홀+배달 매출 추이 한눈에" },
              ].map((f) => (
                <div key={f.title} className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg flex-shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{f.title}</p>
                    <p className="text-xs text-slate-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-600 active:bg-slate-50 transition"
              >
                이전
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-2xl bg-slate-900 text-white py-4 text-sm font-bold active:scale-[0.98] transition"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: 첫 할 일 선택 ── */}
        {step === 3 && (
          <div className="animate-[fadeIn_0.3s_ease]">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                뭐부터 해볼까요?
              </h2>
              <p className="text-xs text-slate-500">하나를 선택하면 바로 시작됩니다.</p>
            </div>

            <div className="space-y-3 mb-6">
              {FIRST_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleComplete(a.href)}
                  className={`w-full flex items-center gap-4 rounded-2xl p-4 ring-1 text-left transition active:scale-[0.98] ${a.color} ${a.recommended ? "ring-blue-300 shadow-sm" : ""}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg flex-shrink-0">
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{a.title}</p>
                      {a.recommended && (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">추천</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{a.desc}</p>
                  </div>
                  <span className="text-slate-300 flex-shrink-0">→</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-600 active:bg-slate-50 transition"
              >
                이전
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 rounded-2xl bg-slate-100 text-slate-600 py-4 text-sm font-semibold active:scale-[0.98] transition"
              >
                나중에 할게요
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
