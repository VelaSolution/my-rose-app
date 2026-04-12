"use client";

import { useState } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import PlanGate from "@/components/PlanGate";
import CollapsibleTip from "@/components/CollapsibleTip";

type Industry = "cafe" | "restaurant" | "bar" | "finedining" | "gogi";

const INDUSTRIES: { id: Industry; label: string; emoji: string }[] = [
  { id: "cafe", label: "카페", emoji: "☕" },
  { id: "restaurant", label: "음식점", emoji: "🍽️" },
  { id: "bar", label: "술집/바", emoji: "🍺" },
  { id: "finedining", label: "파인다이닝", emoji: "✨" },
  { id: "gogi", label: "고깃집", emoji: "🥩" },
];

const AREA_TYPES = ["주거지역", "오피스 밀집", "대학가", "관광지", "번화가/유흥가", "로드샵/외곽", "복합쇼핑몰 내"];
const FOOT_TRAFFIC = ["매우 많음 (하루 5,000명+)", "많음 (2,000~5,000명)", "보통 (500~2,000명)", "적음 (500명 미만)"];
const COMPETITOR_COUNTS = ["없음", "1~2개", "3~5개", "6개 이상"];
const RENT_RANGES = ["50만원 미만/평", "50~100만원/평", "100~200만원/평", "200만원 이상/평"];
const PARKING = ["전용 주차장 있음", "근처 공용 주차장", "주차 불편", "주차 불가"];
const VISIBILITY = ["대로변 1층 (잘 보임)", "골목 내 (찾아야 함)", "2층 이상", "지하"];

export default function AreaAnalysisPage() {
  const [industry, setIndustry] = useState<Industry>("cafe");
  const [area, setArea] = useState("");
  const [areaType, setAreaType] = useState("");
  const [footTraffic, setFootTraffic] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [rentRange, setRentRange] = useState("");
  const [parking, setParking] = useState("");
  const [visibility, setVisibility] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [extraNote, setExtraNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  const isReady = areaType && footTraffic && competitors && rentRange;

  async function analyze() {
    if (!isReady) return;
    setLoading(true);
    setResult("");

    const industryLabels: Record<Industry, string> = {
      cafe: "카페", restaurant: "일반 음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
    };

    const prompt = `당신은 외식업 상권 분석 전문 컨설턴트입니다.
아래 입지 조건을 바탕으로 ${industryLabels[industry]} 창업 적합성을 분석해주세요.

[입지 정보]
- 지역/주소: ${area || "미입력"}
- 상권 유형: ${areaType}
- 유동 인구: ${footTraffic}
- 동종 경쟁 업체 수: ${competitors}
- 임대료 수준: ${rentRange}
- 주차 환경: ${parking || "미입력"}
- 매장 가시성: ${visibility || "미입력"}
- 타깃 고객: ${targetCustomer || "미입력"}
- 추가 특이사항: ${extraNote || "없음"}

다음 형식으로 분석해주세요:

**종합 적합도 점수: X/10점**

**✅ 이 상권의 강점 (3~4가지)**
- 구체적인 강점 설명

**⚠️ 주의해야 할 리스크 (2~3가지)**  
- 구체적인 리스크와 대응 방안

**💡 이 상권에서 성공하기 위한 핵심 전략 (3가지)**
- 실행 가능한 구체적 전략

**📊 예상 손익 포인트**
- 이 입지에서 수익성에 영향을 줄 핵심 요소들

**🎯 최종 권고**
- 입점 추천 여부와 이유 (2~3문장)`;

    try {
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "당신은 외식업 상권 분석 전문 컨설턴트입니다. 입지 조건을 바탕으로 창업 적합성, 강점·리스크, 전략을 구체적으로 분석합니다.",
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`);
      setResult(data.text ?? "");
    } catch (e) {
      setResult(`분석 중 오류가 발생했습니다: ${e instanceof Error ? e.message : "다시 시도해주세요."}`);
    } finally {
      setLoading(false);
    }
  }

  function renderResult(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-bold text-slate-900 mt-4 mb-1">{line.replace(/\*\*/g, "")}</p>;
      }
      if (line.startsWith("- ")) {
        return <p key={i} className="text-sm text-slate-700 pl-3 mb-1">• {line.slice(2)}</p>;
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm text-slate-700 mb-1">{line}</p>;
    });
  }

  return (
    <>
      <ToolNav />
      <PlanGate>
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>🗺️</span> AI 상권 분석
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">상권 분석 도우미</h1>
            <p className="text-slate-500 text-sm">입지 조건을 입력하면 AI가 창업 적합성과 전략을 분석합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 입력 */}
            <div className="space-y-5">
              {/* 업종 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h2 className="font-bold text-slate-900 mb-3">업종</h2>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind.id}
                      onClick={() => setIndustry(ind.id)}
                      className={`rounded-2xl py-2.5 flex items-center justify-center gap-2 text-sm font-semibold transition ${
                        industry === ind.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {ind.emoji} {ind.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-6 space-y-4">
                <h2 className="font-bold text-slate-900">입지 정보</h2>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">지역/주소 (선택)</label>
                  <input
                    type="text" value={area} onChange={(e) => setArea(e.target.value)}
                    placeholder="예) 서울 마포구 홍대입구역 근처"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:bg-white transition"
                  />
                </div>

                {[
                  { label: "상권 유형", value: areaType, setter: setAreaType, options: AREA_TYPES, required: true },
                  { label: "유동 인구", value: footTraffic, setter: setFootTraffic, options: FOOT_TRAFFIC, required: true },
                  { label: "경쟁 업체 수 (동종)", value: competitors, setter: setCompetitors, options: COMPETITOR_COUNTS, required: true },
                  { label: "임대료 수준", value: rentRange, setter: setRentRange, options: RENT_RANGES, required: true },
                  { label: "주차 환경", value: parking, setter: setParking, options: PARKING, required: false },
                  { label: "매장 가시성", value: visibility, setter: setVisibility, options: VISIBILITY, required: false },
                ].map(({ label, value, setter, options, required }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      {label} {required && <span className="text-red-400">*</span>}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setter(opt)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                            value === opt ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">타깃 고객 (선택)</label>
                  <input
                    type="text" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)}
                    placeholder="예) 20~30대 직장인, 가족 단위"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">추가 특이사항 (선택)</label>
                  <textarea
                    value={extraNote} onChange={(e) => setExtraNote(e.target.value)}
                    placeholder="예) 근처 대형 오피스 신축 예정, 지하철역 도보 2분"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:bg-white transition resize-none"
                  />
                </div>

                <button
                  onClick={analyze}
                  disabled={loading || !isReady}
                  className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      분석 중...
                    </>
                  ) : "🗺️ 상권 분석 시작"}
                </button>
                {!isReady && (
                  <p className="text-xs text-slate-400 text-center">* 필수 항목 4개를 모두 선택해주세요</p>
                )}
              </div>
            </div>

            {/* 결과 */}
            <div>
              <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden h-full min-h-[600px] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">분석 리포트</h2>
                  {result && (
                    <button
                      onClick={async () => { await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition"
                    >
                      {copied ? "✓ 복사됨" : "📋 복사"}
                    </button>
                  )}
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {!result && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="text-5xl mb-4">🗺️</div>
                      <p className="text-slate-400 text-sm">입지 조건을 입력하고<br />분석을 시작해주세요</p>
                    </div>
                  )}
                  {loading && (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                      <svg className="animate-spin w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-sm text-slate-400">상권 분석 중...</p>
                    </div>
                  )}
                  {!loading && result && (
                    <div>
                      {renderResult(result)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <CollapsibleTip className="mt-6">
            AI 분석은 입력된 정보를 바탕으로 한 참고 의견입니다. 실제 입점 결정 전 현장 방문과 평일·주말·시간대별 유동인구 직접 조사를 병행하세요. <Link href="/simulator" className="text-blue-500 underline">수익 시뮬레이터</Link>와 함께 활용하면 더욱 정확한 판단이 가능합니다.
          </CollapsibleTip>
        </div>
      </main>
      </PlanGate>
    </>
  );
}
