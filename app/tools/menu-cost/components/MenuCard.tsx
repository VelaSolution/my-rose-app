"use client";

import { useState } from "react";
import { fmt } from "@/lib/vela";
import type { MenuItem } from "./types";
import { uid, calcMenu, CATEGORIES, CATEGORY_COLOR } from "./types";
import CostRatioBar from "./CostRatioBar";
import IngredientRow from "./IngredientRow";

export default function MenuCard({
  item,
  onUpdate,
  onDelete,
  onSave,
}: {
  item: MenuItem;
  onUpdate: (id: string, updated: Partial<MenuItem>) => void;
  onDelete: (id: string) => void;
  onSave: (item: MenuItem) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "done" | "error" | "noname" | "noprice">("idle");
  const { price, costTotal, profit, costRatio, profitRatio } = calcMenu(item);

  async function handleSave() {
    if (!item.name.trim()) {
      setSaving("noname");
      setTimeout(() => setSaving("idle"), 2000);
      return;
    }
    if (price <= 0) {
      setSaving("noprice");
      setTimeout(() => setSaving("idle"), 2000);
      return;
    }
    setSaving("saving");
    try {
      await onSave(item);
      setSaving("done");
    } catch (err) {
      console.error("Menu save error:", err);
      setSaving("error");
    }
    setTimeout(() => setSaving("idle"), 2500);
  }

  const addIngredient = () => {
    onUpdate(item.id, {
      ingredients: [...item.ingredients, { id: uid(), name: "", cost: "" }],
    });
  };

  const updateIngredient = (ingId: string, field: "name" | "cost", value: string) => {
    onUpdate(item.id, {
      ingredients: item.ingredients.map((i) =>
        i.id === ingId ? { ...i, [field]: value } : i
      ),
    });
  };

  const deleteIngredient = (ingId: string) => {
    onUpdate(item.id, {
      ingredients: item.ingredients.filter((i) => i.id !== ingId),
    });
  };

  const statusColor =
    costRatio === 0 ? "#9EA6B3" : costRatio <= 30 ? "#059669" : costRatio <= 40 ? "#D97706" : "#EF4444";
  const statusLabel =
    costRatio === 0 ? "—" : costRatio <= 30 ? "우수" : costRatio <= 40 ? "양호" : "위험";

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
      {/* 카드 헤더 */}
      <div className="px-6 py-4 flex items-center gap-3">
        <div
          className="w-2 h-8 rounded-full flex-shrink-0"
          style={{ background: CATEGORY_COLOR[item.category] ?? "#9EA6B3" }}
        />
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="메뉴명을 입력하세요"
            value={item.name}
            onChange={(e) => onUpdate(item.id, { name: e.target.value })}
            className="font-bold text-slate-900 text-lg w-full bg-transparent outline-none placeholder:text-slate-300"
          />
          <select
            value={item.category}
            onChange={(e) => onUpdate(item.id, { category: e.target.value })}
            className="text-xs text-slate-400 bg-transparent outline-none mt-0.5 cursor-pointer"
          >
            {CATEGORIES.slice(1).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 핵심 지표 요약 — 데스크탑: 풀 / 모바일: 원가율+뱃지 */}
        <div className="flex items-center gap-3 sm:gap-6 text-right flex-shrink-0">
          <div className="hidden sm:block">
            <p className="text-xs text-slate-400">원가율</p>
            <p className="text-sm font-bold" style={{ color: statusColor }}>
              {price > 0 ? `${costRatio.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-slate-400">건당 순익</p>
            <p className={`text-sm font-bold ${profit >= 0 ? "text-slate-900" : "text-red-500"}`}>
              {price > 0 ? `${fmt(profit)}원` : "—"}
            </p>
          </div>
          {price > 0 && (
            <span className="sm:hidden text-xs font-bold" style={{ color: statusColor }}>{costRatio.toFixed(0)}%</span>
          )}
          <div
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: `${statusColor}18`, color: statusColor }}
          >
            {statusLabel}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving === "saving"}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              saving === "done" ? "bg-emerald-100 text-emerald-600" :
              saving === "error" || saving === "noname" || saving === "noprice" ? "bg-red-100 text-red-500" :
              saving === "saving" ? "bg-slate-100 text-slate-400" :
              price > 0 && item.name.trim() ? "bg-blue-50 text-blue-500 hover:bg-blue-100" : "bg-slate-50 text-slate-300"
            }`}
            title={price <= 0 ? "판매가를 입력해주세요" : "이 메뉴 저장"}
          >
            {saving === "saving" ? "저장 중..." :
             saving === "done" ? "✓ 저장됨" :
             saving === "noname" ? "메뉴명 입력" :
             saving === "noprice" ? "판매가 입력" :
             saving === "error" ? "저장 실패" :
             "💾 저장"}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400"
          >
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 rounded-xl hover:bg-red-50 transition text-slate-300 hover:text-red-400"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* 원가율 바 */}
      {price > 0 && (
        <div className="px-6 pb-2">
          <CostRatioBar ratio={costRatio} />
        </div>
      )}

      {/* 확장 영역 */}
      {expanded && (
        <div className="border-t border-slate-100 px-6 py-5 space-y-5">
          {/* 판매가 */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">판매가</label>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={item.price}
                onChange={(e) => onUpdate(item.id, { price: e.target.value.replace(/[^0-9]/g, "") })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-right pr-8 outline-none focus:border-blue-400 focus:bg-white transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
            </div>
          </div>

          {/* 식재료 */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              식재료 원가
            </label>
            <div className="space-y-2">
              {item.ingredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ing={ing}
                  onChange={updateIngredient}
                  onDelete={deleteIngredient}
                />
              ))}
            </div>
            <button
              onClick={addIngredient}
              className="mt-3 flex items-center gap-2 text-sm text-blue-500 font-semibold hover:text-blue-600 transition"
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-xs">+</span>
              재료 추가
            </button>
          </div>

          {/* 계산 결과 */}
          {price > 0 && (
            <div className="rounded-2xl bg-slate-50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">판매가</p>
                <p className="text-sm font-bold text-slate-900">{fmt(price)}원</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">총 원가</p>
                <p className="text-sm font-bold text-slate-900">{fmt(costTotal)}원</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">원가율</p>
                <p className="text-sm font-bold" style={{ color: statusColor }}>
                  {costRatio.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">건당 순익</p>
                <p className={`text-sm font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {fmt(profit)}원 ({profitRatio.toFixed(1)}%)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
