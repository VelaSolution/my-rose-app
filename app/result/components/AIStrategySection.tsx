"use client";

import { useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import {
  calcResult, calcStrategies,
  type FullForm,
} from "@/lib/vela";

type AIStrategy = {
  title: string;
  description: string;
  difficulty: "쉬움" | "보통" | "어려움";
  category: string;
};

const DIFFICULTY_STYLE: Record<string, string> = {
  "쉬움": "bg-emerald-100 text-emerald-700",
  "보통": "bg-amber-100 text-amber-700",
  "어려움": "bg-red-100 text-red-700",
};

const CATEGORY_STYLE: Record<string, string> = {
  "메뉴": "bg-orange-100 text-orange-700",
  "마케팅": "bg-blue-100 text-blue-700",
  "운영": "bg-purple-100 text-purple-700",
  "공간": "bg-teal-100 text-teal-700",
  "고객관리": "bg-pink-100 text-pink-700",
};

export default function AIStrategySection({
  form, result, strategies, plan,
}: {
  form: FullForm;
  result: ReturnType<typeof calcResult>;
  strategies: ReturnType<typeof calcStrategies>;
  plan: string;
}) {
  const [aiStrategies, setAiStrategies] = useState<AIStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const fetchStrategies = async () => {
    if (plan === "free") { setShowUpgrade(true); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, result, existingStrategies: strategies }),
      });
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      setAiStrategies(data.strategies ?? []);
    } catch (e) {
      setError("AI 전략 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="AI 전략 추천은 유료 기능이에요"
        description="AI가 매장 상황에 맞는 맞춤 전략을 제안합니다. 스탠다드 플랜으로 업그레이드하면 무제한 이용 가능합니다."
      />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">AI 추천 전략</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            수치 시뮬레이션 외에 AI가 운영 방식·마케팅·메뉴 관점에서 새로운 전략을 제안합니다.
            {plan === "free" && <span className="ml-2 text-blue-500 font-semibold">(유료 전용)</span>}
          </p>
        </div>
        <div className="rounded-full bg-slate-900 dark:bg-slate-200 px-3 py-1 text-xs font-semibold text-white dark:text-slate-900">VELA AI</div>
      </div>

      {!aiStrategies.length && !loading && (
        <button
          onClick={fetchStrategies}
          className="w-full rounded-2xl bg-slate-900 dark:bg-slate-200 py-4 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-700 dark:hover:bg-slate-300 active:scale-95"
        >
          AI 전략 추천 받기
        </button>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl bg-slate-50 dark:bg-slate-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-600" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-slate-200 dark:bg-slate-600" />
              </div>
              <div className="space-y-2">
                <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-600 w-2/5" />
                <div className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                <div className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-600 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
          <button onClick={fetchStrategies} className="ml-3 underline">다시 시도</button>
        </div>
      )}

      {aiStrategies.length > 0 && (
        <>
          <div className="space-y-4">
            {aiStrategies.map((item, index) => (
              <div key={index} className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-200 text-xs font-bold text-white dark:text-slate-900">
                      {index + 1}
                    </div>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[item.category] ?? "bg-slate-100 text-slate-600"}`}>
                      {item.category}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLE[item.difficulty] ?? "bg-slate-100 text-slate-600"}`}>
                      {item.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
          <button
            onClick={fetchStrategies}
            className="mt-4 w-full rounded-2xl border border-slate-200 dark:border-slate-600 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            다시 생성하기
          </button>
        </>
      )}
    </section>
  );
}
