"use client";

import { useEffect, useState, useCallback } from "react";
import UpgradeModal from "@/components/UpgradeModal";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { usePlan } from "@/lib/usePlan";

type Store = {
  id: string;
  name: string;
  industry: string | null;
  address: string | null;
  created_at: string;
};

const INDUSTRY_OPTIONS = [
  { value: "cafe", label: "카페" },
  { value: "restaurant", label: "음식점" },
  { value: "bar", label: "술집/바" },
  { value: "finedining", label: "파인다이닝" },
  { value: "gogi", label: "고깃집" },
  { value: "bakery", label: "베이커리" },
  { value: "other", label: "기타" },
];

const INDUSTRY_ICON: Record<string, string> = {
  cafe: "☕",
  restaurant: "🍽️",
  bar: "🍺",
  finedining: "✨",
  gogi: "🥩",
  bakery: "🥐",
  other: "🏪",
};

export default function StoresPage() {
  const { plan, userId, loading: planLoading } = usePlan();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const maxStores = plan === "standard" ? 5 : 1;

  const fetchStores = useCallback(async () => {
    if (!userId) return;
    const sb = createSupabaseBrowserClient();
    const { data } = await sb
      .from("stores")
      .select("id, name, industry, address, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    setStores((data ?? []) as Store[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (planLoading) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchStores();
    // Restore active store from localStorage
    const saved = localStorage.getItem("vela-active-store");
    if (saved) setActiveStoreId(saved);
  }, [planLoading, userId, fetchStores]);

  const handleSelectStore = (id: string) => {
    setActiveStoreId(id);
    localStorage.setItem("vela-active-store", id);
  };

  const handleAddStore = async () => {
    if (!formName.trim()) return;
    if (stores.length >= maxStores) {
      setShowUpgrade(true);
      return;
    }
    setSaving(true);
    const sb = createSupabaseBrowserClient();
    const { error } = await sb.from("stores").insert({
      user_id: userId,
      name: formName.trim(),
      industry: formIndustry || null,
      address: formAddress.trim() || null,
    });
    if (!error) {
      setFormName("");
      setFormIndustry("");
      setFormAddress("");
      setShowForm(false);
      await fetchStores();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 매장을 삭제하시겠습니까?")) return;
    setDeleting(id);
    const sb = createSupabaseBrowserClient();
    await sb.from("stores").delete().eq("id", id);
    if (activeStoreId === id) {
      localStorage.removeItem("vela-active-store");
      setActiveStoreId(null);
    }
    await fetchStores();
    setDeleting(null);
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  if (planLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded-2xl w-48" />
          <div className="h-40 bg-slate-200 rounded-3xl" />
          <div className="h-40 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 text-center">
          <p className="text-slate-500 text-lg mt-20">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">다점포 관리</h1>
            <p className="text-sm text-slate-500 mt-1">
              매장 {stores.length}/{maxStores}개 사용 중
              {plan !== "standard" && (
                <span className="ml-2 text-xs text-blue-600 cursor-pointer hover:underline" onClick={() => setShowUpgrade(true)}>
                  Pro로 업그레이드
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => {
              if (stores.length >= maxStores) {
                setShowUpgrade(true);
                return;
              }
              setShowForm(true);
            }}
            className="rounded-2xl bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-blue-700 transition"
          >
            + 매장 추가
          </button>
        </div>

        {/* Add Store Form */}
        {showForm && (
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">새 매장 등록</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">매장 이름 *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 벨라 카페 강남점"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">업종</label>
                <select
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택하세요</option>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">주소</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleAddStore}
                disabled={!formName.trim() || saving}
                className="rounded-xl bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "저장 중..." : "등록하기"}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormName(""); setFormIndustry(""); setFormAddress(""); }}
                className="rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold px-5 py-2.5 hover:bg-slate-200 transition"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Store List */}
        {stores.length === 0 ? (
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-12 text-center shadow-sm">
            <div className="text-4xl mb-3">🏪</div>
            <p className="text-slate-500 text-sm">등록된 매장이 없습니다.</p>
            <p className="text-slate-400 text-xs mt-1">위의 &quot;매장 추가&quot; 버튼으로 첫 매장을 등록하세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => {
              const isActive = activeStoreId === store.id;
              return (
                <div
                  key={store.id}
                  className={`rounded-3xl bg-white ring-1 p-5 shadow-sm transition cursor-pointer ${
                    isActive ? "ring-blue-500 ring-2 bg-blue-50/30" : "ring-slate-200 hover:ring-slate-300"
                  }`}
                  onClick={() => handleSelectStore(store.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                        {INDUSTRY_ICON[store.industry ?? ""] ?? "🏪"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">{store.name}</h3>
                          {isActive && (
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              활성
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {INDUSTRY_OPTIONS.find((o) => o.value === store.industry)?.label ?? "미설정"}
                          {store.address && <span className="ml-2 text-slate-400">| {store.address}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 hidden sm:inline">{fmtDate(store.created_at)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(store.id); }}
                        disabled={deleting === store.id}
                        className="text-xs text-red-400 hover:text-red-600 transition font-medium disabled:opacity-50"
                      >
                        {deleting === store.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Capacity notice */}
        {stores.length >= maxStores && plan !== "standard" && (
          <div className="mt-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 text-center">
            <p className="text-sm text-amber-800">
              무료/프로 요금제는 매장 1개까지 이용 가능합니다.{" "}
              <span className="font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => setShowUpgrade(true)}>
                Pro 업그레이드로 최대 5개 매장
              </span>
              을 관리하세요.
            </p>
          </div>
        )}
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="다점포 관리는 Pro 기능입니다"
        description="Pro 요금제로 업그레이드하면 최대 5개 매장을 등록하고 한 곳에서 편리하게 관리할 수 있습니다."
      />
    </div>
  );
}
