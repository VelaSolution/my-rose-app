"use client";

// 공통 UI 카드 컴포넌트들

export function SummaryCard({ title, value, sub, highlight }: { title: string; value: string; sub?: string; highlight?: "good" | "bad" | "info" }) {
  const bg = highlight === "good" ? "bg-emerald-50 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-800"
    : highlight === "bad" ? "bg-red-50 ring-red-200 dark:bg-red-900/20 dark:ring-red-800"
    : highlight === "info" ? "bg-blue-50 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800"
    : "bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700";
  const tc = highlight === "good" ? "text-emerald-700 dark:text-emerald-400"
    : highlight === "bad" ? "text-red-700 dark:text-red-400"
    : highlight === "info" ? "text-blue-700 dark:text-blue-400"
    : "text-slate-900 dark:text-slate-100";
  return (
    <div className={`rounded-3xl p-4 shadow-sm ring-1 ${bg}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
      <p className={`mt-1.5 text-lg font-bold tracking-tight ${tc}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function InfoBox({ title, value, sub, tone = "default" }: { title: string; value: string; sub?: string; tone?: "default" | "good" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-3xl bg-slate-50 dark:bg-slate-700 p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className={`mt-2 text-xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function AnalysisCard({ title, body, tone = "default" }: { title: string; body: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const map = {
    default: "bg-slate-50 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
    good: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
    warn: "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
    bad: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  };
  return (
    <div className={`rounded-3xl p-4 ${map[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6">{body}</p>
    </div>
  );
}

export function TagBadge({ label }: { label: string }) {
  const map: Record<string, string> = { "객단가": "bg-blue-100 text-blue-700", "회전율": "bg-purple-100 text-purple-700", "효율화": "bg-amber-100 text-amber-700", "원가": "bg-orange-100 text-orange-700", "복합": "bg-emerald-100 text-emerald-700", "배달": "bg-pink-100 text-pink-700" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[label] ?? "bg-slate-100 text-slate-600"}`}>{label}</span>;
}
