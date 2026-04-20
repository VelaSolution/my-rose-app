"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// xlsx는 파일 업로드 시에만 동적 로드 (311KB 번들 절감)
import { fmt } from "@/lib/vela";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";

type AnalysisResult = {
  totalOrders: number | null;
  totalSales: number | null;
  totalFees: number | null;
  netSales: number | null;
  avgOrderAmount: number | null;
  feeRate: number | null;
  profitPerOrder: number | null;
  peakDay: string | null;
  topMenus: string[] | null;
  summary: string;
};

type DeliveryData = {
  platform: "baemin" | "coupang" | "yogiyo";
  lastResult: AnalysisResult | null;
};

const KEY = "vela-delivery-analysis";
const defaultDeliveryData: DeliveryData = { platform: "baemin", lastResult: null };

export default function DeliveryAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<"baemin" | "coupang" | "yogiyo">("baemin");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const { data: cloudData, update: cloudUpdate, status: syncStatus, userId: syncUserId, error: syncError, retry: syncRetry } = useCloudSync<DeliveryData>(KEY, defaultDeliveryData);

  useEffect(() => {
    if (cloudData) {
      setPlatform(cloudData.platform);
      if (cloudData.lastResult) setResult(cloudData.lastResult);
    }
  }, [cloudData]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(""); }
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError("");

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csvText = XLSX.utils.sheet_to_csv(sheet);

      const res = await fetch("/api/delivery-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, platform, fileName: file.name }),
      });

      if (!res.ok) throw new Error("분석 실패");
      const analysisResult = await res.json();
      setResult(analysisResult);
      cloudUpdate({ ...cloudData, lastResult: analysisResult });
    } catch {
      setError("파일 분석에 실패했습니다. 정산서 파일이 맞는지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ToolNav />
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
      <div className="mx-auto max-w-3xl">
        <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>

        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>🛵</span> 배달 매출 분석
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">배달앱 매출 분석기</h1>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-sm">배달앱 정산서를 업로드하면 수수료·실매출·건당 이익을 자동 분석합니다.</p>
            <CloudSyncBadge status={syncStatus} userId={syncUserId} onRetry={syncRetry} />
            {syncError && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-100 text-sm">
                <span className="text-red-500">⚠️</span>
                <div className="flex-1"><p className="font-semibold text-red-700">클라우드 동기화 실패</p><p className="text-red-500 text-xs">데이터는 로컬에 저장되었습니다</p></div>
                <button onClick={syncRetry} className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition">재시도</button>
              </div>
            )}
          </div>
        </div>

        {/* 플랫폼 선택 */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "baemin" as const, label: "배달의민족", color: "bg-sky-50 text-sky-700 ring-sky-200" },
            { id: "coupang" as const, label: "쿠팡이츠", color: "bg-green-50 text-green-700 ring-green-200" },
            { id: "yogiyo" as const, label: "요기요", color: "bg-red-50 text-red-700 ring-red-200" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => { setPlatform(p.id); cloudUpdate({ ...cloudData, platform: p.id }); }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${platform === p.id ? p.color : "bg-white text-slate-400 ring-slate-200"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 파일 업로드 */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 mb-6">
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-slate-200 rounded-2xl py-10 text-center hover:border-slate-300 transition">
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm font-semibold text-slate-600">
                {file ? file.name : "정산서 파일을 선택하세요"}
              </p>
              <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv 지원</p>
            </div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          </label>

          <button
            onClick={analyze}
            disabled={!file || loading}
            className="mt-4 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {loading ? "분석 중..." : "분석하기"}
          </button>
        </div>

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 mb-6">{error}</div>}

        {/* 결과 */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "총 주문 수", value: result.totalOrders ? `${fmt(result.totalOrders)}건` : "—" },
                { label: "총 매출", value: result.totalSales ? `${fmt(result.totalSales)}원` : "—" },
                { label: "수수료 합계", value: result.totalFees ? `${fmt(result.totalFees)}원` : "—", color: "text-red-500" },
                { label: "실 수령액", value: result.netSales ? `${fmt(result.netSales)}원` : "—", color: "text-emerald-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color ?? "text-slate-900"}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3">상세 분석</h3>
              <div className="space-y-3 text-sm text-slate-600">
                {result.feeRate != null && <p>수수료율: <span className="font-bold text-red-500">{result.feeRate.toFixed(1)}%</span></p>}
                {result.avgOrderAmount != null && <p>건당 평균 주문액: <span className="font-bold">{fmt(result.avgOrderAmount)}원</span></p>}
                {result.profitPerOrder != null && <p>건당 실수령: <span className="font-bold text-emerald-600">{fmt(result.profitPerOrder)}원</span></p>}
                {result.peakDay && <p>최다 주문 요일: <span className="font-bold">{result.peakDay}</span></p>}
                {result.topMenus && result.topMenus.length > 0 && <p>인기 메뉴: <span className="font-bold">{result.topMenus.join(", ")}</span></p>}
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <h3 className="text-sm font-semibold mb-2">AI 분석 요약</h3>
              <p className="text-sm leading-7 text-slate-300">{result.summary}</p>
            </div>
          </div>
        )}
      </div>
    </main>
    </>
  );
}
