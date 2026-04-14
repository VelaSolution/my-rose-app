"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  loadHistory, deleteHistory, fmt,
  type HistoryRecord,
} from "@/lib/vela";

export default function HistorySection() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  useEffect(() => { setHistory(loadHistory()); }, []);
  if (history.length === 0) return null;

  const chartData = [...history].reverse().map((r) => ({
    label: r.label.replace("년 ", "/").replace("월", ""),
    매출: Math.round(r.result.totalSales / 10000),
    세전순이익: Math.round(r.result.profit / 10000),
    세후실수령: Math.round(r.result.netProfit / 10000),
  }));

  const latest = history[0];
  const prev = history[1];
  const profitDiff = prev ? latest.result.profit - prev.result.profit : null;

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">월별 추이</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">저장된 최근 {history.length}개월 데이터입니다.</p>
        </div>
        {profitDiff !== null && (
          <div className={`rounded-full px-4 py-2 text-sm font-semibold ${profitDiff >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            전월 대비 {profitDiff >= 0 ? "+" : ""}{fmt(profitDiff)}원
          </div>
        )}
      </div>
      {history.length >= 2 && (
        <div className="mb-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}만`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, name) => [`${fmt(Number(v) * 10000)}원`, String(name)]} />
              <Legend />
              <Line type="monotone" dataKey="매출" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="세전순이익" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="세후실수령" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="space-y-2">
        {history.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-700 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                매출 {fmt(r.result.totalSales)}원 &nbsp;·&nbsp;
                <span className={r.result.profit >= 0 ? "text-emerald-600" : "text-red-500"}>순이익 {fmt(r.result.profit)}원</span>
                &nbsp;·&nbsp; 세후 {fmt(r.result.netProfit)}원
                {r.result.recoveryMonthsActual < 999 && <span className="text-slate-400"> &nbsp;·&nbsp; 회수 {r.result.recoveryMonthsActual}개월</span>}
              </p>
            </div>
            <button onClick={() => { deleteHistory(r.id); setHistory(loadHistory()); }}
              className="ml-3 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600">삭제</button>
          </div>
        ))}
      </div>
    </section>
  );
}
