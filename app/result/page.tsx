"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import { usePlan } from "@/lib/usePlan";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  INDUSTRY_CONFIG, INDUSTRY_BENCHMARK, sanitizeFullForm, calcResult, calcSimulation,
  calcStrategies, calcAnalysis, saveHistory,
  fmt, pct,
  type FullForm,
} from "@/lib/vela";
import VelaChat from "@/components/VelaChat";
import KakaoShare from "@/components/KakaoShare";
import EventBanner from "@/components/EventBanner";

// ─── 분리된 서브 컴포넌트 임포트 ─────────────────────────────────
import { SummaryCard, InfoBox, AnalysisCard, TagBadge } from "./components/ResultCards";
import AIBriefingSection from "./components/AIBriefingSection";
import AIStrategySection from "./components/AIStrategySection";
import HistorySection from "./components/HistorySection";
import SensitivitySection from "./components/SensitivitySection";
import ScenarioCompareSection from "./components/ScenarioCompareSection";
import StrategyGuideSection from "./components/StrategyGuideSection";

const CHART_COLORS = ["#3182F6", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4"];

// ─── 결과 컨텐츠 ───────────────────────────────────────────────
function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareMemo, setShareMemo] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [showCloudSave, setShowCloudSave] = useState(false);
  const [cloudSaveTitle, setCloudSaveTitle] = useState("");
  const [cloudSaving, setCloudSaving] = useState(false);
  const autoSavedRef = React.useRef(false);
  const { plan } = usePlan();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => setUserId(data.user?.id ?? null));
  }, []);

  const form = useMemo<FullForm>(() => {
    const raw: Record<string, unknown> = {};
    searchParams.forEach((v, k) => { raw[k] = v; });
    return sanitizeFullForm(raw);
  }, [searchParams]);

  const result = useMemo(() => calcResult(form), [form]);
  const simulation = useMemo(() => calcSimulation(form), [form]);
  const strategies = useMemo(() => calcStrategies(form, result.profit), [form, result.profit]);
  const analysis = useMemo(() => calcAnalysis(form, result), [form, result]);
  const config = INDUSTRY_CONFIG[form.industry];
  const isProfit = result.profit >= 0;

  useEffect(() => { saveHistory(form, result); }, [form, result]);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // 자동 클라우드 저장 (로그인 시 시뮬레이션 실행마다 자동 저장)
  const FREE_HISTORY_LIMIT = 3;
  useEffect(() => {
    if (!userId || autoSavedRef.current) return;
    autoSavedRef.current = true;
    const supabase = createSupabaseBrowserClient();

    if (plan === "free") {
      supabase.from("simulation_history").select("id").eq("user_id", userId)
        .then(({ data: rows }: { data: { id: string }[] | null }) => {
          if ((rows?.length ?? 0) >= FREE_HISTORY_LIMIT) return;
          const now = new Date();
          const label = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} (자동저장)`;
          supabase.from("simulation_history").insert({
            user_id: userId, label, form,
            result: { totalSales: result.totalSales, profit: result.profit, netProfit: result.netProfit, netMargin: result.netMargin, bep: result.bep, recoveryMonthsActual: result.recoveryMonthsActual, cogsRate: form.cogsRate, laborRate: result.laborCost > 0 ? Math.round((result.laborCost / result.totalSales) * 100) : 0 },
          }).then(() => {});
        });
    } else {
      const now = new Date();
      const label = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} (자동저장)`;
      supabase.from("simulation_history").insert({
        user_id: userId, label, form,
        result: { totalSales: result.totalSales, profit: result.profit, netProfit: result.netProfit, netMargin: result.netMargin, bep: result.bep, recoveryMonthsActual: result.recoveryMonthsActual, cogsRate: form.cogsRate, laborRate: result.laborCost > 0 ? Math.round((result.laborCost / result.totalSales) * 100) : 0 },
      }).then(() => {});
    }
  }, [userId, form, result, plan]);

  const saveToCloud = async (title?: string) => {
    if (!userId) { router.push("/login"); return; }
    const supabase = createSupabaseBrowserClient();
    const now = new Date();
    const label = title || `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const { error } = await supabase.from("simulation_history").insert({
      user_id: userId, label, form,
      result: { totalSales: result.totalSales, profit: result.profit, netProfit: result.netProfit, netMargin: result.netMargin, bep: result.bep, recoveryMonthsActual: result.recoveryMonthsActual },
    });
    if (error) { setSaveMsg("저장 실패. 다시 시도해주세요."); return; }
    setSaveMsg(`'${label}' 저장 완료 ✓`);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleCloudSaveSubmit = async () => {
    if (!cloudSaveTitle.trim()) return;
    setCloudSaving(true);
    await saveToCloud(cloudSaveTitle.trim());
    setCloudSaving(false);
    setShowCloudSave(false);
    setCloudSaveTitle("");
  };

  // 커뮤니티 공유
  const shareToComm = async () => {
    if (!userId) { router.push("/login"); return; }
    if (!shareTitle.trim()) { setShareMsg("제목을 입력해주세요."); setTimeout(() => setShareMsg(""), 3000); return; }
    setSharing(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const nick = user?.user_metadata?.nickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "익명 사장님";
    const { error } = await supabase.from("simulation_shares").insert({
      user_id: userId,
      nickname: nick,
      industry: form.industry,
      title: shareTitle.trim(),
      total_sales: Math.round(result.totalSales),
      profit: Math.round(result.profit),
      net_profit: Math.round(result.netProfit),
      net_margin: Math.round(result.netMargin),
      cogs_ratio: Math.round(form.cogsRate),
      labor_ratio: result.laborCost > 0 ? Math.round((result.laborCost / result.totalSales) * 100) : 0,
      bep: Math.round(result.bep),
      memo: shareMemo.trim(),
    });
    setSharing(false);
    if (error) { setShareMsg("공유 실패: " + error.message); setTimeout(() => setShareMsg(""), 4000); return; }
    setShareMsg("커뮤니티에 공유됐어요! 🎉");
    setShowShareModal(false);
    setShareTitle(""); setShareMemo("");
    setTimeout(() => setShareMsg(""), 4000);
  };

  const pieData = useMemo(() => {
    const base = [
      { name: "원가", value: result.cogs },
      { name: "인건비", value: result.laborCost },
      { name: "임대료", value: form.rent },
      { name: "공과금+통신", value: form.utilities + form.telecom },
      { name: "마케팅+기타", value: form.marketing + form.supplies + form.maintenance + form.etc },
    ];
    if (isProfit) base.push({ name: "순이익", value: result.profit });
    return base;
  }, [result, form, isProfit]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 print:bg-white">

      <main className="px-4 py-6 md:px-8 print:px-0">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* 히어로 — 핵심 숫자 먼저 */}
        <section className={`rounded-3xl p-6 shadow-sm ring-1 print:rounded-none print:shadow-none ${isProfit ? "bg-gradient-to-br from-emerald-50 to-white ring-emerald-200" : "bg-gradient-to-br from-red-50 to-white ring-red-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">{config.label}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isProfit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {isProfit ? "흑자" : "적자"}
            </span>
          </div>

          {/* 핵심 3개 숫자 */}
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-1">세후 실수령</p>
            <p className={`text-3xl font-extrabold tracking-tight ${result.netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {result.netProfit >= 0 ? "+" : ""}{fmt(result.netProfit)}<span className="text-lg font-bold text-slate-400 ml-0.5">원</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-white/80 px-3 py-2.5">
              <p className="text-xs text-slate-400">월매출</p>
              <p className="text-lg font-bold text-slate-900">{fmt(result.totalSales)}<span className="text-xs text-slate-400 ml-0.5">원</span></p>
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-2.5">
              <p className="text-xs text-slate-400">순이익률</p>
              <p className={`text-lg font-bold ${isProfit ? "text-emerald-600" : "text-red-500"}`}>{pct(result.netMargin)}</p>
            </div>
          </div>

          {/* 액션 버튼 — 접을 수 있게 */}
          <details className="print:hidden">
            <summary className="text-xs font-semibold text-slate-400 cursor-pointer py-1">저장 · 공유 · 내보내기 ▾</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => router.push("/simulator")} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">← 다시 입력</button>
              <button onClick={() => window.print()} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">PDF 저장</button>
              <button onClick={() => navigator.clipboard.writeText(window.location.href).then(() => setSaveMsg("링크 복사됨!")).catch(console.error)} className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white">링크 복사</button>
              <KakaoShare title={`[VELA] ${config.label} 수익 분석`} description={`월매출 ${fmt(result.totalSales)}원 / 순이익 ${fmt(result.netProfit)}원 (순이익률 ${pct(result.netMargin)})`} buttonText="카카오 공유" className="w-full rounded-xl bg-yellow-400 py-2.5 text-xs font-semibold text-slate-900" />
              <button onClick={() => { if (!userId) { router.push("/login"); return; } setShareTitle(`${config.label} 분석 결과 공유`); setShowShareModal(true); }} className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white">
                커뮤니티 공유
              </button>
              <button onClick={() => { const params = new URLSearchParams({ store: form.storeName || config.label, industry: config.label, sales: String(result.totalSales), profit: String(result.netProfit), margin: String(result.netMargin), rank: String(Math.max(5, Math.min(95, Math.round(50 - result.netMargin * 2)))) }); window.open(`/api/report-card?${params}`, "_blank"); }} className="w-full rounded-xl bg-violet-600 py-2.5 text-xs font-semibold text-white">
                성적표
              </button>
              <button onClick={() => { if (!userId) { router.push("/login"); return; } setCloudSaveTitle(""); setShowCloudSave(true); }} className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white">
                {userId ? "클라우드 저장" : "로그인 후 저장"}
              </button>
              {userId && (
                <button onClick={() => router.push("/profile")} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600">
                  대시보드 →
                </button>
              )}
            </div>
          </details>
          {(saveMsg || shareMsg) && (
            <div className="mt-2 print:hidden">
              {saveMsg && <span className="text-sm font-medium text-emerald-600">{saveMsg}</span>}
              {shareMsg && <span className="ml-2 text-sm font-medium text-emerald-600">{shareMsg}</span>}
            </div>
          )}

          {/* 이벤트 배너 */}
          <div className="mt-6 print:hidden">
            <EventBanner />
          </div>

          {/* 클라우드 저장 모달 */}
          {showCloudSave && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowCloudSave(false)}>
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold text-slate-900">☁️ 클라우드에 저장</h3>
                <p className="text-xs text-slate-400">나중에 불러올 수 있도록 제목을 입력해주세요.</p>
                <input
                  value={cloudSaveTitle}
                  onChange={e => setCloudSaveTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCloudSaveSubmit(); }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  placeholder="예: 홍대 카페 2026년 4월"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowCloudSave(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
                  <button onClick={handleCloudSaveSubmit} disabled={!cloudSaveTitle.trim() || cloudSaving}
                    className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                    {cloudSaving ? "저장 중..." : "저장하기"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 커뮤니티 공유 모달 */}
          {showShareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowShareModal(false)}>
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">커뮤니티에 공유하기</h3>
                    <p className="text-xs text-slate-400 mt-1">분석 결과를 사장님 커뮤니티에 공유하세요</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{config.icon} {config.label}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">게시글 제목 (수정 가능)</label>
                    <input value={shareTitle} onChange={e => setShareTitle(e.target.value)} placeholder="제목을 입력하세요"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3">
                    {[
                      { l: "월 총 매출", v: `${result.totalSales.toLocaleString()}원` },
                      { l: "세후 순이익", v: `${result.netProfit.toLocaleString()}원`, c: result.netProfit >= 0 ? "text-emerald-600" : "text-red-500" },
                      { l: "순이익률", v: `${result.netMargin.toFixed(1)}%` },
                      { l: "원가율", v: `${form.cogsRate}%` },
                    ].map(s => (
                      <div key={s.l}>
                        <p className="text-xs text-slate-400">{s.l}</p>
                        <p className={`text-sm font-bold ${s.c ?? "text-slate-800"}`}>{s.v}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">한 마디 (선택)</label>
                    <textarea value={shareMemo} onChange={e => setShareMemo(e.target.value)} placeholder="요즘 어떤가요? 한 마디 남겨보세요 (선택)"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 resize-none h-16" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowShareModal(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
                  <button onClick={shareToComm} disabled={sharing || !shareTitle.trim()} className="flex-2 flex-grow-[2] rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                    {sharing ? "공유 중..." : "👥 공유하기"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 핵심 요약 -- 6개 */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard title="월 총 매출" value={`${fmt(result.totalSales)}원`} sub={`홀 ${fmt(result.hallSales)} · 배달 ${fmt(result.deliveryNetSales)}`} />
          <SummaryCard title="세전 순이익" value={`${fmt(result.profit)}원`} sub={`순이익률 ${pct(result.netMargin)}`} highlight={isProfit ? "good" : "bad"} />
          <SummaryCard title="세후 실수령" value={`${fmt(result.netProfit)}원`} sub={`세금 ${fmt(result.incomeTax + result.vatBurden)}원 차감`} highlight={result.netProfit >= 0 ? "good" : "bad"} />
          <SummaryCard title="현금흐름" value={`${fmt(result.cashFlow)}원`} sub={form.loanEnabled ? `대출 상환 ${fmt(result.monthlyLoanPayment)}원 차감` : "대출 없음"} highlight={result.cashFlow >= 0 ? "good" : "bad"} />
          <SummaryCard title="손익분기점" value={`${fmt(result.bep)}원`} sub={result.bepGap >= 0 ? `${fmt(result.bepGap)}원 초과` : `${fmt(Math.abs(result.bepGap))}원 부족`} highlight={result.bepGap >= 0 ? "good" : "bad"} />
          <SummaryCard title="투자금 회수" value={result.recoveryMonthsActual === 999 ? "불가" : `${result.recoveryMonthsActual}개월`}
            sub={`목표 ${form.recoveryMonths}개월`} highlight={result.recoveryMonthsActual <= form.recoveryMonths ? "good" : result.recoveryMonthsActual === 999 ? "bad" : "info"} />
        </section>

        {/* 손익분기 D-day */}
        {result.bepGap < 0 && (
          <section className="rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 p-6 ring-1 ring-amber-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-amber-900">손익분기 달성까지</h2>
                <p className="text-sm text-amber-700 mt-1">
                  월 매출을 <span className="font-bold">{fmt(Math.abs(result.bepGap))}원</span> 더 올려야 합니다
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  {(() => {
                    const gap = Math.abs(result.bepGap);
                    const dailyExtra = Math.ceil(gap / ((form.weekdayDays + form.weekendDays) * 4.3));
                    const extraCustomers = Math.ceil(dailyExtra / form.avgSpend);
                    return `일 평균 ${fmt(dailyExtra)}원 추가 매출 필요 (고객 약 ${extraCustomers}명)`;
                  })()}
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-amber-600">
                  D-{(() => {
                    const monthlyGap = Math.abs(result.bepGap);
                    const trend = result.totalSales * 0.03;
                    if (trend <= 0) return "∞";
                    return Math.ceil(monthlyGap / trend);
                  })()}
                </div>
                <p className="text-xs text-amber-500 mt-1">월 3% 성장 가정</p>
              </div>
            </div>
          </section>
        )}

        {/* 업종 평균 벤치마크 */}
        {(() => {
          const bench = INDUSTRY_BENCHMARK[form.industry];
          const metrics = [
            { label: "원가율", mine: result.cogsRatio, avg: bench.cogsRate, lowerBetter: true },
            { label: "인건비율", mine: result.laborRatio, avg: bench.laborRate, lowerBetter: true },
            { label: "임대료율", mine: result.rentRatio, avg: bench.rentRate, lowerBetter: true },
            { label: "순이익률", mine: result.netMargin, avg: bench.netMargin, lowerBetter: false },
          ];
          return (
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">업종 평균 비교</h2>
                  <p className="mt-1 text-sm text-slate-500">{config.label} 업종 평균과 내 매장을 비교합니다.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{config.label} 평균</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map(({ label, mine, avg, lowerBetter }) => {
                  const diff = mine - avg;
                  const good = lowerBetter ? diff <= 0 : diff >= 0;
                  const color = good ? "text-emerald-600" : "text-red-500";
                  const barColor = good ? "#10b981" : "#ef4444";
                  const maxVal = Math.max(mine, avg) * 1.3;
                  return (
                    <div key={label} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-2xl font-bold text-slate-900">{pct(mine)}</span>
                        <span className={`mb-0.5 text-xs font-semibold ${color}`}>
                          {diff > 0 ? "+" : ""}{pct(diff)}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <div>
                          <div className="mb-0.5 flex justify-between text-[11px] text-slate-400">
                            <span>내 매장</span><span>{pct(mine)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(mine / maxVal * 100, 100)}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                        <div>
                          <div className="mb-0.5 flex justify-between text-[11px] text-slate-400">
                            <span>업종 평균</span><span>{pct(avg)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200">
                            <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${Math.min(avg / maxVal * 100, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* 비용 구조 차트 */}
        {(() => {
          const breakdown = result.costBreakdown ?? {
            labor: result.laborCost + result.insuranceCost,
            cogs: result.cogs,
            rent: form.rent,
            utilities: form.utilities + form.telecom,
            cardFee: result.cardFee,
            royalty: 0,
            marketing: form.marketing,
            other: form.supplies + form.maintenance + form.etc,
          };
          const items = [
            { name: "인건비", value: breakdown.labor, color: "#3182F6" },
            { name: "원가", value: breakdown.cogs, color: "#7C3AED" },
            { name: "임대료", value: breakdown.rent, color: "#10B981" },
            { name: "공과금·통신", value: breakdown.utilities, color: "#F59E0B" },
            { name: "카드수수료", value: breakdown.cardFee, color: "#EF4444" },
            { name: "마케팅", value: breakdown.marketing, color: "#EC4899" },
            { name: "기타", value: breakdown.other, color: "#06B6D4" },
          ].filter(i => i.value > 0);
          const total = items.reduce((s, i) => s + i.value, 0);
          return (
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-1 text-xl font-bold text-slate-900">비용 구조</h2>
              <p className="mb-5 text-sm text-slate-500">월 총 비용 {fmt(total)}원의 구성</p>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                {/* 파이차트 */}
                <div className="flex-shrink-0 mx-auto lg:mx-0" style={{ width: 200, height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={items} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {items.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${fmt(Number(v ?? 0))}원`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {items.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-semibold">{fmt(item.value)}원 ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* 민감도 슬라이더 */}
        <SensitivitySection form={form} result={result} />

        {/* A vs B 시나리오 비교 */}
        <ScenarioCompareSection form={form} />

        {/* 운영 진단 */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">운영 진단</h2>
            <p className="mt-1 text-sm text-slate-500">{config.label} 기준으로 해당하는 문제를 모두 표시합니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analysis.map((item) => <AnalysisCard key={item.title} title={item.title} body={item.body} tone={item.tone} />)}
          </div>
        </section>

        {/* AI 브리핑 */}
        <AIBriefingSection form={form} result={result} plan={plan} />

        {/* 비용 상세 + 추천 전략 */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">비용 상세</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoBox title="인건비 (4대보험 포함)" value={`${fmt(result.laborCost + result.insuranceCost)}원`} sub={`비율 ${pct(result.laborRatio)}`} tone={result.laborRatio < config.laborWarnRate ? "good" : "bad"} />
              {form.industry === "cafe" ? (
                <InfoBox title="식자재 원가" value={`${fmt(result.cogs)}원`} sub={`원가율 ${pct(result.cogsRatio)}`} tone={form.cogsRate < config.cogsWarnRate ? "good" : "bad"} />
              ) : (
                <>
                  <InfoBox title="식자재 원가" value={`${fmt(result.foodCogs)}원`} sub={`식자재 원가율 ${form.cogsRate}% (식사 매출의 ${100 - form.alcoholSalesRatio}%)`} />
                  <InfoBox title="주류 원가" value={`${fmt(result.alcoholCogs)}원`} sub={`주류 원가율 ${form.alcoholCogsRate}% (주류 매출의 ${form.alcoholSalesRatio}%)`} />
                  <InfoBox title="통합 원가율" value={pct(result.cogsRatio)} sub={`식자재 + 주류 합산`} tone={result.cogsRatio < config.cogsWarnRate ? "good" : "bad"} />
                </>
              )}
              <InfoBox title="임대 & 시설" value={`${fmt(form.rent + form.utilities + form.telecom + form.maintenance)}원`} />
              <InfoBox title="마케팅 & 기타" value={`${fmt(form.marketing + form.supplies + form.etc)}원`} />
              <InfoBox title="카드 수수료" value={`${fmt(result.cardFee)}원`} sub={`${form.cardFeeRate}% 적용`} />
              <InfoBox title="소득세 + 부가세" value={`${fmt(result.incomeTax + result.vatBurden)}원`} sub={`세율 ${form.incomeTaxRate}% ${form.vatEnabled ? "+ 부가세" : ""}`} />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">추천 전략</h2>
            <p className="mt-1 text-sm text-slate-500">단일·복합 시나리오 순이익 개선 효과 순입니다.</p>
            <div className="mt-5 space-y-3">
              {strategies.map((item, index) => (
                <div key={item.label} className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${index === 0 ? "bg-slate-900" : "bg-slate-400"}`}>{index + 1}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <div className="mt-1 flex flex-wrap gap-1">{item.tags.map((t) => <TagBadge key={t} label={t} />)}</div>
                      <p className="mt-1 text-xs text-slate-500">세후 {fmt(item.netProfit)}원 · 현금흐름 {fmt(item.cashFlow)}원</p>
                    </div>
                  </div>
                  <div className="ml-2 shrink-0 text-sm font-semibold text-emerald-600">+{fmt(item.diff)}원</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI 추천 전략 */}
        <AIStrategySection form={form} result={result} strategies={strategies} plan={plan} />

        {/* 초기비용 & 부채 현황 */}
        {result.totalInitialCost > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">초기비용 & 투자 회수 현황</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoBox title="총 초기 투자비" value={`${fmt(result.totalInitialCost)}원`} sub="보증금 포함" />
              <InfoBox title="실질 투자금" value={`${fmt(result.totalInitialCost - form.deposit)}원`} sub="보증금 제외" />
              <InfoBox title="월 현금흐름" value={`${fmt(result.cashFlow)}원`} sub="세후 - 대출상환" tone={result.cashFlow >= 0 ? "good" : "bad"} />
              <InfoBox title="예상 회수 기간" value={result.recoveryMonthsActual === 999 ? "회수 불가" : `${result.recoveryMonthsActual}개월`}
                sub={`목표 ${form.recoveryMonths}개월`} tone={result.recoveryMonthsActual <= form.recoveryMonths ? "good" : "bad"} />
            </div>
            <div className="mt-5 space-y-2">
              {[
                { label: "보증금", value: form.deposit, note: "퇴거 시 반환" },
                { label: "권리금", value: form.premiumKey, note: "회수 불가" },
                { label: "인테리어", value: form.interior, note: "회수 불가" },
                { label: "주방기기 & 집기", value: form.equipment, note: "중고 처분 일부 회수 가능" },
                { label: "간판 & 홍보물", value: form.signage, note: "회수 불가" },
                { label: "기타 초기비용", value: form.otherSetup, note: "" },
              ].filter((i) => i.value > 0).map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    {item.note && <span className="ml-2 text-xs text-slate-400">{item.note}</span>}
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{fmt(item.value)}원</span>
                </div>
              ))}
            </div>
            {form.loanEnabled && (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-900">부채 현황</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div><p className="text-xs text-amber-700">대출 원금</p><p className="font-bold text-amber-900">{fmt(form.loanAmount)}원</p></div>
                  <div><p className="text-xs text-amber-700">월 상환액</p><p className="font-bold text-amber-900">{fmt(result.monthlyLoanPayment)}원</p></div>
                  <div><p className="text-xs text-amber-700">상환 기간</p><p className="font-bold text-amber-900">{form.loanTermMonths}개월</p></div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 차트 */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">매출 대비 구성비</h2>
            {!isProfit && <p className="mb-2 text-xs text-red-500">적자 상태로 순이익 슬라이스는 표시되지 않습니다.</p>}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3}>
                    {pieData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `${fmt(Number(value ?? 0))}원`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-1">객단가 변화 시뮬레이션</h2>
            <p className="mb-4 text-sm text-slate-500">{config.label} 기준 +{Math.round(config.simPctMin * 100)}%~+{Math.round(config.simPctMax * 100)}% 범위</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={simulation}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 10000)}만`} />
                  <Tooltip formatter={(value, name) => [`${fmt(Number(value ?? 0))}원`, String(name)]} />
                  <Bar dataKey="profit" name="세전순이익" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="netProfit" name="세후실수령" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="cashFlow" name="현금흐름" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 월별 히스토리 */}
        <HistorySection />

        {/* 전략 가이드 */}
        <StrategyGuideSection form={form} result={result} />

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 print:hidden">
          <button onClick={() => router.push("/simulator")} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">← 수치 다시 입력하기</button>
        </section>
      </div>

      {/* 플로팅 AI 채팅 */}
      <VelaChat context={{ form: form as unknown as Record<string, unknown>, result: result as unknown as Record<string, unknown> }} />
    </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">결과를 불러오는 중...</p></main>}>
      <ResultContent />
    </Suspense>
  );
}
