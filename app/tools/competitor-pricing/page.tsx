"use client";

import { useState } from "react";
import Link from "next/link";
import { fmt } from "@/lib/vela";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";
import ToolNav from "@/components/ToolNav";

type Competitor = {
  id: string;
  name: string;
  menus: { name: string; price: number; note: string }[];
  recordedAt: string;
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export default function CompetitorPricingPage() {
  const { data: competitors, update: setCompetitors, status, userId } = useCloudSync<Competitor[]>("vela-competitor-pricing", []);
  const [showAdd, setShowAdd] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [menus, setMenus] = useState([{ name: "", price: "", note: "" }]);
  const [editId, setEditId] = useState<string | null>(null);

  const handleSave = () => {
    if (!storeName.trim()) return;
    const validMenus = menus.filter((m) => m.name.trim() && m.price);
    if (validMenus.length === 0) return;

    const entry: Competitor = {
      id: editId || uid(),
      name: storeName.trim(),
      menus: validMenus.map((m) => ({ name: m.name.trim(), price: Number(m.price), note: m.note.trim() })),
      recordedAt: new Date().toISOString().slice(0, 10),
    };

    const updated = editId ? competitors.map((c) => (c.id === editId ? entry : c)) : [entry, ...competitors];
    setCompetitors(updated);
    setShowAdd(false);
    setStoreName("");
    setMenus([{ name: "", price: "", note: "" }]);
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("삭제할까요?")) return;
    const updated = competitors.filter((c) => c.id !== id);
    setCompetitors(updated);
  };

  const handleEdit = (c: Competitor) => {
    setEditId(c.id);
    setStoreName(c.name);
    setMenus(c.menus.map((m) => ({ name: m.name, price: String(m.price), note: m.note })));
    setShowAdd(true);
  };

  // 내 메뉴 평균 vs 경쟁 평균
  const allPrices = competitors.flatMap((c) => c.menus.map((m) => m.price));
  const avgPrice = allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0;

  return (
    <>
    <ToolNav />
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
      <div className="mx-auto max-w-2xl">
        <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>

        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>🔍</span> 경쟁 분석
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">경쟁매장 가격 조사</h1>
            <CloudSyncBadge status={status} userId={userId} />
          </div>
          <p className="text-slate-500 text-sm">주변 매장 메뉴 가격을 기록하고 내 가격과 비교하세요.</p>
        </div>

        {avgPrice > 0 && (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 mb-6 text-center">
            <p className="text-xs text-slate-400">경쟁매장 평균 메뉴 가격</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{fmt(avgPrice)}원</p>
            <p className="text-xs text-slate-400 mt-1">{competitors.length}개 매장 · {allPrices.length}개 메뉴 기준</p>
          </div>
        )}

        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="w-full rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-semibold text-slate-400 hover:border-slate-300 hover:text-slate-600 transition mb-6">
            + 경쟁매장 추가
          </button>
        ) : (
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 mb-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">{editId ? "매장 수정" : "경쟁매장 추가"}</h3>
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="매장 이름 (예: 옆집 카페)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />

            {menus.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input value={m.name} onChange={(e) => { const u = [...menus]; u[i].name = e.target.value; setMenus(u); }} placeholder="메뉴명" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                <input type="number" value={m.price} onChange={(e) => { const u = [...menus]; u[i].price = e.target.value; setMenus(u); }} placeholder="가격" className="w-24 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                <input value={m.note} onChange={(e) => { const u = [...menus]; u[i].note = e.target.value; setMenus(u); }} placeholder="메모" className="w-24 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </div>
            ))}
            <button onClick={() => setMenus([...menus, { name: "", price: "", note: "" }])} className="text-xs text-blue-500 font-semibold">+ 메뉴 추가</button>

            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setEditId(null); setStoreName(""); setMenus([{ name: "", price: "", note: "" }]); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">취소</button>
              <button onClick={handleSave} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white">저장</button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {competitors.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.recordedAt} 기록</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(c)} className="text-xs text-blue-500 font-semibold">수정</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-slate-400 hover:text-red-500">삭제</button>
                </div>
              </div>
              <div className="space-y-2">
                {c.menus.map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-700">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{fmt(m.price)}원</span>
                      {m.note && <span className="text-xs text-slate-400">{m.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
    </>
  );
}
