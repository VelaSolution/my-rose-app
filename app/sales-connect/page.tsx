"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { fmt } from "@/lib/vela";

/* ── 탭 ── */
type Tab = "hall" | "delivery";

/* ── 배달 플랫폼 ── */
type DeliveryPlatform = "baemin" | "yogiyo" | "coupang";

const DELIVERY_PLATFORMS: {
  id: DeliveryPlatform;
  name: string;
  icon: string;
  color: string;
  activeColor: string;
  guide: string[];
}[] = [
  {
    id: "baemin",
    name: "배달의민족",
    icon: "🟦",
    color: "bg-sky-50 text-sky-700 ring-sky-200",
    activeColor: "bg-sky-600 text-white ring-sky-600",
    guide: [
      "배민셀프서비스(self.baemin.com) 로그인",
      "'정산' → '정산내역' → 기간 선택",
      "'엑셀 다운로드' 클릭",
      "다운로드된 파일을 아래에 업로드",
    ],
  },
  {
    id: "yogiyo",
    name: "요기요",
    icon: "🟥",
    color: "bg-red-50 text-red-700 ring-red-200",
    activeColor: "bg-red-600 text-white ring-red-600",
    guide: [
      "요기요 사장님(ceo.yogiyo.co.kr) 로그인",
      "'정산관리' → '정산내역' → 기간 선택",
      "'엑셀 다운로드' 클릭",
      "다운로드된 파일을 아래에 업로드",
    ],
  },
  {
    id: "coupang",
    name: "쿠팡이츠",
    icon: "🟩",
    color: "bg-green-50 text-green-700 ring-green-200",
    activeColor: "bg-green-600 text-white ring-green-600",
    guide: [
      "쿠팡이츠 파트너 사이트 로그인",
      "'정산' → '정산내역' → 기간 선택",
      "'다운로드' 클릭",
      "다운로드된 파일을 아래에 업로드",
    ],
  },
];

/* ── 배달 분석 결과 타입 ── */
type DeliveryResult = {
  totalSales: number | null;
  totalOrders: number | null;
  totalFees: number | null;
  netSales: number | null;
  avgOrderAmount: number | null;
  feeRate: number | null;
  peakDay: string | null;
  topMenus: string[] | null;
  dataStartDate: string | null;
  dataEndDate: string | null;
  summary: string;
  _truncated: boolean;
};

/* ── 숫자 헬퍼 ── */
function num(v: string) {
  return Number(v.replace(/,/g, "")) || 0;
}

function fmtInput(v: string) {
  const n = num(v);
  return n ? n.toLocaleString("ko-KR") : "";
}

const currentMonth = new Date().toISOString().slice(0, 7);

/* ════════════════════════════════════════════
   페이지
   ════════════════════════════════════════════ */
export default function SalesConnectPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hall");

  /* ── 홀 매출 상태 ── */
  const [hallSales, setHallSales] = useState("");
  const [targetMonth, setTargetMonth] = useState(currentMonth);
  const [hallSaving, setHallSaving] = useState(false);
  const [hallSaved, setHallSaved] = useState(false);
  const [hallError, setHallError] = useState("");

  /* ── 저장된 이번달 데이터 로드 ── */
  const [existingHall, setExistingHall] = useState<number | null>(null);
  const [existingDelivery, setExistingDelivery] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }

      const { data } = await supabase
        .from("monthly_snapshots")
        .select("monthly_sales, delivery_sales")
        .eq("user_id", user.id)
        .eq("month", targetMonth)
        .maybeSingle();

      if (data) {
        setExistingHall(data.monthly_sales ?? null);
        setExistingDelivery(data.delivery_sales ?? null);
        if (data.monthly_sales) setHallSales(String(data.monthly_sales));
      } else {
        setExistingHall(null);
        setExistingDelivery(null);
        setHallSales("");
      }
      setLoaded(true);
    }
    setLoaded(false);
    setHallSaved(false);
    load();
  }, [targetMonth]);

  /* ── 홀 매출 저장 ── */
  const saveHall = async () => {
    const sales = num(hallSales);
    if (!sales) return;
    setHallSaving(true);
    setHallError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/sales-connect");
        return;
      }

      await supabase.from("monthly_snapshots").upsert(
        {
          user_id: user.id,
          month: targetMonth,
          monthly_sales: sales,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,month" },
      );

      setExistingHall(sales);
      setHallSaved(true);
      setTimeout(() => setHallSaved(false), 3000);
    } catch {
      setHallError("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setHallSaving(false);
    }
  };

  /* ── 배달 매출 상태 ── */
  const [dPlatform, setDPlatform] = useState<DeliveryPlatform>("baemin");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dLoading, setDLoading] = useState(false);
  const [dError, setDError] = useState("");
  const [dResult, setDResult] = useState<DeliveryResult | null>(null);
  const [dSaving, setDSaving] = useState(false);
  const [dSaved, setDSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedPlatform = DELIVERY_PLATFORMS.find((p) => p.id === dPlatform)!;
  const [showGuide, setShowGuide] = useState(false);

  const handleFile = (f: File | null) => {
    if (f) {
      setFile(f);
      setDResult(null);
      setDError("");
      setDSaved(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  };

  const analyzeDelivery = async () => {
    if (!file) return;
    setDLoading(true);
    setDError("");

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csvText = XLSX.utils.sheet_to_csv(sheet);

      const res = await fetch("/api/sales-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, platform: dPlatform, fileName: file.name }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "분석 실패" }));
        throw new Error(err.error ?? "분석 실패");
      }

      const data: DeliveryResult = await res.json();
      setDResult(data);
    } catch (e) {
      setDError(e instanceof Error ? e.message : "분석에 실패했습니다.");
    } finally {
      setDLoading(false);
    }
  };

  const saveDelivery = async () => {
    if (!dResult?.totalSales) return;
    setDSaving(true);
    setDError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/sales-connect");
        return;
      }

      const month = dResult.dataStartDate
        ? dResult.dataStartDate.slice(0, 7)
        : targetMonth;

      await supabase.from("monthly_snapshots").upsert(
        {
          user_id: user.id,
          month,
          delivery_sales: dResult.totalSales,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,month" },
      );

      setExistingDelivery(dResult.totalSales);
      setDSaved(true);
    } catch {
      setDError("저장에 실패했습니다.");
    } finally {
      setDSaving(false);
    }
  };

  /* ── 통합 요약 ── */
  const hallVal = existingHall ?? num(hallSales);
  const deliveryVal = existingDelivery ?? dResult?.totalSales ?? 0;
  const totalSales = hallVal + deliveryVal;
  const deliveryRatio = totalSales > 0 ? Math.round((deliveryVal / totalSales) * 100) : 0;

  const monthLabel = `${targetMonth.slice(0, 4)}년 ${parseInt(targetMonth.slice(5))}월`;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 pt-20 pb-24 md:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition">
          ← 대시보드
        </Link>

        {/* 헤더 */}
        <div className="mt-4 mb-5">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-2">
            <span>🔗</span> 매출 연동
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">매출 입력</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">홀 매출은 직접 입력, 배달 매출은 정산서 업로드로 관리하세요.</p>
        </div>

        {/* 월 선택 */}
        <div className="flex items-center gap-3 mb-5">
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            max={currentMonth}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400 transition"
          />
          {targetMonth === currentMonth && (
            <span className="text-xs text-indigo-500 font-semibold">이번 달</span>
          )}
        </div>

        {/* ── 통합 요약 카드 ── */}
        {loaded && totalSales > 0 && (
          <div className="rounded-2xl sm:rounded-3xl bg-slate-900 p-5 sm:p-6 mb-5 text-white">
            <p className="text-[11px] sm:text-xs text-slate-400 mb-0.5">{monthLabel} 총 매출</p>
            <p className="text-2xl sm:text-3xl font-extrabold mb-3">{fmt(totalSales)}원</p>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <p className="text-[11px] text-slate-400 mb-1">홀</p>
                <p className="text-sm font-bold truncate">{hallVal ? `${fmt(hallVal)}` : "—"}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <p className="text-[11px] text-slate-400 mb-1">배달</p>
                <p className="text-sm font-bold truncate">{deliveryVal ? `${fmt(deliveryVal)}` : "—"}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-center">
                <p className="text-[11px] text-slate-400 mb-1">배달 비중</p>
                <p className="text-sm font-bold">{deliveryRatio}%</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 탭 ── */}
        <div className="flex gap-2 mb-5">
          {[
            { id: "hall" as Tab, label: "홀 매출", icon: "🏪" },
            { id: "delivery" as Tab, label: "배달 매출", icon: "🛵" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-2xl py-4 text-sm font-bold transition active:scale-[0.98] ${
                tab === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════
            홀 매출 탭
           ════════════════════════════════════ */}
        {tab === "hall" && (
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 p-5 sm:p-6">
            <h2 className="font-bold text-slate-900 dark:text-white mb-0.5">{monthLabel} 홀 매출</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">POS에 찍힌 홀(매장) 매출 총액만 입력하세요.</p>

            <div className="relative mb-4">
              <input
                type="text"
                inputMode="numeric"
                value={fmtInput(hallSales)}
                onChange={(e) => {
                  setHallSales(e.target.value.replace(/[^0-9]/g, ""));
                  setHallSaved(false);
                }}
                placeholder="15,000,000"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white px-4 py-4 text-right text-lg sm:text-xl font-extrabold pr-10 outline-none focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">원</span>
            </div>

            {hallError && (
              <p className="text-sm text-red-500 mb-3">{hallError}</p>
            )}

            <button
              onClick={saveHall}
              disabled={hallSaving || !num(hallSales)}
              className="w-full rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: hallSaved ? "#059669" : "#0f172a" }}
            >
              {hallSaving ? "저장 중..." : hallSaved ? "저장 완료!" : "저장하기"}
            </button>

            {existingHall && !hallSaved && (
              <p className="text-center text-xs text-slate-400 mt-3">
                기존 입력값: {fmt(existingHall)}원
              </p>
            )}
          </div>
        )}

        {/* ════════════════════════════════════
            배달 매출 탭
           ════════════════════════════════════ */}
        {tab === "delivery" && (
          <div className="space-y-3 sm:space-y-4">
            {/* 플랫폼 선택 */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 p-5 sm:p-6">
              <h2 className="font-bold text-slate-900 dark:text-white mb-3">배달앱 선택</h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {DELIVERY_PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setDPlatform(p.id); setFile(null); setDResult(null); setDError(""); setDSaved(false); }}
                    className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center ring-1 transition active:scale-[0.97] ${
                      dPlatform === p.id ? p.activeColor : p.color
                    }`}
                  >
                    <div className="text-lg sm:text-xl mb-0.5">{p.icon}</div>
                    <div className="text-[11px] sm:text-xs font-bold">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 파일 업로드 */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-900 dark:text-white">정산서 업로드</h2>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs text-indigo-500 font-semibold active:text-indigo-700 transition"
                >
                  {showGuide ? "가이드 닫기" : "다운로드 방법?"}
                </button>
              </div>

              {/* 접이식 가이드 */}
              {showGuide && (
                <div className="mb-3 rounded-xl bg-slate-50 dark:bg-slate-900 p-3 sm:p-4">
                  <p className="text-xs font-bold text-slate-600 mb-2">{selectedPlatform.name} 정산서 내려받기</p>
                  <ol className="space-y-1.5">
                    {selectedPlatform.guide.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-500">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl py-10 text-center transition active:scale-[0.99] ${
                  dragOver
                    ? "border-indigo-400 bg-indigo-50"
                    : file
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 active:border-slate-300"
                }`}
              >
                <p className="text-2xl mb-1">{file ? "✅" : "📂"}</p>
                <p className="text-sm font-semibold text-slate-600">
                  {file ? file.name : "탭하여 정산서 파일 선택"}
                </p>
                <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />

              {file && !dResult && (
                <button
                  onClick={analyzeDelivery}
                  disabled={dLoading}
                  className="mt-3 w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white active:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.98]"
                >
                  {dLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      AI 분석 중...
                    </span>
                  ) : (
                    "분석하기"
                  )}
                </button>
              )}
            </div>

            {dError && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{dError}</div>
            )}

            {/* 분석 결과 */}
            {dResult && (
              <>
                {dResult._truncated && (
                  <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs sm:text-sm text-amber-700">
                    데이터가 많아 상위 300행만 분석했습니다.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { label: "총 매출", value: dResult.totalSales ? `${fmt(dResult.totalSales)}원` : "—" },
                    { label: "총 건수", value: dResult.totalOrders ? `${fmt(dResult.totalOrders)}건` : "—" },
                    { label: "수수료", value: dResult.totalFees ? `${fmt(dResult.totalFees)}원` : "—", color: "text-red-500" },
                    { label: "실수령", value: dResult.netSales ? `${fmt(dResult.netSales)}원` : "—", color: "text-emerald-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 p-3 sm:p-4 ring-1 ring-slate-200 dark:ring-slate-700">
                      <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mb-0.5">{s.label}</p>
                      <p className={`text-base sm:text-lg font-bold truncate ${s.color ?? "text-slate-900 dark:text-white"}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 p-5 sm:p-6 ring-1 ring-slate-200 dark:ring-slate-700">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">상세</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    {dResult.feeRate != null && (
                      <p>수수료율: <span className="font-bold text-red-500">{dResult.feeRate.toFixed(1)}%</span></p>
                    )}
                    {dResult.avgOrderAmount != null && (
                      <p>건당 평균: <span className="font-bold">{fmt(dResult.avgOrderAmount)}원</span></p>
                    )}
                    {dResult.peakDay && (
                      <p>최다 주문 요일: <span className="font-bold">{dResult.peakDay}</span></p>
                    )}
                    {dResult.topMenus && dResult.topMenus.length > 0 && (
                      <p>인기 메뉴: <span className="font-bold">{dResult.topMenus.join(", ")}</span></p>
                    )}
                    {dResult.dataStartDate && dResult.dataEndDate && (
                      <p>기간: <span className="font-bold">{dResult.dataStartDate} ~ {dResult.dataEndDate}</span></p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl sm:rounded-3xl bg-slate-900 p-5 sm:p-6 text-white">
                  <h3 className="text-xs sm:text-sm font-semibold mb-2">AI 분석 요약</h3>
                  <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-slate-300">{dResult.summary}</p>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => { setFile(null); setDResult(null); setDError(""); setDSaved(false); }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 px-4 sm:px-5 py-4 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700 transition active:scale-[0.98]"
                  >
                    다시 업로드
                  </button>
                  <button
                    onClick={saveDelivery}
                    disabled={dSaving || dSaved || !dResult.totalSales}
                    className="flex-1 rounded-2xl py-4 text-xs sm:text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: dSaved ? "#059669" : "#0f172a" }}
                  >
                    {dSaving ? "저장 중..." : dSaved ? "저장 완료!" : "배달 매출로 저장"}
                  </button>
                </div>

                {dSaved && (
                  <p className="text-center text-xs text-emerald-600 font-semibold">
                    {dResult.dataStartDate?.slice(0, 7) ?? monthLabel} 배달 매출에 반영되었습니다
                  </p>
                )}
              </>
            )}

            {/* 기존 배달 데이터 표시 */}
            {!dResult && existingDelivery && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-700">
                {monthLabel} 배달 매출 입력 완료: <span className="font-bold">{fmt(existingDelivery)}원</span>
              </div>
            )}
          </div>
        )}

        {/* ── 하단 안내 ── */}
        <div className="mt-6 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 sm:p-5">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">이렇게 활용돼요</p>
          <ul className="space-y-1.5 text-xs text-slate-500">
            <li>• 입력한 매출은 <Link href="/my-store" className="text-indigo-500 underline">내 매장 현황</Link>에서 월별 추이로 확인</li>
            <li>• <Link href="/simulator" className="text-indigo-500 underline">시뮬레이터</Link>에서 수익성 분석에 활용</li>
            <li>• 배달 수수료 분석으로 플랫폼별 수익성 비교 가능</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
