"use client";

import { useState, useEffect } from "react";
import { useSimulatorData, type SimulatorSnapshot } from "@/lib/useSimulatorData";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const INDUSTRY_LABEL: Record<string, string> = {
  cafe: "카페", restaurant: "음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
};

export interface SimField {
  key: string;
  label: string;
  value: string;
  rawValue: number | string;
}

interface DataSource {
  id: string;
  label: string;
  sub: string;
  icon: string;
  snapshot: SimulatorSnapshot;
}

interface SimDataPickerProps {
  fields: (sim: SimulatorSnapshot) => SimField[];
  onApply: (selected: Record<string, number | string>) => void;
}

/* ── 데이터 소스 로더 (공통) ── */
async function loadAllSources(simData: SimulatorSnapshot | null): Promise<DataSource[]> {
  const all: DataSource[] = [];

  if (simData) {
    all.push({
      id: "current", label: "현재 시뮬레이션",
      sub: `${INDUSTRY_LABEL[simData.industry] ?? simData.industry} · ${fmt(simData.totalSales)}원`,
      icon: "📊", snapshot: simData,
    });
  }

  try {
    const sb = createSupabaseBrowserClient();
    if (!sb) return all;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return all;

    const { data: simRows } = await sb.from("simulation_history")
      .select("id, label, created_at, form, result")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);

    if (simRows) {
      for (const row of simRows) {
        const f = (row.form || {}) as Record<string, unknown>;
        const r = (row.result || {}) as Record<string, unknown>;
        const industry = String(f.industry || "restaurant");
        const totalSales = Number(r.totalSales || 0);
        if (totalSales === 0) continue;
        const profit = Number(r.netProfit || r.profit || 0);
        const date = new Date(row.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
        all.push({
          id: "sim-" + row.id, label: `☁️ ${row.label}`,
          sub: `${date} · ${INDUSTRY_LABEL[industry] ?? industry}`,
          icon: "📋",
          snapshot: {
            industry, totalSales, profit, netProfit: profit,
            netMargin: totalSales > 0 ? Math.round(profit / totalSales * 1000) / 10 : 0,
            bep: 0, laborRatio: Number(r.laborRatio || 25), cogsRatio: Number(f.cogsRate || r.cogsRate || 30),
            seats: Number(f.seats || 0), avgSpend: Number(f.avgSpend || 0),
            rent: Number(f.rent || 0), deliveryEnabled: false,
          },
        });
      }
    }

    const { data: monthRows } = await sb.from("monthly_snapshots")
      .select("id, month, industry, total_sales, net_profit, cogs, labor_cost, rent, utilities, avg_spend, customer_count")
      .eq("user_id", user.id).order("month", { ascending: false }).limit(6);

    if (monthRows) {
      for (const row of monthRows) {
        const totalSales = Number(row.total_sales || 0);
        if (totalSales === 0) continue;
        const netProfit = Number(row.net_profit || 0);
        const cogsRatio = totalSales > 0 ? Math.round(Number(row.cogs || 0) / totalSales * 100) : 30;
        const laborRatio = totalSales > 0 ? Math.round(Number(row.labor_cost || 0) / totalSales * 100) : 25;
        const avgSpend = Number(row.avg_spend || 0);
        all.push({
          id: "month-" + row.id, label: `📈 ${row.month}`,
          sub: `${INDUSTRY_LABEL[row.industry] ?? row.industry} · ${fmt(totalSales)}원`,
          icon: "📈",
          snapshot: {
            industry: row.industry || "restaurant", totalSales, profit: netProfit, netProfit,
            netMargin: totalSales > 0 ? Math.round(netProfit / totalSales * 1000) / 10 : 0,
            bep: 0, laborRatio, cogsRatio, seats: 0, avgSpend,
            rent: Number(row.rent || 0), deliveryEnabled: false,
          },
        });
      }
    }
  } catch { /* noop */ }

  return all;
}

/* ── 메인 컴포넌트 ── */
export default function SimDataPicker({ fields, onApply }: SimDataPickerProps) {
  const simData = useSimulatorData();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"source" | "fields">("source");
  const [sources, setSources] = useState<DataSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const activeSource = sources.find(s => s.id === selectedSource);
  const fieldList = activeSource ? fields(activeSource.snapshot) : [];
  const selectedCount = fieldList.filter(f => checked[f.key]).length;

  const handleOpen = async () => {
    setLoading(true);
    const all = await loadAllSources(simData);
    setSources(all);
    setSelectedSource(all[0]?.id ?? "");
    setStep("source");
    setOpen(true);
    setLoading(false);
  };

  const selectSource = (id: string) => {
    setSelectedSource(id);
    const src = sources.find(s => s.id === id);
    if (src) {
      const fl = fields(src.snapshot);
      const next: Record<string, boolean> = {};
      fl.forEach(f => { next[f.key] = true; });
      setChecked(next);
    }
    setStep("fields");
  };

  const handleApply = () => {
    const selected: Record<string, number | string> = {};
    fieldList.forEach(f => {
      if (checked[f.key]) selected[f.key] = f.rawValue;
    });
    onApply(selected);
    setOpen(false);
  };

  if (!simData && !open) return null;

  /* 닫힌 상태 — 버튼 */
  if (!open) {
    return (
      <button onClick={handleOpen} disabled={loading}
        className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 ring-1 ring-blue-200 px-4 py-2 rounded-xl hover:bg-blue-100 transition disabled:opacity-50">
        {loading ? "⏳ 불러오는 중..." : "🔗 데이터 연동 (시뮬레이터 · 월별매출 · 저장 기록)"}
      </button>
    );
  }

  return (
    <div className="mt-3 bg-white ring-1 ring-slate-200 rounded-2xl shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔗</span>
          <p className="text-sm font-bold text-slate-900">
            {step === "source" ? "데이터 소스 선택" : "연동할 항목 선택"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step === "fields" && (
            <button onClick={() => setStep("source")} className="text-xs text-slate-500 hover:text-slate-700 font-semibold">← 소스 변경</button>
          )}
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>
      </div>

      {/* Step 1: 소스 선택 */}
      {step === "source" && (
        <div className="p-4">
          {sources.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">사용 가능한 데이터가 없습니다. 시뮬레이터를 먼저 실행하세요.</p>
          ) : (
            <div className="space-y-2">
              {sources.map(src => (
                <button key={src.id} onClick={() => selectSource(src.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition hover:bg-blue-50 ring-1 ring-slate-100 hover:ring-blue-200">
                  <span className="text-xl">{src.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{src.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{src.sub}</p>
                  </div>
                  <span className="text-slate-300 text-sm">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: 필드 선택 */}
      {step === "fields" && activeSource && (
        <div className="p-4">
          {/* 선택된 소스 표시 */}
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 rounded-xl">
            <span>{activeSource.icon}</span>
            <span className="text-xs font-semibold text-blue-700">{activeSource.label}</span>
            <span className="text-[10px] text-blue-500">{activeSource.sub}</span>
          </div>

          {/* 전체 선택/해제 */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => { const n: Record<string, boolean> = {}; fieldList.forEach(f => { n[f.key] = true; }); setChecked(n); }}
              className="text-[11px] font-semibold text-blue-600 bg-blue-50 ring-1 ring-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-100 transition">
              전체 선택
            </button>
            <button onClick={() => setChecked({})}
              className="text-[11px] font-semibold text-slate-500 bg-slate-50 ring-1 ring-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition">
              전체 해제
            </button>
          </div>

          {/* 체크박스 목록 */}
          <div className="space-y-1.5 mb-4">
            {fieldList.map(f => (
              <label key={f.key} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition ${
                checked[f.key] ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
              }`}>
                <input type="checkbox" checked={!!checked[f.key]}
                  onChange={e => setChecked(p => ({ ...p, [f.key]: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4 rounded" />
                <span className="flex-1 text-sm text-slate-700">{f.label}</span>
                <span className="text-sm font-bold text-blue-600">{f.value}</span>
              </label>
            ))}
          </div>

          {/* 적용 버튼 */}
          <button onClick={handleApply} disabled={selectedCount === 0}
            className="w-full rounded-xl bg-slate-900 text-white font-semibold py-3 text-sm hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed">
            {selectedCount > 0 ? `선택한 ${selectedCount}개 항목 적용` : "항목을 선택하세요"}
          </button>
        </div>
      )}
    </div>
  );
}
