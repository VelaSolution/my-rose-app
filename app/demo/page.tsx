"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { INDUSTRY_BENCHMARK, sanitizeFullForm, calcResult, fmt, pct } from "@/lib/vela";

const INDUSTRIES = [
  { key: "cafe", icon: "☕", label: "카페" },
  { key: "restaurant", icon: "🍽️", label: "음식점" },
  { key: "bar", icon: "🍺", label: "술집/바" },
  { key: "gogi", icon: "🥩", label: "고깃집" },
  { key: "finedining", icon: "✨", label: "파인다이닝" },
];

const PRESETS: Record<string, Record<string, number>> = {
  cafe: { seats: 20, avgSpend: 7000, turnover: 1.5, cogsRate: 32, rent: 2000000, utilities: 500000 },
  restaurant: { seats: 40, avgSpend: 12000, turnover: 1.8, cogsRate: 35, rent: 3500000, utilities: 800000 },
  bar: { seats: 30, avgSpend: 25000, turnover: 0.8, cogsRate: 28, rent: 4000000, utilities: 600000 },
  gogi: { seats: 50, avgSpend: 30000, turnover: 1.2, cogsRate: 40, rent: 5000000, utilities: 1000000 },
  finedining: { seats: 24, avgSpend: 80000, turnover: 0.7, cogsRate: 38, rent: 8000000, utilities: 1200000 },
};

const FEATURES = [
  { icon: "🎯", title: "수익 시뮬레이터", desc: "좌석·객단가·비용 → 순이익 즉시 계산" },
  { icon: "🧮", title: "메뉴 원가 계산", desc: "재료비 입력 → 메뉴당 마진 분석" },
  { icon: "👥", title: "인건비 관리", desc: "주휴수당·4대보험 포함 실제 인건비" },
  { icon: "💬", title: "AI 리뷰 답변", desc: "배민 리뷰 → AI 맞춤 답변 생성" },
  { icon: "📒", title: "매장 가계부", desc: "수입/지출 기록 → 월간 순이익 추적" },
  { icon: "🏛️", title: "HQ 인트라넷", desc: "출퇴근·보고서·채팅·결재·급여 관리" },
];

export default function DemoPage() {
  const [ind, setInd] = useState("cafe");
  const preset = PRESETS[ind];
  const [seats, setSeats] = useState(preset.seats);
  const [spend, setSpend] = useState(preset.avgSpend);
  const [turn, setTurn] = useState(preset.turnover);
  const [cogs, setCogs] = useState(preset.cogsRate);
  const [apiTab, setApiTab] = useState<"curl" | "node" | "python">("curl");

  const switchIndustry = (key: string) => {
    setInd(key);
    const p = PRESETS[key];
    setSeats(p.seats); setSpend(p.avgSpend); setTurn(p.turnover); setCogs(p.cogsRate);
  };

  const form = useMemo(() => sanitizeFullForm({
    industry: ind, seats, avgSpend: spend, turnover: turn, cogsRate: cogs,
    rent: PRESETS[ind].rent, utilities: PRESETS[ind].utilities,
    weekdayDays: 22, weekendDays: 8, weekendMultiplier: 1.3,
  }), [ind, seats, spend, turn, cogs]);

  const result = useMemo(() => calcResult(form), [form]);
  const bench = INDUSTRY_BENCHMARK[form.industry as keyof typeof INDUSTRY_BENCHMARK];
  const isProfit = result.profit >= 0;

  const metrics = [
    { label: "재료비율", mine: result.cogsRatio, avg: bench.cogsRate, lower: true },
    { label: "인건비율", mine: result.laborRatio, avg: bench.laborRate, lower: true },
    { label: "임대료율", mine: result.rentRatio, avg: bench.rentRate, lower: true },
    { label: "순이익률", mine: result.netMargin, avg: bench.netMargin, lower: false },
  ];

  const apiExamples: Record<string, string> = {
    curl: `curl -X POST https://velaanalytics.com/api/v1/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ industry: ind, seats, avgSpend: spend, turnover: turn, cogsRate: cogs, rent: PRESETS[ind].rent })}'`,
    node: `const res = await fetch("https://velaanalytics.com/api/v1/analyze", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${JSON.stringify({ industry: ind, seats, avgSpend: spend, turnover: turn, cogsRate: cogs, rent: PRESETS[ind].rent }, null, 4)}),
});
const data = await res.json();
console.log(data.summary.netProfit); // ${result.netProfit}`,
    python: `import requests

res = requests.post(
    "https://velaanalytics.com/api/v1/analyze",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json=${JSON.stringify({ industry: ind, seats, avgSpend: spend, turnover: turn, cogsRate: cogs, rent: PRESETS[ind].rent }, null, 8).replace(/^/gm, "    ").trim()},
)
print(res.json()["summary"]["netProfit"])  # ${result.netProfit}`,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-16 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3182F6]/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7C3AED]/10 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-[#3182F6] text-white text-xs font-bold px-4 py-1.5 rounded-full mb-5">
            VELA Analytics Engine
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">매출 데이터 → 경영 인사이트</h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            POS에서 매출 숫자를 보내면, 손익 분석·업종 벤치마크·AI 전략을 JSON으로 반환합니다.<br />
            API 한 줄이면 귀사 POS에 경영 분석 기능이 추가됩니다.
          </p>
          <div className="flex gap-3 justify-center mt-8">
            <a href="#live-demo" className="bg-[#3182F6] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#2672DE] transition shadow-lg shadow-[#3182F6]/30">
              라이브 데모 체험 ↓
            </a>
            <a href="/api/v1/docs" className="bg-white/10 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-white/20 transition ring-1 ring-white/20">
              API 문서 보기
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* 제공 기능 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-xl p-4 ring-1 ring-slate-200">
              <span className="text-2xl">{f.icon}</span>
              <p className="text-sm font-bold text-slate-900 mt-2">{f.title}</p>
              <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* 라이브 데모 */}
        <div id="live-demo">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6 text-center">
            라이브 데모 — 슬라이더를 움직여보세요
          </h2>
        </div>

        {/* 업종 선택 */}
        <div className="flex gap-2 justify-center flex-wrap">
          {INDUSTRIES.map(i => (
            <button key={i.key} onClick={() => switchIndustry(i.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95 ${
                ind === i.key ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
              }`}>
              {i.icon} {i.label}
            </button>
          ))}
        </div>

        {/* 입력 슬라이더 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "좌석", value: seats, set: setSeats, min: 5, max: 100, step: 1, suffix: "석" },
            { label: "객단가", value: spend, set: setSpend, min: 3000, max: 150000, step: 1000, suffix: "원", fmt: true },
            { label: "회전율", value: turn, set: (v: number) => setTurn(v), min: 0.3, max: 5, step: 0.1, suffix: "회" },
            { label: "재료비율", value: cogs, set: setCogs, min: 15, max: 60, step: 1, suffix: "%" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 ring-1 ring-slate-200">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-500 font-semibold">{s.label}</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {s.fmt ? fmt(s.value) : typeof s.value === "number" && s.value % 1 !== 0 ? s.value.toFixed(1) : s.value}{s.suffix}
                </span>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                onChange={e => s.set(Number(e.target.value))} className="w-full accent-[#3182F6]" />
            </div>
          ))}
        </div>

        {/* 핵심 결과 */}
        <div className={`rounded-2xl p-8 text-center relative overflow-hidden ${isProfit ? "bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200" : "bg-gradient-to-br from-red-50 to-orange-50 ring-1 ring-red-200"}`}>
          <p className="text-sm text-slate-500 mb-2">월세·재료비·인건비 다 빼고 남는 돈</p>
          <p className={`text-5xl font-extrabold tracking-tight ${isProfit ? "text-emerald-700" : "text-red-600"}`}>
            {isProfit ? "+" : ""}{fmt(result.netProfit)}원
          </p>
          <div className="flex justify-center gap-8 mt-5 text-sm flex-wrap">
            <div><span className="text-slate-400">월 매출</span><br /><b className="text-lg text-slate-900">{fmt(result.totalSales)}원</b></div>
            <div><span className="text-slate-400">순이익률</span><br /><b className={`text-lg ${isProfit ? "text-emerald-600" : "text-red-500"}`}>{pct(result.netMargin)}</b></div>
            <div><span className="text-slate-400">최소 매출</span><br /><b className="text-lg text-slate-900">{fmt(result.bep)}원</b></div>
            <div><span className="text-slate-400">경영 점수</span><br /><b className="text-lg text-[#3182F6]">{result.netMargin >= 15 ? "A" : result.netMargin >= 10 ? "B+" : result.netMargin >= 5 ? "B" : result.netMargin >= 0 ? "C" : "F"}</b></div>
          </div>
        </div>

        {/* 2열: 비용구조 + 벤치마크 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 비용 구조 */}
          <div className="bg-white rounded-2xl p-6 ring-1 ring-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4">비용 구조 분석</h2>
            <div className="space-y-3">
              {[
                { label: "재료비", value: result.cogs, ratio: result.cogsRatio, color: "#EF4444" },
                { label: "인건비", value: result.laborCost, ratio: result.laborRatio, color: "#F59E0B" },
                { label: "임대료", value: form.rent, ratio: result.rentRatio, color: "#3B82F6" },
                { label: "공과금", value: form.utilities + form.telecom, ratio: (form.utilities + form.telecom) / result.totalSales * 100, color: "#8B5CF6" },
              ].map(c => (
                <div key={c.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 font-medium">{c.label}</span>
                    <span className="font-semibold text-slate-900">{fmt(c.value)}원 <span className="text-slate-400 text-xs">({c.ratio.toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(c.ratio * 2, 100)}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 업종 벤치마크 */}
          <div className="bg-white rounded-2xl p-6 ring-1 ring-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4">업종 평균 비교</h2>
            <div className="space-y-4">
              {metrics.map(m => {
                const diff = m.mine - m.avg;
                const good = m.lower ? diff <= 0 : diff >= 0;
                return (
                  <div key={m.label} className="flex items-center gap-4">
                    <span className="text-sm text-slate-600 w-20 flex-shrink-0">{m.label}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900">{pct(m.mine)}</span>
                        <span className="text-slate-400">평균 {pct(m.avg)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${good ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${Math.min(Math.abs(m.mine), 100)}%` }} />
                      </div>
                    </div>
                    <span className={`text-xs font-bold w-14 text-right ${good ? "text-emerald-600" : "text-red-500"}`}>
                      {diff > 0 ? "+" : ""}{pct(diff)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* API 연동 */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold mb-2">이 분석을 귀사 POS에 연동하세요</h2>
            <p className="text-slate-400">API 한 줄이면 위 결과를 JSON으로 받을 수 있습니다</p>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mb-3">
            {(["curl", "node", "python"] as const).map(t => (
              <button key={t} onClick={() => setApiTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${apiTab === t ? "bg-[#3182F6] text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                {t === "curl" ? "cURL" : t === "node" ? "Node.js" : "Python"}
              </button>
            ))}
          </div>
          <pre className="bg-slate-800 rounded-xl p-5 text-sm text-slate-300 overflow-x-auto leading-relaxed mb-6">
            {apiExamples[apiTab]}
          </pre>

          <div className="bg-slate-800 rounded-xl p-5 mb-6">
            <p className="text-xs text-slate-500 mb-2 font-semibold">응답 (JSON)</p>
            <pre className="text-sm text-emerald-400 overflow-x-auto">{JSON.stringify({
              summary: { totalSales: result.totalSales, netProfit: result.netProfit, netMargin: Number(result.netMargin.toFixed(1)), isProfit },
              costs: { cogs: result.cogs, cogsRatio: Number(result.cogsRatio.toFixed(1)), laborCost: result.laborCost, rent: form.rent },
              breakeven: { bep: result.bep, achieved: result.totalSales >= result.bep },
              analysis: { score: result.netMargin >= 15 ? 90 : result.netMargin >= 10 ? 78 : result.netMargin >= 5 ? 60 : 40, grade: result.netMargin >= 15 ? "A" : result.netMargin >= 10 ? "B+" : result.netMargin >= 5 ? "B" : "C" },
            }, null, 2)}</pre>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/api/v1/docs" className="bg-[#3182F6] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#2672DE] transition shadow-lg shadow-[#3182F6]/30">
              API 문서 보기
            </a>
            <a href="mailto:mnhyuk@velaanalytics.com" className="bg-white text-slate-900 px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-100 transition">
              파트너십 문의
            </a>
            <a href="/payhere-proposal.md" target="_blank" className="bg-white/10 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-white/20 transition ring-1 ring-white/20">
              제안서 보기
            </a>
          </div>
        </div>

        {/* 기술 스펙 */}
        <div className="bg-white rounded-2xl p-6 ring-1 ring-slate-200">
          <h2 className="text-base font-bold text-slate-900 mb-4">기술 스펙</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "응답 시간", value: "<200ms" },
              { label: "Rate Limit", value: "100 req/min" },
              { label: "업종 지원", value: "5개" },
              { label: "가동률", value: "99.9%" },
            ].map(s => (
              <div key={s.label} className="py-3">
                <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 CTA */}
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm mb-4">직접 서비스를 사용해보세요</p>
          <div className="flex gap-3 justify-center">
            <Link href="/simulator" className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition">
              시뮬레이터 체험 →
            </Link>
            <Link href="/tools" className="bg-white text-slate-700 px-6 py-3 rounded-xl text-sm font-bold ring-1 ring-slate-200 hover:ring-slate-300 transition">
              도구 둘러보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
