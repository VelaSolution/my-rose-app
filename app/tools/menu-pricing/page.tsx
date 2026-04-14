"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fmt } from "@/lib/vela";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";

type PriceResult = {
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  targetCostRate: number;
  reasoning: string;
  tips: string[];
};

type PricingCloudData = {
  menuName: string;
  ingredientCost: string;
  industry: string;
  competitorMin: string;
  competitorMax: string;
  location: string;
};

const PRICING_DEFAULT: PricingCloudData = {
  menuName: "",
  ingredientCost: "",
  industry: "restaurant",
  competitorMin: "",
  competitorMax: "",
  location: "서울 일반 상권",
};

export default function MenuPricingPage() {
  const [menuName, setMenuName] = useState("");
  const [ingredientCost, setIngredientCost] = useState("");
  const [industry, setIndustry] = useState("restaurant");
  const [competitorMin, setCompetitorMin] = useState("");
  const [competitorMax, setCompetitorMax] = useState("");
  const [location, setLocation] = useState("서울 일반 상권");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceResult | null>(null);
  const [error, setError] = useState("");

  const { data: cloudData, update: cloudUpdate, status: syncStatus, userId: syncUserId } = useCloudSync<PricingCloudData>("vela-menu-pricing", PRICING_DEFAULT);

  // Load from cloud on mount
  useEffect(() => {
    if (cloudData.menuName !== undefined) setMenuName(cloudData.menuName);
    if (cloudData.ingredientCost !== undefined) setIngredientCost(cloudData.ingredientCost);
    if (cloudData.industry) setIndustry(cloudData.industry);
    if (cloudData.competitorMin !== undefined) setCompetitorMin(cloudData.competitorMin);
    if (cloudData.competitorMax !== undefined) setCompetitorMax(cloudData.competitorMax);
    if (cloudData.location) setLocation(cloudData.location);
  }, [cloudData]);

  // Save to cloud on change
  useEffect(() => {
    cloudUpdate({ menuName, ingredientCost, industry, competitorMin, competitorMax, location });
  }, [menuName, ingredientCost, industry, competitorMin, competitorMax, location, cloudUpdate]);

  const analyze = async () => {
    if (!menuName.trim() || !ingredientCost) { setError("메뉴명과 원가를 입력해주세요."); return; }
    setLoading(true); setError("");

    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "당신은 외식업 메뉴 가격 전략 전문가입니다. 반드시 JSON 형식으로만 응답하세요.",
          prompt: `메뉴: ${menuName}
식재료 원가: ${ingredientCost}원
업종: ${industry}
경쟁 매장 가격대: ${competitorMin || "모름"}~${competitorMax || "모름"}원
입지: ${location}

위 조건으로 적정 메뉴 가격을 추천해주세요.
JSON 형식: {"recommendedPrice":number,"minPrice":number,"maxPrice":number,"targetCostRate":number,"reasoning":"2~3문장","tips":["팁1","팁2","팁3"]}`,
        }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setResult(parsed);
    } catch {
      setError("분석에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ToolNav />
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
      <div className="mx-auto max-w-3xl">
        <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>

        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>💰</span> AI 가격 추천
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">AI 메뉴 가격 추천</h1>
            <CloudSyncBadge status={syncStatus} userId={syncUserId} />
          </div>
          <p className="text-slate-500 text-sm">원가와 경쟁 가격대를 입력하면 AI가 적정 가격을 추천합니다.</p>
        </div>

        <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-4 mb-6">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">메뉴명</label>
            <input value={menuName} onChange={(e) => setMenuName(e.target.value)} placeholder="예: 아메리카노, 된장찌개" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">식재료 원가 (원)</label>
            <input type="number" value={ingredientCost} onChange={(e) => setIngredientCost(e.target.value)} placeholder="예: 2500" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">업종</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="cafe">카페</option>
              <option value="restaurant">음식점</option>
              <option value="bar">술집/바</option>
              <option value="finedining">파인다이닝</option>
              <option value="gogi">고깃집</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">경쟁 최저가 (원)</label>
              <input type="number" value={competitorMin} onChange={(e) => setCompetitorMin(e.target.value)} placeholder="선택" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">경쟁 최고가 (원)</label>
              <input type="number" value={competitorMax} onChange={(e) => setCompetitorMax(e.target.value)} placeholder="선택" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">입지</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>

          <button onClick={analyze} disabled={loading} className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition">
            {loading ? "AI 분석 중..." : "가격 추천받기"}
          </button>
        </div>

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 mb-6">{error}</div>}

        {result && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 text-center">
              <p className="text-sm text-slate-400 mb-2">AI 추천 가격</p>
              <p className="text-4xl font-extrabold text-blue-600">{fmt(result.recommendedPrice)}<span className="text-lg text-slate-400">원</span></p>
              <p className="text-sm text-slate-500 mt-2">{fmt(result.minPrice)}원 ~ {fmt(result.maxPrice)}원 범위</p>
              <p className="text-xs text-slate-400 mt-1">목표 원가율: {result.targetCostRate}%</p>
            </div>

            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-2">분석 근거</h3>
              <p className="text-sm text-slate-600 leading-7">{result.reasoning}</p>
            </div>

            {result.tips?.length > 0 && (
              <div className="rounded-3xl bg-slate-900 p-6">
                <h3 className="text-sm font-semibold text-white mb-3">가격 전략 팁</h3>
                <div className="space-y-2">
                  {result.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-blue-400 flex-shrink-0">•</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
    </>
  );
}
