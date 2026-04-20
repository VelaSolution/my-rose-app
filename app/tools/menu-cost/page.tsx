"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { fmt } from "@/lib/vela";
import SimDataPicker from "@/components/SimDataPicker";
import CollapsibleTip from "@/components/CollapsibleTip";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";
import type { SimulatorSnapshot } from "@/lib/useSimulatorData";

import type { MenuItem, IndustryKey } from "./components/types";
import { uid, num, calcMenu, CATEGORIES } from "./components/types";
import { INDUSTRY_INFO } from "./components/types";
import { INDUSTRY_PRESETS } from "./components/IndustryPresets";
import MenuCard from "./components/MenuCard";
import SummaryDashboard, { MenuCompareTable } from "./components/SummaryDashboard";

// ─── Main Page ────────────────────────────────────────────────────────────────

type MenuCostCloudData = { industry: IndustryKey; menus: MenuItem[] };
const MENU_COST_DEFAULT: MenuCostCloudData = { industry: "cafe", menus: INDUSTRY_PRESETS["cafe"] };

export default function MenuCostPage() {
  const [industry, setIndustry] = useState<IndustryKey>("cafe");
  const [menus, setMenus] = useState<MenuItem[]>(INDUSTRY_PRESETS["cafe"]);
  const [filterCategory, setFilterCategory] = useState("전체");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  const { data: cloudData, update: cloudUpdate, status: syncStatus, userId: syncUserId, error: syncError, retry: syncRetry } = useCloudSync<MenuCostCloudData>("vela-menu-cost", MENU_COST_DEFAULT);

  // Load from cloud on mount
  useEffect(() => {
    if (cloudData.menus && cloudData.menus.length > 0) {
      setMenus(cloudData.menus);
    }
    if (cloudData.industry) {
      setIndustry(cloudData.industry);
    }
  }, [cloudData]);

  const simFields = (sim: SimulatorSnapshot) => [
    { key: "industry", label: "업종", value: sim.industry, rawValue: sim.industry },
    { key: "avgSpend", label: "객단가 (가격 참고)", value: `${fmt(sim.avgSpend)}원`, rawValue: sim.avgSpend },
  ];
  const applySimSelected = (selected: Record<string, number | string>) => {
    if (selected.industry && selected.industry in INDUSTRY_PRESETS) {
      changeIndustry(selected.industry as IndustryKey);
    }
  };

  function buildMenuRow(m: MenuItem, userId: string) {
    const totalCost = m.ingredients.reduce((s, i) => s + (parseInt(i.cost) || 0), 0);
    const sellPrice = num(m.price);
    return {
      user_id: userId,
      name: m.name,
      category: m.category,
      industry,
      price: sellPrice,
      cost: totalCost,
      note: "",
    };
  }

  async function getAuthUser() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login?next=/tools/menu-cost";
      return null;
    }
    return { supabase, user };
  }

  async function saveOneMenu(m: MenuItem) {
    const auth = await getAuthUser();
    if (!auth) throw new Error("로그인이 필요합니다.");
    const row = buildMenuRow(m, auth.user.id);
    const { error } = await auth.supabase.from("menu_costs").insert(row);
    if (error) throw error;
  }

  async function saveAllMenus() {
    setSaveStatus("saving");
    const auth = await getAuthUser();
    if (!auth) return;

    const toSave = menus
      .filter(m => num(m.price) > 0 && m.name.trim())
      .map(m => buildMenuRow(m, auth.user.id));

    if (toSave.length === 0) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
      return;
    }

    const { error } = await auth.supabase.from("menu_costs").insert(toSave);
    if (error) {
      setSaveStatus("error");
    } else {
      setSaveStatus("done");
    }
    setTimeout(() => setSaveStatus("idle"), 3000);
  }

  function changeIndustry(key: IndustryKey) {
    setIndustry(key);
    const newMenus = INDUSTRY_PRESETS[key].map(m => ({
      ...m,
      id: uid(),
      ingredients: m.ingredients.map(i => ({ ...i, id: uid() })),
    }));
    setMenus(newMenus);
    setFilterCategory("전체");
    cloudUpdate({ industry: key, menus: newMenus });
  }
  const [sortBy, setSortBy] = useState<"default" | "costRatio" | "profit">("default");

  const addMenu = useCallback(() => {
    setMenus((prev) => {
      const next = [
        ...prev,
        {
          id: uid(),
          name: "",
          price: "",
          category: "음료",
          ingredients: [{ id: uid(), name: "", cost: "" }],
        },
      ];
      cloudUpdate({ industry, menus: next });
      return next;
    });
  }, [industry, cloudUpdate]);

  const updateMenu = useCallback((id: string, updated: Partial<MenuItem>) => {
    setMenus((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...updated } : m));
      cloudUpdate({ industry, menus: next });
      return next;
    });
  }, [industry, cloudUpdate]);

  const deleteMenu = useCallback((id: string) => {
    setMenus((prev) => {
      const next = prev.filter((m) => m.id !== id);
      cloudUpdate({ industry, menus: next });
      return next;
    });
  }, [industry, cloudUpdate]);

  // 필터 + 정렬
  const allCalc = menus.map((m) => ({ item: m, calc: calcMenu(m) }));
  const filtered = allCalc
    .filter((m) => filterCategory === "전체" || m.item.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === "costRatio") return a.calc.costRatio - b.calc.costRatio;
      if (sortBy === "profit") return b.calc.profit - a.calc.profit;
      return 0;
    });

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
      `}</style>

      <ToolNav />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          {/* 상단 헤더 */}
          <div className="flex items-center justify-between gap-3 mb-8 mt-4">
            <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">
              ← 도구 목록
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/tools/menu-cost/saved"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                📋 저장된 메뉴 보기
              </Link>
              <button
                onClick={saveAllMenus}
                disabled={saveStatus === "saving"}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  saveStatus === "done" ? "bg-emerald-500 text-white" :
                  saveStatus === "error" ? "bg-red-500 text-white" :
                  "bg-slate-900 text-white hover:bg-slate-700"
                }`}>
                {saveStatus === "saving" ? "저장 중..." :
                 saveStatus === "done" ? "✓ 전체 저장 완료" :
                 saveStatus === "error" ? "저장할 메뉴 없음" :
                 "💾 전체 저장"}
              </button>
            </div>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>🧮</span> 원가 계산기
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                메뉴별 원가 계산기
              </h1>
              <CloudSyncBadge status={syncStatus} userId={syncUserId} onRetry={syncRetry} />
            {syncError && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-100 text-sm">
                <span className="text-red-500">⚠️</span>
                <div className="flex-1"><p className="font-semibold text-red-700">클라우드 동기화 실패</p><p className="text-red-500 text-xs">데이터는 로컬에 저장되었습니다</p></div>
                <button onClick={syncRetry} className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition">재시도</button>
              </div>
            )}
            </div>
            <p className="text-slate-500 text-sm">
              메뉴별 식재료 원가를 입력하면 원가율과 건당 순이익을 자동으로 계산합니다.
            </p>
            <SimDataPicker fields={simFields} onApply={applySimSelected} />
          </div>

          {/* 업종 선택 탭 */}
          <div className="grid grid-cols-5 gap-2 mb-8">
            {(Object.keys(INDUSTRY_INFO) as IndustryKey[]).map((key) => {
              const info = INDUSTRY_INFO[key];
              const active = industry === key;
              return (
                <button
                  key={key}
                  onClick={() => changeIndustry(key)}
                  className="rounded-2xl py-3 flex flex-col items-center gap-1.5 transition-all duration-200 border-2 relative"
                  style={{
                    background: active ? info.bg : "#fff",
                    borderColor: active ? info.color : "#E5E8EB",
                    boxShadow: active ? `0 0 0 1px ${info.color}` : "none",
                  }}
                >
                  <span className="text-xl">{info.emoji}</span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: active ? info.color : "#6B7684" }}
                  >
                    {info.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 고깃집 이중사업자 안내 */}
          {industry === "gogi" && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 mb-6 flex gap-3">
              <span className="text-xl flex-shrink-0">🥩</span>
              <div>
                <p className="text-sm font-bold text-red-700 mb-1">고깃집 이중사업자 구조</p>
                <p className="text-xs text-red-600 leading-relaxed">
                  <strong>1호 (음식점업)</strong> — 홀 매출·서비스 담당 / <strong>2호 (축산물판매업)</strong> — 고기 원육 공급 담당<br />
                  2호 법인이 원육을 매입해 1호에 공급하면 매입세액 공제 + 원가 분산 효과로 세금 절감이 가능합니다.<br />
                  <span className="text-red-400 mt-1 block">⚠️ 실제 운영 전 반드시 세무사 상담을 받으세요.</span>
                </p>
              </div>
            </div>
          )}

          {/* 요약 대시보드 + 최우수 메뉴 */}
          <SummaryDashboard menus={menus} />

          {/* 원가율 기준 안내 */}
          <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 mb-6 flex gap-4 flex-wrap text-xs text-slate-600">
            <span className="font-semibold text-slate-700">원가율 기준</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 30% 이하 — 우수</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 31~40% — 양호</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> 41% 초과 — 위험</span>
            <span className="text-slate-400 ml-auto">카페 권장: 25~35% / 음식점 권장: 30~40%</span>
          </div>

          {/* 필터 + 정렬 */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    filterCategory === c
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 outline-none"
            >
              <option value="default">기본 순</option>
              <option value="costRatio">원가율 낮은 순</option>
              <option value="profit">순익 높은 순</option>
            </select>
          </div>

          {/* 메뉴 카드 리스트 */}
          <div className="space-y-4">
            {filtered.map(({ item }) => (
              <MenuCard
                key={item.id}
                item={item}
                onUpdate={updateMenu}
                onDelete={deleteMenu}
                onSave={saveOneMenu}
              />
            ))}
          </div>

          {/* 메뉴 추가 버튼 */}
          <button
            onClick={addMenu}
            className="mt-5 w-full rounded-3xl border-2 border-dashed border-slate-200 py-5 text-sm font-semibold text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            새 메뉴 추가
          </button>

          {/* 전체 원가 분석 테이블 */}
          <MenuCompareTable menus={menus} />

          {/* 하단 팁 */}
          <CollapsibleTip className="mt-8">
            원가율이 높은 메뉴는 식재료 공급처 변경, 레시피 조정, 또는 판매가 인상을 검토해 보세요.
            배달 채널에서는 포장재·배달비까지 원가에 포함해야 실제 마진을 정확히 파악할 수 있습니다.
          </CollapsibleTip>

          {/* 관련 도구 추천 */}
          <div className="mt-8 rounded-3xl bg-slate-50 p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">📌 관련 도구</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { emoji: "👥", label: "인건비 스케줄러", href: "/tools/labor" },
                { emoji: "🧾", label: "세금 계산기", href: "/tools/tax" },
                { emoji: "📄", label: "손익계산서 PDF", href: "/tools/pl-report" },
              ].map(t => (
                <Link key={t.href} href={t.href} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white hover:bg-blue-50 transition text-center">
                  <span className="text-xl">{t.emoji}</span>
                  <span className="text-xs text-slate-600">{t.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
