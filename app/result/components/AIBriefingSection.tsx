"use client";

import { useState } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import {
  INDUSTRY_CONFIG, calcResult, fmt, pct,
  type FullForm,
} from "@/lib/vela";

type Briefing = { currentStatus: string; mainIssue: string; topAction: string; actionHint: string };

const BRIEFING_KEY = "vela-briefing-usage";
const FREE_BRIEFING_LIMIT = 3;

function getBriefingUsage(): { count: number; month: string } {
  if (typeof window === "undefined") return { count: 0, month: "" };
  try {
    const raw = localStorage.getItem(BRIEFING_KEY);
    if (!raw) return { count: 0, month: "" };
    return JSON.parse(raw);
  } catch { return { count: 0, month: "" }; }
}

function incrementBriefingUsage() {
  const now = new Date();
  const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const usage = getBriefingUsage();
  const count = usage.month === month ? usage.count + 1 : 1;
  localStorage.setItem(BRIEFING_KEY, JSON.stringify({ count, month }));
}

export default function AIBriefingSection({ form, result, plan }: { form: FullForm; result: ReturnType<typeof calcResult>; plan: string }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const usage = getBriefingUsage();
  const usedThisMonth = usage.month === currentMonth ? usage.count : 0;
  const isLimited = plan === "free" && usedThisMonth >= FREE_BRIEFING_LIMIT;
  const remaining = FREE_BRIEFING_LIMIT - usedThisMonth;

  const fetchBriefing = async () => {
    if (isLimited) { setShowUpgrade(true); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ form, result }) });
      if (!res.ok) throw new Error("API 오류");
      setBriefing(await res.json());
      if (plan === "free") incrementBriefingUsage();
    } catch (e) { setError("AI 분석 중 오류가 발생했습니다. 다시 시도해주세요."); console.error(e); }
    finally { setLoading(false); }
  };

  const config = INDUSTRY_CONFIG[form.industry];

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">AI 브리핑</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            현재 수치를 기반으로 AI가 실시간 경영 조언을 생성합니다.
            {plan === "free" && <span className="ml-2 text-blue-500 font-semibold">(월 {remaining > 0 ? `${remaining}회 남음` : "한도 소진"})</span>}
          </p>
        </div>
        <div className="rounded-full bg-slate-900 dark:bg-slate-200 px-3 py-1 text-xs font-semibold text-white dark:text-slate-900">VELA AI</div>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="AI 브리핑 한도를 다 사용했어요"
        description="무료 플랜은 월 10회까지 AI 브리핑을 생성할 수 있어요. 스탠다드 플랜으로 업그레이드하면 무제한으로 이용 가능합니다."
      />
      {isLimited && !briefing && (
        <button onClick={() => setShowUpgrade(true)} className="w-full rounded-2xl bg-slate-100 dark:bg-slate-700 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-600">
          이번 달 무료 한도 소진 · 업그레이드하기
        </button>
      )}
      {!isLimited && !briefing && !loading && (
        <button onClick={fetchBriefing} className="w-full rounded-2xl bg-slate-900 dark:bg-slate-200 py-4 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-700 dark:hover:bg-slate-300">AI 브리핑 생성하기</button>
      )}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {["현재 상태", "핵심 문제", "최우선 전략", "실행 힌트"].map((t) => (
            <div key={t} className="rounded-3xl bg-slate-50 dark:bg-slate-700 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t}</p>
              <div className="mt-2 space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className={`h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-600 ${i === 2 ? "w-4/5" : i === 3 ? "w-3/5" : "w-full"}`} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}<button onClick={fetchBriefing} className="ml-3 underline">다시 시도</button></div>}
      {briefing && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {[{ title: "현재 상태", body: briefing.currentStatus }, { title: "핵심 문제", body: briefing.mainIssue }, { title: "최우선 전략", body: briefing.topAction }, { title: "실행 힌트", body: briefing.actionHint }].map(({ title, body }) => (
              <div key={title} className="rounded-3xl bg-slate-50 dark:bg-slate-700 p-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={fetchBriefing} className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-600 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">다시 생성하기</button>
            <button onClick={() => {
              const w = window.open("", "_blank");
              if (!w) return;
              w.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>VELA AI 브리핑 리포트</title>
              <style>
                body{font-family:'Apple SD Gothic Neo',sans-serif;max-width:700px;margin:40px auto;padding:0 24px;color:#333}
                h1{font-size:22px;color:#3182F6;margin-bottom:4px}
                .sub{color:#888;font-size:13px;margin-bottom:32px}
                .card{background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:16px}
                .card h3{font-size:14px;font-weight:700;margin:0 0 8px;color:#1e293b}
                .card p{font-size:13px;line-height:1.7;margin:0;color:#475569}
                .summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
                .stat{background:#f1f5f9;border-radius:8px;padding:12px;text-align:center}
                .stat .label{font-size:11px;color:#94a3b8}
                .stat .value{font-size:16px;font-weight:700;margin-top:4px}
                .footer{text-align:center;margin-top:40px;color:#aaa;font-size:11px}
                @media print{body{margin:20px}}
              </style></head><body>
              <h1>VELA AI 브리핑 리포트</h1>
              <p class="sub">${config.label} · ${new Date().toLocaleDateString("ko-KR")} 생성</p>
              <div class="summary">
                <div class="stat"><div class="label">월 매출</div><div class="value">${fmt(result.totalSales)}원</div></div>
                <div class="stat"><div class="label">순이익</div><div class="value">${fmt(result.netProfit)}원</div></div>
                <div class="stat"><div class="label">순이익률</div><div class="value">${pct(result.netMargin)}</div></div>
              </div>
              ${[{t:"현재 상태",b:briefing.currentStatus},{t:"핵심 문제",b:briefing.mainIssue},{t:"최우선 전략",b:briefing.topAction},{t:"실행 힌트",b:briefing.actionHint}]
                .map(({t,b})=>`<div class="card"><h3>${t.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</h3><p>${(b||"").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p></div>`).join("")}
              <p class="footer">VELA — velaanalytics.com</p>
              </body></html>`);
              w.document.close();
              setTimeout(() => w.print(), 300);
            }} className="rounded-2xl bg-slate-900 dark:bg-slate-200 px-5 py-3 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-300">PDF 저장</button>
          </div>
        </>
      )}
    </section>
  );
}
