"use client";

import { useState } from "react";
import Link from "next/link";
import { useSimulatorData } from "@/lib/useSimulatorData";
import { INDUSTRY_BENCHMARK, type IndustryKey } from "@/lib/vela";

/* ── 업종 옵션 ── */
const INDUSTRY_OPTIONS: { key: IndustryKey; label: string; icon: string }[] = [
  { key: "cafe",       label: "카페",       icon: "☕" },
  { key: "restaurant", label: "음식점",     icon: "🍽️" },
  { key: "bar",        label: "바",         icon: "🍸" },
  { key: "finedining", label: "파인다이닝", icon: "🥂" },
  { key: "gogi",       label: "고깃집",     icon: "🥩" },
];

/* ── 지표 정의 ── */
type MetricKey = "cogsRate" | "laborRate" | "rentRate" | "netMargin";

const METRICS: {
  key: MetricKey;
  label: string;
  benchKey: keyof typeof INDUSTRY_BENCHMARK.cafe;
  lowerIsBetter: boolean;
  tipBetter: string;
  tipWorse: string;
}[] = [
  {
    key: "cogsRate",
    label: "원가율",
    benchKey: "cogsRate",
    lowerIsBetter: true,
    tipBetter: "원가 관리가 업종 평균보다 우수합니다. 현재 레시피와 발주 패턴을 유지하세요.",
    tipWorse: "원가율이 높습니다. 식재료 대량 구매, 레시피 표준화, 폐기율 관리를 검토하세요.",
  },
  {
    key: "laborRate",
    label: "인건비율",
    benchKey: "laborRate",
    lowerIsBetter: true,
    tipBetter: "인건비가 효율적으로 관리되고 있습니다. 직원 만족도도 함께 체크하세요.",
    tipWorse: "인건비 비중이 높습니다. 피크/비피크 시간대 인력 조정, 주방 동선 효율화를 고려하세요.",
  },
  {
    key: "rentRate",
    label: "임대비율",
    benchKey: "rentRate",
    lowerIsBetter: true,
    tipBetter: "임대료 비중이 안정적입니다. 매출 증가 시 비율이 더 낮아질 수 있습니다.",
    tipWorse: "임대료 부담이 큽니다. 매출 증대 전략(배달, 테이크아웃)으로 비율을 낮추거나 재계약 시 협상을 준비하세요.",
  },
  {
    key: "netMargin",
    label: "순이익률",
    benchKey: "netMargin",
    lowerIsBetter: false,
    tipBetter: "순이익률이 업종 평균을 상회합니다. 현재 운영 방식이 효과적입니다.",
    tipWorse: "순이익률이 낮습니다. 원가, 인건비, 임대 중 어떤 항목이 압박하는지 시뮬레이터에서 확인하세요.",
  },
];

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

export default function BenchmarkPage() {
  const simData = useSimulatorData();
  const [useSimData, setUseSimData] = useState(false);

  const [industry, setIndustry] = useState<IndustryKey>("restaurant");

  /* 사용자 입력값 */
  const [manualCogs, setManualCogs] = useState("");
  const [manualLabor, setManualLabor] = useState("");
  const [manualRent, setManualRent] = useState("");
  const [manualNet, setManualNet] = useState("");

  const bench = INDUSTRY_BENCHMARK[industry];

  /* 사용자 값 결정: 시뮬레이터 연동 ON일 때만 simData 사용 */
  const sim = useSimData && simData ? simData : null;
  const userValues: Record<MetricKey, number | null> = {
    cogsRate: sim ? sim.cogsRatio : manualCogs ? Number(manualCogs) : null,
    laborRate: sim ? sim.laborRatio : manualLabor ? Number(manualLabor) : null,
    rentRate: sim
      ? sim.totalSales > 0
        ? Math.round((sim.rent / sim.totalSales) * 1000) / 10
        : null
      : manualRent
        ? Number(manualRent)
        : null,
    netMargin: sim ? sim.netMargin : manualNet ? Number(manualNet) : null,
  };

  const industryLabel = INDUSTRY_OPTIONS.find((o) => o.key === industry)?.label ?? industry;

  return (
    <>

      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-2xl">
          {/* 뒤로가기 */}
          <Link
            href="/tools"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition mb-4"
          >
            ← 도구 목록
          </Link>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              📊 경쟁 매장 비교
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
              경쟁 매장 비교 분석
            </h1>
            <p className="text-slate-500 text-sm">
              내 매장의 핵심 지표를 업종 평균과 비교해보세요.
            </p>
          </div>

          {/* 시뮬레이터 데이터 연동 */}
          {simData && (
            <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">🔗 시뮬레이터 데이터 연동</p>
                  <p className="text-xs text-slate-400 mt-0.5">{useSimData ? "시뮬레이터 값으로 비교 중" : "OFF — 아래에서 직접 입력하세요"}</p>
                </div>
                <button onClick={() => { setUseSimData(!useSimData); if (!useSimData && simData) setIndustry(simData.industry as IndustryKey); }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${useSimData ? "bg-blue-500" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${useSimData ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </div>
          )}

          {/* 업종 선택 */}
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 mb-4">
            <label className="text-sm font-semibold text-slate-700 mb-3 block">업종 선택</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setIndustry(opt.key)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    industry === opt.key
                      ? "bg-slate-900 text-white ring-2 ring-slate-900"
                      : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 시뮬레이터 연결 배너 */}
          {simData ? (
            <div className="rounded-3xl bg-emerald-50 ring-1 ring-emerald-200 px-5 py-4 mb-4 flex items-center gap-3">
              <span className="text-lg">🔗</span>
              <p className="text-sm text-emerald-700 font-medium flex-1">
                시뮬레이터 데이터가 자동으로 연결되었습니다.
              </p>
              <Link
                href="/simulator"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition"
              >
                시뮬레이터 →
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 mb-4">
              <p className="text-sm text-slate-500 mb-4">
                시뮬레이터 데이터가 없습니다. 직접 입력하거나{" "}
                <Link href="/simulator" className="text-blue-500 font-semibold hover:underline">
                  시뮬레이터
                </Link>
                를 먼저 실행하세요.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">원가율 (%)</label>
                  <input
                    type="number"
                    placeholder="예: 33"
                    value={manualCogs}
                    onChange={(e) => setManualCogs(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">인건비율 (%)</label>
                  <input
                    type="number"
                    placeholder="예: 25"
                    value={manualLabor}
                    onChange={(e) => setManualLabor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">임대비율 (%)</label>
                  <input
                    type="number"
                    placeholder="예: 12"
                    value={manualRent}
                    onChange={(e) => setManualRent(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">순이익률 (%)</label>
                  <input
                    type="number"
                    placeholder="예: 9"
                    value={manualNet}
                    onChange={(e) => setManualNet(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 비교 지표 카드 */}
          <div className="space-y-4">
            {METRICS.map((metric) => {
              const userVal = userValues[metric.key];
              const benchVal = bench[metric.benchKey];
              const hasData = userVal !== null && Number.isFinite(userVal);

              /* 비교: lowerIsBetter면 유저값 < 벤치가 좋은 것 */
              let isBetter = false;
              if (hasData) {
                isBetter = metric.lowerIsBetter
                  ? userVal! < benchVal
                  : userVal! > benchVal;
              }
              const isSame = hasData && Math.abs(userVal! - benchVal) < 0.5;

              /* 바 최대값 */
              const maxVal = hasData
                ? Math.max(userVal!, benchVal) * 1.3
                : benchVal * 1.5;

              const userPct = hasData ? Math.min((userVal! / maxVal) * 100, 100) : 0;
              const benchPct = Math.min((benchVal / maxVal) * 100, 100);

              const colorUser = !hasData
                ? "#94A3B8"
                : isSame
                  ? "#3182F6"
                  : isBetter
                    ? "#10B981"
                    : "#EF4444";

              const tip = !hasData
                ? "데이터를 입력하면 비교 분석 팁을 드립니다."
                : isSame
                  ? "업종 평균과 비슷한 수준입니다. 꾸준히 유지하세요."
                  : isBetter
                    ? metric.tipBetter
                    : metric.tipWorse;

              return (
                <div
                  key={metric.key}
                  className="rounded-3xl bg-white ring-1 ring-slate-200 p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">{metric.label}</h3>
                    {hasData && (
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{
                          color: colorUser,
                          background: isSame ? "#EBF3FF" : isBetter ? "#ECFDF5" : "#FEF2F2",
                        }}
                      >
                        {isSame ? "평균 수준" : isBetter ? "우수" : "개선 필요"}
                      </span>
                    )}
                  </div>

                  {/* 비교 바 */}
                  <div className="space-y-3 mb-4">
                    {/* 내 매장 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500">내 매장</span>
                        <span className="text-xs font-bold" style={{ color: hasData ? colorUser : "#CBD5E1" }}>
                          {hasData ? `${fmt(userVal!)}%` : "—"}
                        </span>
                      </div>
                      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: hasData ? `${userPct}%` : "0%",
                            background: colorUser,
                          }}
                        />
                      </div>
                    </div>

                    {/* 업종 평균 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500">{industryLabel} 평균</span>
                        <span className="text-xs font-bold text-slate-400">
                          {fmt(benchVal)}%
                        </span>
                      </div>
                      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${benchPct}%`,
                            background: "#CBD5E1",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI 팁 */}
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      <span className="font-bold text-slate-600">💡 AI 팁: </span>
                      {tip}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-8 rounded-3xl bg-slate-900 px-6 py-5 flex items-center gap-4">
            <span className="text-3xl">🚀</span>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">시뮬레이터로 개선 시나리오 확인하기</p>
              <p className="text-slate-400 text-xs mt-0.5">
                원가율, 인건비, 임대료를 조정하면 수익이 어떻게 바뀔까요?
              </p>
            </div>
            <Link
              href="/simulator"
              className="flex-shrink-0 rounded-xl bg-white text-slate-900 text-sm font-bold px-4 py-2 hover:bg-slate-100 transition"
            >
              시뮬레이터 →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
