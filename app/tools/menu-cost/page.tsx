"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ToolNav from "@/components/ToolNav";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

// ─── Types ───────────────────────────────────────────────────────────────────

type Ingredient = {
  id: string;
  name: string;
  cost: string; // raw string for input
};

type MenuItem = {
  id: string;
  name: string;
  price: string; // selling price
  category: string;
  ingredients: Ingredient[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function num(v: string) {
  const n = Number(v.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmt(v: number) {
  return v.toLocaleString("ko-KR");
}

function calcMenu(item: MenuItem) {
  const price = num(item.price);
  const costTotal = item.ingredients.reduce((s, i) => s + num(i.cost), 0);
  const profit = price - costTotal;
  const costRatio = price > 0 ? (costTotal / price) * 100 : 0;
  const profitRatio = price > 0 ? (profit / price) * 100 : 0;
  return { price, costTotal, profit, costRatio, profitRatio };
}

const CATEGORIES = ["전체", "음료", "푸드", "디저트", "주류", "기타"];

const CATEGORY_COLOR: Record<string, string> = {
  음료: "#3182F6",
  푸드: "#059669",
  디저트: "#D97706",
  주류: "#7C3AED",
  기타: "#6B7684",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CostRatioBar({ ratio }: { ratio: number }) {
  const good = ratio <= 30;
  const ok = ratio <= 40;
  const color = good ? "#059669" : ok ? "#D97706" : "#EF4444";
  return (
    <div className="w-full rounded-full bg-slate-100 h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(ratio, 100)}%`, background: color }}
      />
    </div>
  );
}

function IngredientRow({
  ing,
  onChange,
  onDelete,
}: {
  ing: Ingredient;
  onChange: (id: string, field: "name" | "cost", value: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 items-center group">
      <input
        type="text"
        placeholder="재료명"
        value={ing.name}
        onChange={(e) => onChange(ing.id, "name", e.target.value)}
        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
      />
      <div className="relative w-32">
        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={ing.cost}
          onChange={(e) => onChange(ing.id, "cost", e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-right pr-7 outline-none focus:border-blue-400 focus:bg-white transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
      </div>
      <button
        onClick={() => onDelete(ing.id)}
        className="opacity-0 group-hover:opacity-100 transition rounded-lg p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-400"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function MenuCard({
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
            className="font-bold text-slate-900 text-base w-full bg-transparent outline-none placeholder:text-slate-300"
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

        {/* 핵심 지표 요약 */}
        <div className="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400">원가율</p>
            <p className="text-sm font-bold" style={{ color: statusColor }}>
              {price > 0 ? `${costRatio.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">건당 순익</p>
            <p className={`text-sm font-bold ${profit >= 0 ? "text-slate-900" : "text-red-500"}`}>
              {price > 0 ? `${fmt(profit)}원` : "—"}
            </p>
          </div>
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
            <div className="relative w-48">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={item.price}
                onChange={(e) => onUpdate(item.id, { price: e.target.value.replace(/[^0-9]/g, "") })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-right pr-8 outline-none focus:border-blue-400 focus:bg-white transition"
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

// ─── 업종별 프리셋 ─────────────────────────────────────────────────────────────

type IndustryKey = "cafe" | "restaurant" | "bar" | "finedining" | "gogi";

const INDUSTRY_PRESETS: Record<IndustryKey, MenuItem[]> = {
  cafe: [
    {
      id: uid(), name: "아메리카노", price: "4500", category: "음료",
      ingredients: [
        { id: uid(), name: "에스프레소 원두", cost: "350" },
        { id: uid(), name: "물·컵·뚜껑·빨대", cost: "120" },
      ],
    },
    {
      id: uid(), name: "카페라떼", price: "5500", category: "음료",
      ingredients: [
        { id: uid(), name: "에스프레소 원두", cost: "350" },
        { id: uid(), name: "우유 200ml", cost: "380" },
        { id: uid(), name: "컵·뚜껑", cost: "120" },
      ],
    },
    {
      id: uid(), name: "크로플", price: "6000", category: "디저트",
      ingredients: [
        { id: uid(), name: "냉동 크로아상 도우", cost: "800" },
        { id: uid(), name: "휘핑크림·시럽", cost: "400" },
        { id: uid(), name: "포장 용기", cost: "120" },
      ],
    },
    {
      id: uid(), name: "티라미수", price: "7500", category: "디저트",
      ingredients: [
        { id: uid(), name: "마스카포네 치즈", cost: "900" },
        { id: uid(), name: "레이디핑거·에스프레소", cost: "500" },
        { id: uid(), name: "용기·코코아파우더", cost: "200" },
      ],
    },
  ],
  restaurant: [
    {
      id: uid(), name: "된장찌개", price: "9000", category: "푸드",
      ingredients: [
        { id: uid(), name: "된장·두부·호박", cost: "1200" },
        { id: uid(), name: "밥·반찬", cost: "800" },
        { id: uid(), name: "가스비·포장", cost: "200" },
      ],
    },
    {
      id: uid(), name: "제육볶음", price: "11000", category: "푸드",
      ingredients: [
        { id: uid(), name: "돼지고기 200g", cost: "2200" },
        { id: uid(), name: "양념·채소", cost: "600" },
        { id: uid(), name: "밥·반찬", cost: "800" },
      ],
    },
    {
      id: uid(), name: "순두부찌개", price: "9000", category: "푸드",
      ingredients: [
        { id: uid(), name: "순두부·해물", cost: "1400" },
        { id: uid(), name: "밥·반찬", cost: "800" },
        { id: uid(), name: "가스비·기타", cost: "200" },
      ],
    },
    {
      id: uid(), name: "냉면", price: "12000", category: "푸드",
      ingredients: [
        { id: uid(), name: "냉면 면·육수", cost: "1800" },
        { id: uid(), name: "고명(달걀·오이·고기)", cost: "900" },
        { id: uid(), name: "그릇·기타", cost: "150" },
      ],
    },
  ],
  bar: [
    {
      id: uid(), name: "생맥주 500cc", price: "5000", category: "주류",
      ingredients: [
        { id: uid(), name: "생맥주 원가", cost: "900" },
        { id: uid(), name: "컵·세제", cost: "80" },
      ],
    },
    {
      id: uid(), name: "소주 1병", price: "5000", category: "주류",
      ingredients: [
        { id: uid(), name: "소주 원가", cost: "1100" },
        { id: uid(), name: "컵", cost: "50" },
      ],
    },
    {
      id: uid(), name: "안주 모둠", price: "18000", category: "푸드",
      ingredients: [
        { id: uid(), name: "육류·해산물", cost: "5500" },
        { id: uid(), name: "야채·소스", cost: "800" },
        { id: uid(), name: "그릇·기타", cost: "200" },
      ],
    },
    {
      id: uid(), name: "하이볼", price: "8000", category: "주류",
      ingredients: [
        { id: uid(), name: "위스키 30ml", cost: "1200" },
        { id: uid(), name: "탄산수·얼음", cost: "300" },
        { id: uid(), name: "글라스·가니쉬", cost: "200" },
      ],
    },
  ],
  finedining: [
    {
      id: uid(), name: "전채 (아뮤즈부쉬)", price: "15000", category: "푸드",
      ingredients: [
        { id: uid(), name: "식재료 (계절재료)", cost: "3500" },
        { id: uid(), name: "플레이팅 소스·허브", cost: "800" },
        { id: uid(), name: "식기 소모품", cost: "300" },
      ],
    },
    {
      id: uid(), name: "파스타 메인", price: "32000", category: "푸드",
      ingredients: [
        { id: uid(), name: "생면·트러플오일", cost: "4500" },
        { id: uid(), name: "관자·버섯", cost: "5000" },
        { id: uid(), name: "파르미지아노·허브", cost: "1200" },
      ],
    },
    {
      id: uid(), name: "와인 글라스", price: "18000", category: "주류",
      ingredients: [
        { id: uid(), name: "와인 원가 (1잔)", cost: "5500" },
        { id: uid(), name: "글라스 감가", cost: "300" },
      ],
    },
    {
      id: uid(), name: "디저트 플레이트", price: "16000", category: "디저트",
      ingredients: [
        { id: uid(), name: "디저트 재료", cost: "3200" },
        { id: uid(), name: "소스·장식", cost: "800" },
        { id: uid(), name: "식기 소모품", cost: "200" },
      ],
    },
  ],
  gogi: [
    {
      id: uid(), name: "삼겹살 200g", price: "16000", category: "푸드",
      ingredients: [
        { id: uid(), name: "삼겹살 원육 200g", cost: "4200" },
        { id: uid(), name: "쌈채소·쌈장", cost: "600" },
        { id: uid(), name: "가스비·집게·호일", cost: "300" },
      ],
    },
    {
      id: uid(), name: "목살 200g", price: "15000", category: "푸드",
      ingredients: [
        { id: uid(), name: "목살 원육 200g", cost: "3800" },
        { id: uid(), name: "쌈채소·쌈장", cost: "600" },
        { id: uid(), name: "가스비·소모품", cost: "300" },
      ],
    },
    {
      id: uid(), name: "항정살 150g", price: "18000", category: "푸드",
      ingredients: [
        { id: uid(), name: "항정살 원육 150g", cost: "5500" },
        { id: uid(), name: "쌈채소·소스", cost: "600" },
        { id: uid(), name: "가스비·소모품", cost: "300" },
      ],
    },
    {
      id: uid(), name: "냉면", price: "8000", category: "푸드",
      ingredients: [
        { id: uid(), name: "냉면 면·육수", cost: "1500" },
        { id: uid(), name: "고명·겨자·식초", cost: "400" },
        { id: uid(), name: "그릇·기타", cost: "100" },
      ],
    },
    {
      id: uid(), name: "된장찌개", price: "3000", category: "푸드",
      ingredients: [
        { id: uid(), name: "된장·두부·호박", cost: "700" },
        { id: uid(), name: "뚝배기 가스비", cost: "150" },
      ],
    },
    {
      id: uid(), name: "소주 1병", price: "5000", category: "주류",
      ingredients: [
        { id: uid(), name: "소주 원가", cost: "1100" },
        { id: uid(), name: "컵", cost: "50" },
      ],
    },
  ],
};

const INDUSTRY_INFO: Record<IndustryKey, { label: string; emoji: string; color: string; bg: string }> = {
  cafe:       { label: "카페",       emoji: "☕", color: "#3182F6", bg: "#EBF3FF" },
  restaurant: { label: "음식점",     emoji: "🍽️", color: "#059669", bg: "#ECFDF5" },
  bar:        { label: "술집/바",    emoji: "🍺", color: "#7C3AED", bg: "#F5F3FF" },
  finedining: { label: "파인다이닝", emoji: "✨", color: "#D97706", bg: "#FFFBEB" },
  gogi:       { label: "고깃집",     emoji: "🥩", color: "#DC2626", bg: "#FEF2F2" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MenuCostPage() {
  const [industry, setIndustry] = useState<IndustryKey>("cafe");
  const [menus, setMenus] = useState<MenuItem[]>(INDUSTRY_PRESETS["cafe"]);
  const [filterCategory, setFilterCategory] = useState("전체");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

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
    setMenus(INDUSTRY_PRESETS[key].map(m => ({
      ...m,
      id: uid(),
      ingredients: m.ingredients.map(i => ({ ...i, id: uid() })),
    })));
    setFilterCategory("전체");
  }
  const [sortBy, setSortBy] = useState<"default" | "costRatio" | "profit">("default");

  const addMenu = useCallback(() => {
    setMenus((prev) => [
      ...prev,
      {
        id: uid(),
        name: "",
        price: "",
        category: "음료",
        ingredients: [{ id: uid(), name: "", cost: "" }],
      },
    ]);
  }, []);

  const updateMenu = useCallback((id: string, updated: Partial<MenuItem>) => {
    setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
  }, []);

  const deleteMenu = useCallback((id: string) => {
    setMenus((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // 집계
  const allCalc = menus.map((m) => ({ item: m, calc: calcMenu(m) }));
  const validMenus = allCalc.filter((m) => m.calc.price > 0);

  const avgCostRatio =
    validMenus.length > 0
      ? validMenus.reduce((s, m) => s + m.calc.costRatio, 0) / validMenus.length
      : 0;
  const avgProfit =
    validMenus.length > 0
      ? validMenus.reduce((s, m) => s + m.calc.profit, 0) / validMenus.length
      : 0;
  const dangerCount = validMenus.filter((m) => m.calc.costRatio > 40).length;
  const bestMenu = validMenus.length > 0
    ? validMenus.reduce((best, m) => (m.calc.profitRatio > best.calc.profitRatio ? m : best), validMenus[0])
    : null;

  // 필터 + 정렬
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
        @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        body{font-family:'Pretendard',-apple-system,sans-serif}
      `}</style>

      <NavBar />
      <ToolNav />
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
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
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              메뉴별 원가 계산기
            </h1>
            <p className="text-slate-500 text-sm">
              메뉴별 식재료 원가를 입력하면 원가율과 건당 순이익을 자동으로 계산합니다.
            </p>
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

          {/* 요약 대시보드 */}
          {validMenus.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-1">분석 메뉴</p>
                <p className="text-2xl font-extrabold text-slate-900">{validMenus.length}개</p>
              </div>
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-1">평균 원가율</p>
                <p
                  className="text-2xl font-extrabold"
                  style={{
                    color: avgCostRatio <= 30 ? "#059669" : avgCostRatio <= 40 ? "#D97706" : "#EF4444",
                  }}
                >
                  {avgCostRatio.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
                <p className="text-xs text-slate-400 mb-1">평균 건당 순익</p>
                <p className="text-2xl font-extrabold text-slate-900">{fmt(Math.round(avgProfit))}원</p>
              </div>
              <div className={`rounded-2xl shadow-sm ring-1 p-4 ${dangerCount > 0 ? "bg-red-50 ring-red-200" : "bg-white ring-slate-200"}`}>
                <p className={`text-xs mb-1 ${dangerCount > 0 ? "text-red-400" : "text-slate-400"}`}>원가율 위험 메뉴</p>
                <p className={`text-2xl font-extrabold ${dangerCount > 0 ? "text-red-500" : "text-slate-300"}`}>
                  {dangerCount}개
                </p>
              </div>
            </div>
          )}

          {/* 최우수 메뉴 배너 */}
          {bestMenu && (
            <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-5 mb-6 flex items-center gap-4">
              <span className="text-3xl">🏆</span>
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-0.5">마진율 최고 메뉴</p>
                <p className="text-white font-bold text-lg">{bestMenu.item.name || "미입력 메뉴"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-0.5">마진율</p>
                <p className="text-emerald-400 font-extrabold text-xl">{bestMenu.calc.profitRatio.toFixed(1)}%</p>
              </div>
            </div>
          )}

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
          {validMenus.length > 1 && (
            <section className="mt-10 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">전체 메뉴 원가 비교</h2>
                <p className="text-xs text-slate-400 mt-0.5">판매가 입력된 메뉴만 표시됩니다</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                      <th className="px-6 py-3 text-left">메뉴</th>
                      <th className="px-4 py-3 text-right">판매가</th>
                      <th className="px-4 py-3 text-right">원가</th>
                      <th className="px-4 py-3 text-right">원가율</th>
                      <th className="px-4 py-3 text-right">건당 순익</th>
                      <th className="px-4 py-3 text-center">평가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validMenus
                      .sort((a, b) => a.calc.costRatio - b.calc.costRatio)
                      .map((m) => {
                        const statusColor =
                          m.calc.costRatio <= 30 ? "#059669" : m.calc.costRatio <= 40 ? "#D97706" : "#EF4444";
                        const statusLabel =
                          m.calc.costRatio <= 30 ? "우수" : m.calc.costRatio <= 40 ? "양호" : "위험";
                        return (
                          <tr key={m.item.id} className="hover:bg-slate-50 transition">
                            <td className="px-6 py-4">
                              <span className="font-semibold text-slate-800">{m.item.name || "—"}</span>
                              <span
                                className="ml-2 text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  background: `${CATEGORY_COLOR[m.item.category] ?? "#9EA6B3"}18`,
                                  color: CATEGORY_COLOR[m.item.category] ?? "#9EA6B3",
                                }}
                              >
                                {m.item.category}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right text-slate-600">{fmt(m.calc.price)}원</td>
                            <td className="px-4 py-4 text-right text-slate-600">{fmt(m.calc.costTotal)}원</td>
                            <td className="px-4 py-4 text-right font-bold" style={{ color: statusColor }}>
                              {m.calc.costRatio.toFixed(1)}%
                            </td>
                            <td className={`px-4 py-4 text-right font-semibold ${m.calc.profit >= 0 ? "text-slate-900" : "text-red-500"}`}>
                              {fmt(m.calc.profit)}원
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className="px-2.5 py-1 rounded-full text-xs font-bold"
                                style={{ background: `${statusColor}18`, color: statusColor }}
                              >
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 하단 팁 */}
          <div className="mt-8 rounded-2xl bg-slate-100 px-5 py-4 text-xs text-slate-500 leading-relaxed">
            💡 <strong className="text-slate-700">Tip.</strong> 원가율이 높은 메뉴는 식재료 공급처 변경, 레시피 조정, 또는 판매가 인상을 검토해 보세요.
            배달 채널에서는 포장재·배달비까지 원가에 포함해야 실제 마진을 정확히 파악할 수 있습니다.
          </div>

        </div>
      </main>
    </>
  );
}
