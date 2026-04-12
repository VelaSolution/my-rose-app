"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fmt } from "@/lib/vela";

const STORAGE_KEY = "vela-ingredient-prices";

type PriceEntry = {
  id: string;
  name: string;
  unit: string;
  prices: { date: string; price: number; source: string }[];
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

const COMMON_INGREDIENTS = [
  { name: "돼지고기 (삼겹살)", unit: "kg" },
  { name: "소고기 (등심)", unit: "kg" },
  { name: "닭가슴살", unit: "kg" },
  { name: "쌀", unit: "kg" },
  { name: "양파", unit: "kg" },
  { name: "대파", unit: "단" },
  { name: "마늘", unit: "kg" },
  { name: "계란", unit: "30구" },
  { name: "우유", unit: "L" },
  { name: "식용유", unit: "L" },
  { name: "밀가루", unit: "kg" },
  { name: "에스프레소 원두", unit: "kg" },
  { name: "생크림", unit: "L" },
  { name: "새우", unit: "kg" },
  { name: "연어", unit: "kg" },
  { name: "소주", unit: "병" },
  { name: "맥주", unit: "500ml" },
];

function loadData(): PriceEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function saveData(data: PriceEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function IngredientTrackerPage() {
  const [items, setItems] = useState<PriceEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [priceInputs, setPriceInputs] = useState<Record<string, { price: string; source: string }>>({});

  useEffect(() => { setItems(loadData()); }, []);

  const addItem = (name: string, unit: string) => {
    if (items.find(i => i.name === name)) return;
    const next = [...items, { id: uid(), name, unit, prices: [] }];
    setItems(next);
    saveData(next);
    setNewName("");
    setShowAdd(false);
  };

  const addPrice = (itemId: string) => {
    const input = priceInputs[itemId];
    if (!input?.price) return;
    const next = items.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        prices: [...item.prices, {
          date: new Date().toISOString().slice(0, 10),
          price: Number(input.price.replace(/,/g, "")),
          source: input.source || "직접 입력",
        }].slice(-12), // 최근 12개만
      };
    });
    setItems(next);
    saveData(next);
    setPriceInputs(prev => ({ ...prev, [itemId]: { price: "", source: "" } }));
  };

  const removeItem = (id: string) => {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    saveData(next);
  };

  const getChange = (prices: { price: number }[]) => {
    if (prices.length < 2) return null;
    const prev = prices[prices.length - 2].price;
    const curr = prices[prices.length - 1].price;
    if (prev === 0) return null;
    return ((curr - prev) / prev * 100).toFixed(1);
  };

  return (
    <>
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>🥬</span> 식재료 가격 트래커
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">식재료 가격 트래커</h1>
            <p className="text-slate-500 text-sm">주요 식재료 가격을 기록하고 변동 추이를 확인하세요.</p>
          </div>

          {/* 빠른 추가 */}
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="w-full rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-semibold text-slate-400 hover:border-slate-300 hover:text-slate-600 transition mb-6">
              + 식재료 추가
            </button>
          ) : (
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 mb-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">식재료 추가</h3>
              {/* 자주 쓰는 식재료 */}
              <div className="flex flex-wrap gap-2">
                {COMMON_INGREDIENTS.filter(c => !items.find(i => i.name === c.name)).slice(0, 10).map(c => (
                  <button key={c.name} onClick={() => addItem(c.name, c.unit)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition">
                    + {c.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="직접 입력 (예: 한우 채끝)"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
                <select value={newUnit} onChange={e => setNewUnit(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none">
                  <option value="kg">kg</option><option value="g">g</option><option value="L">L</option>
                  <option value="ml">ml</option><option value="EA">EA</option><option value="단">단</option>
                  <option value="병">병</option><option value="팩">팩</option>
                </select>
                <button onClick={() => newName.trim() && addItem(newName.trim(), newUnit)}
                  disabled={!newName.trim()}
                  className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40">추가</button>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-xs text-slate-400">닫기</button>
            </div>
          )}

          {/* 식재료 목록 */}
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🥬</p>
              <p className="text-slate-400 text-sm mb-2">추적 중인 식재료가 없어요</p>
              <p className="text-slate-400 text-xs">위에서 식재료를 추가하고 가격을 기록하세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => {
                const latest = item.prices[item.prices.length - 1];
                const change = getChange(item.prices);
                const input = priceInputs[item.id] ?? { price: "", source: "" };

                return (
                  <div key={item.id} className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                        <span className="text-xs text-slate-400 ml-2">/{item.unit}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {latest && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">{fmt(latest.price)}원</p>
                            {change && (
                              <p className={`text-xs font-semibold ${Number(change) > 0 ? "text-red-500" : Number(change) < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                                {Number(change) > 0 ? "▲" : Number(change) < 0 ? "▼" : "—"} {Math.abs(Number(change))}%
                              </p>
                            )}
                          </div>
                        )}
                        <button onClick={() => removeItem(item.id)} className="text-xs text-slate-300 hover:text-red-500 transition">삭제</button>
                      </div>
                    </div>

                    {/* 가격 히스토리 바 */}
                    {item.prices.length > 1 && (
                      <div className="flex items-end gap-1 h-12 mb-3">
                        {item.prices.map((p, i) => {
                          const max = Math.max(...item.prices.map(x => x.price));
                          const h = max > 0 ? (p.price / max) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <div className={`w-full rounded-t ${i === item.prices.length - 1 ? "bg-emerald-500" : "bg-slate-200"}`}
                                style={{ height: `${Math.max(h, 8)}%` }} />
                              <span className="text-[8px] text-slate-400">{p.date.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 가격 입력 */}
                    <div className="flex gap-2">
                      <input value={input.price}
                        onChange={e => setPriceInputs(prev => ({ ...prev, [item.id]: { ...input, price: e.target.value.replace(/[^0-9]/g, "") } }))}
                        placeholder="오늘 가격"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-right outline-none focus:border-emerald-400"
                        inputMode="numeric" />
                      <input value={input.source}
                        onChange={e => setPriceInputs(prev => ({ ...prev, [item.id]: { ...input, source: e.target.value } }))}
                        placeholder="출처 (마트/시장)"
                        className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400" />
                      <button onClick={() => addPrice(item.id)}
                        disabled={!input.price}
                        className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-semibold disabled:opacity-40">기록</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 팁 */}
          <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
            <p className="text-sm text-emerald-800">
              💡 <strong>Tip.</strong> 주 1~2회 가격을 기록하면 시세 변동을 미리 파악할 수 있어요. 가격이 10% 이상 올랐다면 대체 재료나 메뉴 조정을 검토하세요.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
