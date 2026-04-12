"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import CollapsibleTip from "@/components/CollapsibleTip";
import SimDataPicker from "@/components/SimDataPicker";
import type { SimulatorSnapshot } from "@/lib/useSimulatorData";

type MonthSnap = {
  month: string;
  monthly_sales: number;
  rent: number;
  labor_cost: number;
  utilities: number;
  marketing: number;
  etc: number;
  cogs_rate: number;
  profit: number;
  industry: string;
};

type Forecast = {
  estimatedMin: number;
  estimatedMax: number;
  factors: string[];
  recommendations: string[];
  summary: string;
  generatedAt: number;
};

const CACHE_KEY = "vela-revenue-forecast";
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const DEMO_DATA: MonthSnap[] = [
  { month: "2025-07", monthly_sales: 18500000, rent: 2200000, labor_cost: 5500000, utilities: 450000, marketing: 300000, etc: 200000, cogs_rate: 32, profit: 3950000, industry: "한식" },
  { month: "2025-08", monthly_sales: 17200000, rent: 2200000, labor_cost: 5500000, utilities: 480000, marketing: 250000, etc: 180000, cogs_rate: 33, profit: 3090000, industry: "한식" },
  { month: "2025-09", monthly_sales: 19800000, rent: 2200000, labor_cost: 5500000, utilities: 420000, marketing: 350000, etc: 220000, cogs_rate: 31, profit: 4930000, industry: "한식" },
  { month: "2025-10", monthly_sales: 21000000, rent: 2200000, labor_cost: 5800000, utilities: 400000, marketing: 400000, etc: 250000, cogs_rate: 30, profit: 5450000, industry: "한식" },
  { month: "2025-11", monthly_sales: 22500000, rent: 2200000, labor_cost: 5800000, utilities: 450000, marketing: 500000, etc: 200000, cogs_rate: 31, profit: 5850000, industry: "한식" },
  { month: "2025-12", monthly_sales: 25000000, rent: 2200000, labor_cost: 6000000, utilities: 500000, marketing: 600000, etc: 300000, cogs_rate: 29, profit: 7250000, industry: "한식" },
  { month: "2026-01", monthly_sales: 20000000, rent: 2200000, labor_cost: 5800000, utilities: 520000, marketing: 350000, etc: 220000, cogs_rate: 32, profit: 4510000, industry: "한식" },
  { month: "2026-02", monthly_sales: 19500000, rent: 2200000, labor_cost: 5800000, utilities: 480000, marketing: 300000, etc: 200000, cogs_rate: 31, profit: 4475000, industry: "한식" },
  { month: "2026-03", monthly_sales: 21500000, rent: 2200000, labor_cost: 5800000, utilities: 420000, marketing: 400000, etc: 230000, cogs_rate: 30, profit: 5900000, industry: "한식" },
];

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function getMonthLabel(m: string): string {
  const parts = m.split("-");
  return `${parts[1]}월`;
}

export default function RevenueForecastPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [snapshots, setSnapshots] = useState<MonthSnap[]>([]);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [useDemo, setUseDemo] = useState(false);

  const simFields = (sim: SimulatorSnapshot) => [
    { key: "monthly_sales", label: "월 매출", value: `${Math.round(sim.totalSales).toLocaleString("ko-KR")}원`, rawValue: Math.round(sim.totalSales) },
    { key: "profit", label: "월 순이익", value: `${Math.round(sim.profit).toLocaleString("ko-KR")}원`, rawValue: Math.round(sim.profit) },
  ];

  const applySimSelected = (selected: Record<string, number | string>) => {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const monthlySales = (selected.monthly_sales as number) || 0;
    const profit = (selected.profit as number) || 0;
    const snap: MonthSnap = {
      month,
      monthly_sales: monthlySales,
      rent: 0,
      labor_cost: 0,
      utilities: 0,
      marketing: 0,
      etc: 0,
      cogs_rate: monthlySales > 0 ? Math.round((1 - profit / monthlySales) * 100) : 30,
      profit,
      industry: "한식",
    };
    setSnapshots((prev) => {
      const filtered = prev.filter((s) => s.month !== month);
      return [...filtered, snap].sort((a, b) => a.month.localeCompare(b.month));
    });
  };

  // Load data
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => {
      const user = data.user as { id: string } | null;
      setIsLoggedIn(!!user);
      if (user) {
        supabase
          .from("monthly_snapshots")
          .select("*")
          .eq("user_id", user.id)
          .order("month", { ascending: true })
          .limit(12)
          .then(({ data }: { data: MonthSnap[] | null }) => {
            if (data && data.length > 0) {
              setSnapshots(data);
            } else {
              setSnapshots(DEMO_DATA);
              setUseDemo(true);
            }
          });
      } else {
        setSnapshots(DEMO_DATA);
        setUseDemo(true);
      }
    });

    // Load cached forecast
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: Forecast = JSON.parse(cached);
        if (Date.now() - parsed.generatedAt < ONE_WEEK) {
          setForecast(parsed);
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const maxSales = Math.max(...snapshots.map((s) => s.monthly_sales), 1);

  const generate = useCallback(async () => {
    if (!isLoggedIn) {
      window.location.href = "/login?next=/tools/revenue-forecast";
      return;
    }
    setLoading(true);

    const revenueHistory = snapshots
      .map((s) => `${s.month}: 매출 ${fmt(s.monthly_sales)}원, 순이익 ${fmt(s.profit)}원, 원가율 ${s.cogs_rate}%`)
      .join("\n");

    const industry = snapshots[0]?.industry || "외식업";
    const currentMonth = new Date().toISOString().slice(0, 7);
    const nextMonth = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().slice(0, 7);
    })();

    const prompt = `당신은 외식업 경영 컨설턴트이자 데이터 분석 전문가입니다.
아래 과거 월별 매출 데이터를 분석하여 다음 달(${nextMonth}) 매출을 예측해주세요.

[업종] ${industry}
[현재] ${currentMonth}
[과거 매출 데이터]
${revenueHistory}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "estimatedMin": (다음 달 예상 최소 매출, 숫자),
  "estimatedMax": (다음 달 예상 최대 매출, 숫자),
  "factors": ["핵심 영향 요인 1", "핵심 영향 요인 2", "핵심 영향 요인 3"],
  "recommendations": ["매출 향상 전략 1", "매출 향상 전략 2", "매출 향상 전략 3"],
  "summary": "전체 분석 요약 (2-3문장)"
}

분석 시 고려사항:
- 계절성 (여름/겨울 성수기, 비수기)
- 트렌드 (매출 증가/감소 추세)
- 업종 특성
- 경제 환경 및 외식업 시장 전망`;

    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "당신은 외식업 경영 컨설턴트입니다. 매출 데이터 분석과 예측을 수행합니다. 반드시 유효한 JSON으로만 응답하세요.",
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`);

      const text = (data.text ?? "").trim();
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI 응답을 파싱할 수 없습니다.");

      const parsed = JSON.parse(jsonMatch[0]);
      const result: Forecast = {
        estimatedMin: Number(parsed.estimatedMin) || 0,
        estimatedMax: Number(parsed.estimatedMax) || 0,
        factors: Array.isArray(parsed.factors) ? parsed.factors : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        summary: String(parsed.summary || ""),
        generatedAt: Date.now(),
      };

      setForecast(result);
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch (e) {
      alert(`예측 생성 중 오류: ${e instanceof Error ? e.message : "다시 시도해주세요."}`);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, snapshots]);

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link
              href="/tools"
              className="text-sm text-slate-400 hover:text-slate-700 transition"
            >
              ← 도구 목록
            </Link>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>📈</span> AI 예측
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              매출 예측 AI
            </h1>
            <p className="text-slate-500 text-sm">
              과거 매출 데이터를 기반으로 AI가 다음 달 매출을 예측하고 전략을 제안합니다.
            </p>
            <SimDataPicker fields={simFields} onApply={applySimSelected} />
          </div>

          {/* Demo notice */}
          {useDemo && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3 mb-6 flex items-center gap-3">
              <span className="text-lg">💡</span>
              <p className="text-xs text-amber-700">
                실제 매출 데이터가 없어 <strong>샘플 데이터</strong>로 표시 중입니다.{" "}
                <Link href="/monthly-input" className="underline font-semibold hover:text-amber-900">
                  월별 매출 입력
                </Link>
                에서 데이터를 등록하면 맞춤 예측을 받을 수 있습니다.
              </p>
            </div>
          )}

          {/* Bar chart */}
          <div className="bg-white ring-1 ring-slate-200 rounded-3xl p-6 mb-6">
            <h2 className="font-bold text-slate-900 mb-1">월별 매출 추이</h2>
            <p className="text-xs text-slate-400 mb-5">최근 {snapshots.length}개월</p>

            {snapshots.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">데이터를 불러오는 중...</div>
            ) : (
              <div className="space-y-3">
                {snapshots.map((s) => {
                  const pct = (s.monthly_sales / maxSales) * 100;
                  return (
                    <div key={s.month} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-10 text-right font-medium shrink-0">
                        {getMonthLabel(s.month)}
                      </span>
                      <div className="flex-1 h-8 bg-slate-100 rounded-xl overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600">
                          {fmt(s.monthly_sales)}원
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick stats */}
            {snapshots.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-xs text-slate-400">평균 매출</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {fmt(Math.round(snapshots.reduce((a, s) => a + s.monthly_sales, 0) / snapshots.length))}원
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">최고 매출</p>
                  <p className="text-sm font-bold text-emerald-600 mt-1">
                    {fmt(Math.max(...snapshots.map((s) => s.monthly_sales)))}원
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">최저 매출</p>
                  <p className="text-sm font-bold text-red-500 mt-1">
                    {fmt(Math.min(...snapshots.map((s) => s.monthly_sales)))}원
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="mb-6">
            {isLoggedIn === false && (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 px-5 py-3 mb-4 flex items-center gap-3">
                <span className="text-blue-500 text-lg">🔒</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-700">AI 예측은 로그인이 필요해요</p>
                  <p className="text-xs text-blue-500 mt-0.5">무료로 가입하면 바로 사용 가능</p>
                </div>
                <Link
                  href="/login?next=/tools/revenue-forecast"
                  className="flex-shrink-0 rounded-xl bg-blue-500 text-white text-xs font-bold px-3 py-2 hover:bg-blue-600 transition"
                >
                  로그인 →
                </Link>
              </div>
            )}
            <button
              onClick={generate}
              disabled={loading || snapshots.length === 0}
              className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI가 분석 중...
                </>
              ) : isLoggedIn === false ? (
                "🔒 로그인 후 예측하기"
              ) : (
                "🤖 AI 매출 예측 생성"
              )}
            </button>
          </div>

          {/* Forecast results */}
          {forecast && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-white ring-1 ring-slate-200 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🎯</span>
                  <h2 className="font-bold text-slate-900">예측 요약</h2>
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(forecast.generatedAt).toLocaleDateString("ko-KR")} 생성
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">{forecast.summary}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                    <p className="text-xs text-emerald-600 font-semibold mb-1">예상 최소 매출</p>
                    <p className="text-lg font-extrabold text-emerald-700">{fmt(forecast.estimatedMin)}원</p>
                  </div>
                  <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4 text-center">
                    <p className="text-xs text-purple-600 font-semibold mb-1">예상 최대 매출</p>
                    <p className="text-lg font-extrabold text-purple-700">{fmt(forecast.estimatedMax)}원</p>
                  </div>
                </div>
              </div>

              {/* Factors */}
              <div className="bg-white ring-1 ring-slate-200 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📊</span>
                  <h2 className="font-bold text-slate-900">핵심 영향 요인</h2>
                </div>
                <div className="space-y-2">
                  {forecast.factors.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-purple-500 font-bold text-sm mt-0.5">{i + 1}</span>
                      <p className="text-sm text-slate-700">{f}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white ring-1 ring-slate-200 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">💡</span>
                  <h2 className="font-bold text-slate-900">매출 향상 전략</h2>
                </div>
                <div className="space-y-2">
                  {forecast.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-2xl bg-purple-50 px-4 py-3">
                      <span className="text-purple-500 text-sm mt-0.5">✓</span>
                      <p className="text-sm text-slate-700">{r}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regenerate */}
              <button
                onClick={generate}
                disabled={loading}
                className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-white transition"
              >
                🔄 다시 예측하기
              </button>
            </div>
          )}

          {/* Tip */}
          <CollapsibleTip className="mt-6">
            예측 정확도를 높이려면{" "}
            <Link href="/monthly-input" className="text-purple-600 underline hover:text-purple-800">
              월별 매출 입력
            </Link>
            에서 최소 6개월 이상의 데이터를 입력해 주세요. 데이터가 많을수록 계절성과 트렌드 분석이 정확해집니다.
          </CollapsibleTip>
        </div>
      </main>
    </>
  );
}
