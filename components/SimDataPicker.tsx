"use client";

import { useState } from "react";
import { useSimulatorData, type SimulatorSnapshot } from "@/lib/useSimulatorData";

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const INDUSTRY_LABEL: Record<string, string> = {
  cafe: "카페", restaurant: "음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집",
};

export interface SimField {
  key: string;
  label: string;
  value: string;            // 표시용 텍스트
  rawValue: number | string; // 실제 적용 값
}

interface SimDataPickerProps {
  /** 이 도구에서 연동 가능한 필드 목록 생성 함수 */
  fields: (sim: SimulatorSnapshot) => SimField[];
  /** 선택된 필드 적용 콜백 */
  onApply: (selected: Record<string, number | string>) => void;
}

export default function SimDataPicker({ fields, onApply }: SimDataPickerProps) {
  const simData = useSimulatorData();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (!simData) return null;

  const fieldList = fields(simData);

  const toggleAll = (on: boolean) => {
    const next: Record<string, boolean> = {};
    fieldList.forEach(f => { next[f.key] = on; });
    setChecked(next);
  };

  const handleApply = () => {
    const selected: Record<string, number | string> = {};
    fieldList.forEach(f => {
      if (checked[f.key]) selected[f.key] = f.rawValue;
    });
    onApply(selected);
    setOpen(false);
  };

  const selectedCount = fieldList.filter(f => checked[f.key]).length;

  if (!open) {
    return (
      <button
        onClick={() => { toggleAll(true); setOpen(true); }}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
      >
        🔗 시뮬레이터 데이터 연동
        <span className="text-[10px] text-blue-400">
          ({INDUSTRY_LABEL[simData.industry] ?? simData.industry} · 월매출 {fmt(simData.totalSales)}원)
        </span>
      </button>
    );
  }

  return (
    <div className="mt-2 bg-blue-50 ring-1 ring-blue-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-900">🔗 연동할 데이터 선택</p>
        <button onClick={() => setOpen(false)} className="text-slate-400 text-xs hover:text-slate-600">✕ 닫기</button>
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={() => toggleAll(true)}
          className="text-[11px] font-semibold text-blue-600 bg-white ring-1 ring-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition">
          전체 선택
        </button>
        <button onClick={() => toggleAll(false)}
          className="text-[11px] font-semibold text-slate-500 bg-white ring-1 ring-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition">
          전체 해제
        </button>
      </div>

      <div className="space-y-1.5 mb-3">
        {fieldList.map(f => (
          <label key={f.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition ${checked[f.key] ? "bg-white ring-1 ring-blue-300" : "bg-blue-50/50 hover:bg-white"}`}>
            <input
              type="checkbox"
              checked={!!checked[f.key]}
              onChange={e => setChecked(p => ({ ...p, [f.key]: e.target.checked }))}
              className="accent-blue-600 w-4 h-4"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-700">{f.label}</span>
            </div>
            <span className="text-xs font-bold text-blue-600 flex-shrink-0">{f.value}</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleApply}
        disabled={selectedCount === 0}
        className="w-full rounded-xl bg-blue-600 text-white font-semibold py-2.5 text-sm hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {selectedCount > 0 ? `선택한 ${selectedCount}개 항목 적용하기` : "항목을 선택하세요"}
      </button>
    </div>
  );
}
