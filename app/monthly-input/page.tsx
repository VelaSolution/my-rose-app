"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { saveQuickData, applyQuickToSimulator } from "@/lib/quickStore";
import { fmt } from "@/lib/vela";

function num(v: string) { return Number(v.replace(/,/g, "")) || 0; }

const INDUSTRY_OPTIONS = [
  { id: "cafe", label: "☕ 카페" },
  { id: "restaurant", label: "🍽️ 음식점" },
  { id: "bar", label: "🍺 술집/바" },
  { id: "finedining", label: "✨ 파인다이닝" },
  { id: "gogi", label: "🥩 고깃집" },
];

const currentMonth = new Date().toISOString().slice(0, 7);
const monthLabel = `${currentMonth.slice(0, 4)}년 ${parseInt(currentMonth.slice(5))}월`;

type Field = {
  key: string;
  label: string;
  hint?: string;
  placeholder: string;
  suffix?: string;
};

const FIELDS: Field[] = [
  { key: "monthlySales",  label: "이번 달 총 매출",     hint: "배달 포함 전체 매출",     placeholder: "15,000,000", suffix: "원" },
  { key: "rent",          label: "임대료",               hint: "관리비 포함",              placeholder: "1,500,000",  suffix: "원" },
  { key: "laborCost",     label: "인건비",               hint: "4대보험 사업주 부담 포함", placeholder: "3,500,000",  suffix: "원" },
  { key: "utilities",     label: "공과금",               hint: "전기·가스·수도·인터넷",   placeholder: "300,000",    suffix: "원" },
  { key: "marketing",     label: "마케팅비",             hint: "광고·SNS·이벤트",         placeholder: "200,000",    suffix: "원" },
  { key: "etc",           label: "기타 비용",            hint: "소모품·수리·기타",         placeholder: "300,000",    suffix: "원" },
];

export default function MonthlyInputPage() {
  const router = useRouter();
  const [industry, setIndustry] = useState("restaurant");
  const [seats, setSeats] = useState("");
  const [avgSpend, setAvgSpend] = useState("");
  const [cogsRate, setCogsRate] = useState("30");
  const [values, setValues] = useState<Record<string, string>>({});
  const [targetMonth, setTargetMonth] = useState(currentMonth);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 기존 데이터 불러오기
  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login?next=/monthly-input"); return; }

      const { data } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", targetMonth)
        .maybeSingle();

      if (data) {
        setIndustry(data.industry ?? "restaurant");
        setSeats(String(data.seats ?? ""));
        setAvgSpend(String(data.avg_spend ?? ""));
        setCogsRate(String(data.cogs_rate ?? 30));
        setValues({
          monthlySales: String(data.monthly_sales ?? ""),
          rent: String(data.rent ?? ""),
          laborCost: String(data.labor_cost ?? ""),
          utilities: String(data.utilities ?? ""),
          marketing: String(data.marketing ?? ""),
          etc: String(data.etc ?? ""),
        });
      }
      setLoading(false);
    }
    load();
  }, [targetMonth, router]);

  function set(key: string, v: string) {
    setValues(prev => ({ ...prev, [key]: v.replace(/[^0-9]/g, "") }));
  }

  // 계산
  const sales = num(values.monthlySales ?? "");
  const cogs = sales * (num(cogsRate) / 100);
  const totalCost = cogs
    + num(values.rent ?? "")
    + num(values.laborCost ?? "")
    + num(values.utilities ?? "")
    + num(values.marketing ?? "")
    + num(values.etc ?? "");
  const profit = sales - totalCost;
  const netMargin = sales > 0 ? (profit / sales) * 100 : 0;
  const laborRatio = sales > 0 ? (num(values.laborCost ?? "") / sales) * 100 : 0;
  const _cogsRatio = sales > 0 ? (cogs / sales) * 100 : 0;

  async function handleSave() {
    if (!sales) return;
    setSaving(true);

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      user_id: user.id,
      month: targetMonth,
      industry,
      monthly_sales: sales,
      seats: num(seats),
      avg_spend: num(avgSpend),
      rent: num(values.rent ?? ""),
      labor_cost: num(values.laborCost ?? ""),
      utilities: num(values.utilities ?? ""),
      marketing: num(values.marketing ?? ""),
      etc: num(values.etc ?? ""),
      cogs_rate: num(cogsRate),
      profit,
      net_margin: Math.round(netMargin * 10) / 10,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("monthly_snapshots").upsert(payload, { onConflict: "user_id,month" });

    // 이번 달이면 localStorage + 시뮬레이터도 업데이트
    if (targetMonth === currentMonth) {
      saveQuickData({
        industry,
        monthlySales: sales,
        seats: num(seats),
        avgSpend: num(avgSpend),
        rent: num(values.rent ?? ""),
        laborCost: num(values.laborCost ?? ""),
        cogsRate: num(cogsRate),
        etc: num(values.etc ?? ""),
        updatedAt: new Date().toISOString(),
        month: targetMonth,
      });
      applyQuickToSimulator({
        industry,
        monthlySales: sales,
        seats: num(seats),
        avgSpend: num(avgSpend),
        rent: num(values.rent ?? ""),
        laborCost: num(values.laborCost ?? ""),
        cogsRate: num(cogsRate),
        etc: num(values.etc ?? ""),
        updatedAt: new Date().toISOString(),
        month: targetMonth,
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </main>
  );

  return (
    <>
      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3 mt-4 mb-6">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-700 transition">← 월별 현황</Link>
          </div>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              📅 월별 입력
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">매장 현황 입력</h1>
            <p className="text-slate-500 text-sm">월별 데이터를 저장하면 트렌드 분석이 가능합니다.</p>
          </div>

          {/* 월 선택 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-5 mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">입력 월</label>
            <input
              type="month"
              value={targetMonth}
              onChange={e => { setTargetMonth(e.target.value); setSaved(false); }}
              max={currentMonth}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 font-semibold"
            />
            {targetMonth === currentMonth && (
              <span className="ml-3 text-xs text-blue-500 font-semibold">이번 달 · 시뮬레이터에 자동 반영</span>
            )}
          </div>

          {/* 업종 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-5 mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">업종</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {INDUSTRY_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setIndustry(opt.id)}
                  className={`rounded-2xl py-2.5 text-xs font-semibold transition ${
                    industry === opt.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-5 mb-4">
            <h2 className="font-bold text-slate-900 mb-4">기본 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">좌석 수</label>
                <div className="relative">
                  <input type="text" inputMode="numeric" value={seats}
                    onChange={e => setSeats(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="20"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-right pr-8 outline-none focus:border-blue-400 focus:bg-white transition" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">석</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">평균 객단가</label>
                <div className="relative">
                  <input type="text" inputMode="numeric"
                    value={avgSpend ? Number(avgSpend).toLocaleString("ko-KR") : ""}
                    onChange={e => setAvgSpend(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="15,000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-right pr-8 outline-none focus:border-blue-400 focus:bg-white transition" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 매출·비용 입력 */}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-5 mb-4">
            <h2 className="font-bold text-slate-900 mb-4">매출 & 비용</h2>
            <div className="space-y-3">
              {FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-4">
                  <div className="w-40 flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-700">{f.label}</p>
                    {f.hint && <p className="text-xs text-slate-400">{f.hint}</p>}
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="text" inputMode="numeric"
                      value={values[f.key] ? Number(values[f.key]).toLocaleString("ko-KR") : ""}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-right pr-8 outline-none transition focus:bg-white ${
                        f.key === "monthlySales"
                          ? "border-blue-200 bg-blue-50 font-semibold focus:border-blue-400"
                          : "border-slate-200 bg-slate-50 focus:border-slate-400"
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{f.suffix}</span>
                  </div>
                </div>
              ))}

              {/* 원가율 */}
              <div className="flex items-center gap-4 pt-2">
                <div className="w-40 flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-700">식재료 원가율</p>
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <input type="range" min="10" max="70" step="1"
                    value={cogsRate}
                    onChange={e => setCogsRate(e.target.value)}
                    className="flex-1 accent-slate-900" />
                  <span className="text-sm font-bold text-slate-900 w-10 text-right">{cogsRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 실시간 결과 미리보기 */}
          {sales > 0 && (
            <div className="rounded-3xl ring-1 p-5 mb-4"
              style={{ background: profit >= 0 ? "#f0fdf4" : "#fef2f2", borderColor: profit >= 0 ? "#bbf7d0" : "#fecaca" }}>
              <h2 className="font-bold mb-4" style={{ color: profit >= 0 ? "#166534" : "#991b1b" }}>
                {monthLabel} 예상 결과
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "총 매출", value: `${fmt(sales)}원`, color: "text-slate-900" },
                  { label: "순이익", value: `${fmt(Math.round(profit))}원`, color: profit >= 0 ? "text-emerald-600" : "text-red-500" },
                  { label: "순이익률", value: `${netMargin.toFixed(1)}%`, color: profit >= 0 ? "text-emerald-600" : "text-red-500" },
                  { label: "인건비 비율", value: `${laborRatio.toFixed(1)}%`, color: laborRatio > 35 ? "text-amber-600" : "text-slate-700" },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl bg-white p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                    <p className={`text-sm font-extrabold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="flex gap-3">
            <Link href="/dashboard"
              className="rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition text-center">
              현황 보기
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || !sales}
              className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-white transition disabled:opacity-40"
              style={{ background: saved ? "#059669" : "#0f172a" }}>
              {saving ? "저장 중..." : saved ? "✅ 저장 완료!" : "💾 저장하기"}
            </button>
          </div>

          {targetMonth === currentMonth && saved && (
            <p className="text-center text-xs text-slate-400 mt-3">
              시뮬레이터와 모든 도구에 자동 반영되었습니다
            </p>
          )}
        </div>
      </main>
    </>
  );
}
