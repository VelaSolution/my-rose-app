"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const ONBOARDING_KEY = "vela-onboarding-done";

const STEPS = [
  {
    emoji: "🏪",
    title: "업종을 선택하세요",
    desc: "카페, 음식점, 술집/바, 파인다이닝, 고깃집 중 내 매장에 맞는 업종을 선택하면 맞춤 분석이 시작됩니다.",
    action: { label: "시뮬레이터에서 선택하기 →", href: "/simulator" },
  },
  {
    emoji: "💰",
    title: "매출 정보를 입력하세요",
    desc: "좌석 수, 객단가, 회전율, 임대료, 인건비 등 기본 정보를 입력하면 수익 구조를 자동으로 분석합니다.",
    action: { label: "매출 입력하러 가기 →", href: "/simulator" },
  },
  {
    emoji: "📊",
    title: "AI 분석 결과를 확인하세요",
    desc: "순이익, 손익분기점, AI 전략 추천까지 — 내 매장의 현재와 미래를 한눈에 확인할 수 있어요.",
    action: { label: "지금 시작하기 →", href: "/simulator" },
  },
];

export default function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setShow(true);
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem(ONBOARDING_KEY, "1");
  };

  if (!show) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <button onClick={close} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl">&times;</button>

        {/* 스텝 인디케이터 */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-blue-500" : "w-4 bg-slate-200"}`} />
          ))}
        </div>

        <div className="text-5xl mb-4">{current.emoji}</div>
        <p className="text-xs text-blue-500 font-semibold mb-2">STEP {step + 1} / {STEPS.length}</p>
        <h2 className="text-xl font-extrabold text-slate-900 mb-3">{current.title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{current.desc}</p>

        {step < STEPS.length - 1 ? (
          <div className="flex gap-2">
            <button onClick={close} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition">
              건너뛰기
            </button>
            <button onClick={() => setStep(step + 1)} className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">
              다음 →
            </button>
          </div>
        ) : (
          <Link
            href={current.action.href}
            onClick={close}
            className="block w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            {current.action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
