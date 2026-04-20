"use client";

import { useState } from "react";
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
          id: "sim-" + row.id, label: `${row.label}`,
          sub: `${date} · ${INDUSTRY_LABEL[industry] ?? industry}`,
          icon: "☁️",
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
          id: "month-" + row.id, label: `${row.month}`,
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

  /* 항상 버튼 표시 */
  return (
    <>
      <button onClick={handleOpen} disabled={loading}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#3182F6] bg-[#3182F6]/5 ring-1 ring-[#3182F6]/20 px-4 py-2.5 rounded-xl hover:bg-[#3182F6]/10 transition active:scale-[0.98] disabled:opacity-50">
        {loading ? "⏳ 불러오는 중..." : "🔗 내 데이터 불러오기"}
      </button>

      {/* 모달 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#3182F6]/10 rounded-xl flex items-center justify-center">
                  <span className="text-sm">🔗</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {step === "source" ? "데이터 소스 선택" : "연동할 항목 선택"}
                  </p>
                  <p className="text-[11px] text-slate-400">시뮬레이션 · 월별 매출 · 클라우드 저장</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {step === "fields" && (
                  <button onClick={() => setStep("source")} className="text-xs text-slate-500 hover:text-slate-700 font-semibold">← 뒤로</button>
                )}
                <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition">✕</button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {/* Step 1: 소스 선택 */}
              {step === "source" && (
                <div className="p-4">
                  {sources.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="text-3xl block mb-3">📊</span>
                      <p className="text-sm font-semibold text-slate-700 mb-1">불러올 데이터가 없어요</p>
                      <p className="text-xs text-slate-400">시뮬레이터를 먼저 실행하거나<br />월별 매출을 입력해주세요</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400 font-semibold px-1 mb-1">{sources.length}개 데이터 소스</p>
                      {sources.map(src => (
                        <button key={src.id} onClick={() => selectSource(src.id)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition hover:bg-[#3182F6]/5 ring-1 ring-slate-100 hover:ring-[#3182F6]/30 active:scale-[0.98]">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{src.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{src.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{src.sub}</p>
                          </div>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-300 flex-shrink-0"><path d="M6 4l4 4-4 4" /></svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: 필드 선택 */}
              {step === "fields" && activeSource && (
                <div className="p-4">
                  {/* 선택된 소스 */}
                  <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-[#3182F6]/5 rounded-xl ring-1 ring-[#3182F6]/10">
                    <span className="text-base">{activeSource.icon}</span>
                    <span className="text-xs font-bold text-[#3182F6]">{activeSource.label}</span>
                    <span className="text-[10px] text-[#3182F6]/60">{activeSource.sub}</span>
                  </div>

                  {/* 전체 선택/해제 */}
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => { const n: Record<string, boolean> = {}; fieldList.forEach(f => { n[f.key] = true; }); setChecked(n); }}
                      className="text-[11px] font-semibold text-[#3182F6] hover:bg-[#3182F6]/10 rounded-lg px-3 py-1.5 transition">
                      전체 선택
                    </button>
                    <button onClick={() => setChecked({})}
                      className="text-[11px] font-semibold text-slate-400 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition">
                      전체 해제
                    </button>
                  </div>

                  {/* 체크박스 목록 */}
                  <div className="space-y-1 mb-4">
                    {fieldList.map(f => (
                      <label key={f.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition active:scale-[0.99] ${
                        checked[f.key] ? "bg-[#3182F6]/5 ring-1 ring-[#3182F6]/20" : "hover:bg-slate-50"
                      }`}>
                        <input type="checkbox" checked={!!checked[f.key]}
                          onChange={e => setChecked(p => ({ ...p, [f.key]: e.target.checked }))}
                          className="accent-[#3182F6] w-4 h-4 rounded flex-shrink-0" />
                        <span className="flex-1 text-sm text-slate-700">{f.label}</span>
                        <span className="text-sm font-bold text-[#3182F6] tabular-nums">{f.value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 하단 적용 버튼 */}
            {step === "fields" && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                <button onClick={handleApply} disabled={selectedCount === 0}
                  className="w-full rounded-xl bg-[#3182F6] text-white font-semibold py-3 text-sm hover:bg-[#2672DE] active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#3182F6]/20">
                  {selectedCount > 0 ? `선택한 ${selectedCount}개 항목 적용하기` : "항목을 선택하세요"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
