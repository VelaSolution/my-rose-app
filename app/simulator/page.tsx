"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { usePlan } from "@/lib/usePlan";
import UpgradeModal from "@/components/UpgradeModal";
import Toggle from "@/components/Toggle";
import {
  INDUSTRY_CONFIG,
  VALID_INDUSTRIES,
  sanitizeFullForm,
  createEmptyForm,
  calcResult,
  calcReverse,
  fmt,
  pct,
  type IndustryKey,
  type FullForm,
} from "@/lib/vela";

const STORAGE_KEY = "vela-form-v3";
const MULTI_SAVE_KEY = "vela-saves-v1";

type SaveSlot = { id: string; label: string; savedAt: string; form: FullForm };

function getSaves(): SaveSlot[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(MULTI_SAVE_KEY) ?? "[]"); } catch { return []; }
}

function saveSlot(form: FullForm): string {
  const saves = getSaves();
  const now = new Date();
  const id = String(now.getTime());
  const label = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const newSave: SaveSlot = { id, label, savedAt: now.toISOString(), form };
  localStorage.setItem(MULTI_SAVE_KEY, JSON.stringify([newSave, ...saves].slice(0, 10)));
  return label;
}

function deleteSlot(id: string) {
  localStorage.setItem(MULTI_SAVE_KEY, JSON.stringify(getSaves().filter((s) => s.id !== id)));
}

// ─── 저장 목록 모달 ────────────────────────────────────────────
function SaveModal({
  onLoad,
  onClose,
}: {
  onLoad: (form: FullForm) => void;
  onClose: () => void;
}) {
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [cloudSaves, setCloudSaves] = useState<{id:string;label:string;form:FullForm;created_at:string}[]>([]);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [tab, setTab] = useState<"local"|"cloud">("cloud");

  useEffect(() => { setSaves(getSaves()); }, []);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(async ({ data: { user } }: { data: { user: { id: string; email?: string } | null } }) => {
      if (!user) { setCloudLoading(false); return; }
      const { data } = await sb
        .from("simulation_history")
        .select("id, label, created_at, form")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setCloudSaves((data ?? []) as {id:string;label:string;form:FullForm;created_at:string}[]);
      setCloudLoading(false);
    });
  }, []);

  const industryLabel: Record<string, string> = {
    cafe: "☕ 카페", restaurant: "🍽️ 음식점", bar: "🍺 바", finedining: "✨ 파인다이닝", gogi: "🥩 고깃집",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">저장된 값 불러오기</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-3 border-b border-slate-100">
          <button onClick={() => setTab("cloud")} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab==="cloud"?"bg-slate-900 text-white":"text-slate-500 hover:bg-slate-50"}`}>
            ☁️ 클라우드 ({cloudSaves.length})
          </button>
          <button onClick={() => setTab("local")} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab==="local"?"bg-slate-900 text-white":"text-slate-500 hover:bg-slate-50"}`}>
            💾 로컬 ({saves.length})
          </button>
        </div>

        {/* 클라우드 탭 */}
        {tab === "cloud" && (
          cloudLoading ? (
            <div className="px-6 py-12 text-center"><p className="text-slate-400 text-sm">불러오는 중...</p></div>
          ) : cloudSaves.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-3xl mb-3">☁️</p>
              <p className="text-sm text-slate-400">클라우드에 저장된 값이 없습니다.</p>
              <p className="text-xs text-slate-300 mt-1">결과 페이지에서 '☁️ 클라우드 저장'을 눌러보세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {cloudSaves.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {industryLabel[s.form?.industry] ?? s.form?.industry}
                      &nbsp;·&nbsp;{new Date(s.created_at).toLocaleDateString("ko-KR", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                    </p>
                  </div>
                  <button
                    onClick={() => { if(s.form) { onLoad(s.form); onClose(); } }}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 flex-shrink-0"
                  >
                    불러오기
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {/* 로컬 탭 */}
        {tab === "local" && (
          saves.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-sm text-slate-400">저장된 값이 없습니다.</p>
              <p className="text-xs text-slate-300 mt-1">'현재 값 저장' 버튼으로 저장해보세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {saves.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {industryLabel[s.form.industry] ?? s.form.industry}
                      &nbsp;·&nbsp; 좌석 {s.form.seats}석
                      &nbsp;·&nbsp; 객단가 {fmt(s.form.avgSpend)}원
                    </p>
                  </div>
                  <button
                    onClick={() => { onLoad(s.form); onClose(); }}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 flex-shrink-0"
                  >
                    불러오기
                  </button>
                  <button
                    onClick={() => { deleteSlot(s.id); setSaves(getSaves()); }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 flex-shrink-0"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        <div className="border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── POS 업로드 & AI 분석 ───────────────────────────────────────

type PosResult = {
  avgSpend: number | null;
  weekdayDays: number | null;
  weekendDays: number | null;
  deliverySales: number | null;
  peakHour: string | null;
  topMenus: string[] | null;
  totalSales: number | null;
  dailyAvgSales: number | null;
  totalTransactions: number | null;
  dataStartDate: string | null;
  dataEndDate: string | null;
  analysisNote: string;
  _truncated?: boolean;
};

function PosUploader({
  industry,
  onApply,
  plan,
}: {
  industry: string;
  plan: string;
  onApply: (data: Partial<Record<string, unknown>>) => void;
}) {
  const [status, setStatus] = useState<"idle" | "parsing" | "analyzing" | "done" | "error">("idle");
  const [result, setResult] = useState<PosResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseAndAnalyze = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus("parsing");
    setResult(null);
    setErrorMsg("");

    try {
      // SheetJS로 Excel → CSV 변환
      const buffer = await file.arrayBuffer();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const XLSX = (window as any).XLSX;
      if (!XLSX) throw new Error("XLSX 라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.");

      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const csvText: string = XLSX.utils.sheet_to_csv(ws);

      setStatus("analyzing");

      const res = await fetch("/api/parse-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, fileName: file.name, industry }),
      });

      if (!res.ok) throw new Error("AI 분석 요청 실패");
      const data: PosResult = await res.json();
      if ("error" in data) throw new Error((data as { error: string }).error);

      setResult(data);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "알 수 없는 오류");
      setStatus("error");
    }
  }, [industry]);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      setErrorMsg("xlsx, xls, csv 파일만 지원합니다.");
      setStatus("error");
      return;
    }
    parseAndAnalyze(file);
  }, [parseAndAnalyze]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const applyToForm = () => {
    if (!result) return;
    const updates: Partial<Record<string, unknown>> = {};
    if (result.avgSpend) updates.avgSpend = result.avgSpend;
    if (result.weekdayDays) updates.weekdayDays = result.weekdayDays;
    if (result.weekendDays) updates.weekendDays = result.weekendDays;
    if (result.deliverySales && result.deliverySales > 0) {
      updates.deliverySales = result.deliverySales;
      updates.deliveryEnabled = true;
    }
    onApply(updates);
  };

  const [showUpgrade, setShowUpgrade] = useState(false);

  if (plan === "free") {
    return (
      <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          title="POS 분석은 유료 기능이에요"
          description="POS에서 내보낸 매출 파일을 AI가 자동 분석합니다. 스탠다드 플랜으로 업그레이드하면 바로 이용 가능합니다."
        />
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-slate-400 px-2 py-0.5 text-xs font-semibold text-white">🔒 POS 연동</span>
            <p className="text-sm font-semibold text-slate-900">매출 파일 불러오기</p>
          </div>
          <p className="text-xs text-slate-400">POS에서 내보낸 Excel 파일을 업로드하면 AI가 자동으로 분석해 폼에 반영합니다.</p>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-slate-500 mb-3">POS 파일 분석은 스탠다드 플랜부터 사용 가능해요.</p>
          <button onClick={() => setShowUpgrade(true)} className="inline-block rounded-xl bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-blue-700 transition">업그레이드하기 →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
      {/* SheetJS CDN */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" strategy="lazyOnload" />

      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">POS 연동</span>
          <p className="text-sm font-semibold text-slate-900">매출 파일 불러오기</p>
        </div>
        <p className="text-xs text-slate-400">POS에서 내보낸 Excel 파일을 업로드하면 AI가 자동으로 분석해 폼에 반영합니다.</p>
      </div>

      <div className="p-5 space-y-4">
        {/* 드래그 드롭 영역 */}
        <div
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-4 sm:p-8 text-center transition cursor-pointer ${
            dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
          } ${status === "parsing" || status === "analyzing" ? "pointer-events-none opacity-60" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {status === "idle" || status === "error" ? (
            <>
              <div className="text-3xl">📊</div>
              <div>
                <p className="text-sm font-semibold text-slate-700">파일을 여기에 드래그하거나 클릭해서 선택</p>
                <p className="text-xs text-slate-400 mt-1">.xlsx · .xls · .csv 지원</p>
              </div>
            </>
          ) : status === "parsing" ? (
            <>
              <div className="text-2xl animate-bounce">📂</div>
              <p className="text-sm font-medium text-slate-600">파일 읽는 중...</p>
            </>
          ) : status === "analyzing" ? (
            <>
              <div className="text-2xl animate-pulse">🤖</div>
              <p className="text-sm font-medium text-slate-600">AI 분석 중...</p>
              <p className="text-xs text-slate-400">{fileName}</p>
            </>
          ) : (
            <>
              <div className="text-2xl">✅</div>
              <p className="text-sm font-medium text-emerald-700">분석 완료</p>
              <p className="text-xs text-slate-400">{fileName}</p>
            </>
          )}
        </div>

        {/* 에러 */}
        {status === "error" && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</div>
        )}

        {/* 분석 결과 */}
        {status === "done" && result && (
          <div className="space-y-4">
            {result._truncated && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                ⚠️ 데이터가 많아 일부만 분석되었습니다. 결과가 부분적일 수 있습니다.
              </div>
            )}

            {/* 기간 */}
            {(result.dataStartDate || result.dataEndDate) && (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400 mb-1">분석 기간</p>
                <p className="text-sm font-semibold text-slate-800">
                  {result.dataStartDate ?? "??"} ~ {result.dataEndDate ?? "??"}
                </p>
              </div>
            )}

            {/* 주요 수치 그리드 */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: "객단가", value: result.avgSpend ? `${fmt(result.avgSpend)}원` : null, highlight: true },
                { label: "일 평균 매출", value: result.dailyAvgSales ? `${fmt(result.dailyAvgSales)}원` : null },
                { label: "총 매출", value: result.totalSales ? `${fmt(result.totalSales)}원` : null },
                { label: "평일 영업일", value: result.weekdayDays ? `${result.weekdayDays}일` : null, highlight: true },
                { label: "주말 영업일", value: result.weekendDays ? `${result.weekendDays}일` : null, highlight: true },
                { label: "배달 매출", value: result.deliverySales ? `${fmt(result.deliverySales)}원` : null, highlight: !!result.deliverySales },
              ].map((item) =>
                item.value ? (
                  <div key={item.label} className={`rounded-2xl p-3 ${item.highlight ? "bg-blue-50" : "bg-slate-50"}`}>
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className={`mt-1 text-sm font-bold ${item.highlight ? "text-blue-700" : "text-slate-800"}`}>{item.value}</p>
                  </div>
                ) : null
              )}
            </div>

            {/* 피크 시간 & 인기 메뉴 */}
            <div className="grid gap-2 sm:grid-cols-2">
              {result.peakHour && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">피크 시간대</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">⏰ {result.peakHour}</p>
                </div>
              )}
              {result.topMenus && result.topMenus.length > 0 && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">인기 메뉴 TOP {result.topMenus.length}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.topMenus.map((m, i) => (
                      <span key={i} className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                        {i + 1}. {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI 노트 */}
            {result.analysisNote && (
              <div className="rounded-2xl bg-slate-900 px-4 py-4">
                <p className="text-xs font-semibold text-slate-400 mb-2">🤖 AI 분석 노트</p>
                <p className="text-sm text-slate-200 leading-relaxed">{result.analysisNote}</p>
              </div>
            )}

            {/* 적용 버튼 */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyToForm}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
              >
                분석 결과를 폼에 적용 →
              </button>
              <button
                type="button"
                onClick={() => { setStatus("idle"); setResult(null); setFileName(""); }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                다시 올리기
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              객단가 · 영업일 · 배달매출만 자동 적용됩니다. 나머지는 직접 확인 후 수정해주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── InputCard ─────────────────────────────────────────────────
function InputCard({
  label,
  hint,
  value,
  onChange,
  suffix = "원",
  money = false,
  error,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  money?: boolean;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    if (!focused) setRaw(String(value));
  }, [value, focused]);

  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="text-[15px] font-semibold text-slate-900">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5 mb-4">{hint}</p>

      <div className="flex items-end gap-2 max-w-[220px]">
        <input
          type={money && focused ? "number" : money ? "text" : "number"}
          inputMode="numeric"
          value={money ? (focused ? raw : fmt(value)) : String(value)}
          onFocus={() => { setFocused(true); setRaw(String(value)); }}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, "");
            setRaw(v);
            const n = Number(v);
            if (!isNaN(n)) onChange(n);
          }}
          onBlur={() => {
            setFocused(false);
            const n = Number(raw.replace(/[^0-9.]/g, ""));
            if (!isNaN(n)) onChange(n);
          }}
          className={`w-full border-0 border-b-2 bg-transparent pb-2 text-[28px] font-bold text-slate-900 outline-none transition caret-blue-500 ${
            error ? "border-red-400" : focused ? "border-blue-500" : "border-slate-200"
          }`}
          style={{ lineHeight: 1.2 }}
        />
        <span className="pb-2.5 text-[15px] font-medium text-slate-400 shrink-0">{suffix}</span>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SliderCard({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  error,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  error?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[15px] font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
        </div>
        <span className="text-[28px] font-bold text-slate-900">{value}<span className="text-[15px] font-medium text-slate-400 ml-1">{suffix}</span></span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vela-slider"
      />

      <div className="mt-2 flex justify-between text-[11px] text-slate-300">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ToggleCard({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      </div>
      <Toggle checked={value} onChange={onChange} label={label} />
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = ["매출 정보", "운영 비용", "초기비용"];

  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;

        return (
          <React.Fragment key={step}>
            <div className={`flex-1 rounded-full h-1.5 transition-all ${done ? "bg-blue-500" : active ? "bg-blue-500" : "bg-slate-200"}`} />
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PreviewBar({ form }: { form: FullForm }) {
  const result = useMemo(() => calcResult(form), [form]);
  const isProfit = result.profit >= 0;

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 p-5 lg:p-5 max-lg:p-3">
      {/* 데스크톱: 컴팩트 버전 */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-slate-400">미리보기</p>
          <span className={`text-[11px] font-bold ${isProfit ? "text-emerald-500" : "text-red-500"}`}>
            {isProfit ? "흑자" : "적자"}
          </span>
        </div>

        <div className="text-center mb-3">
          <p className="text-[11px] text-slate-400">세후 실수령</p>
          <p className={`text-[22px] font-extrabold tracking-tight mt-0.5 ${result.netProfit >= 0 ? "text-slate-900" : "text-red-500"}`}>
            {result.netProfit >= 0 ? "+" : ""}{fmt(result.netProfit)}<span className="text-[13px] font-bold text-slate-400">원</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">순이익률 {pct(result.netMargin)}</p>
        </div>

        <div className="h-1 w-full rounded-full bg-slate-100 mb-3">
          <div className={`h-full rounded-full transition-all duration-500 ${isProfit ? "bg-blue-500" : "bg-red-400"}`} style={{ width: `${Math.min(Math.abs(result.netMargin) * 5, 100)}%` }} />
        </div>

        <div className="space-y-1.5">
          {[
            { label: "월 매출", value: result.totalSales },
            { label: "세전 순이익", value: result.profit, colored: true },
            { label: "현금흐름", value: result.cashFlow, colored: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <p className="text-[11px] text-slate-400">{item.label}</p>
              <p className={`text-[12px] font-bold ${item.colored ? (item.value >= 0 ? "text-slate-900" : "text-red-500") : "text-slate-900"}`}>{fmt(item.value)}원</p>
            </div>
          ))}
        </div>
      </div>

      {/* 모바일: 컴팩트 바 */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3">
          {/* 프로그레스 링 */}
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E8EB" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={isProfit ? "#3182F6" : "#EF4444"} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${Math.min(Math.abs(result.netMargin) / 100 * 88, 88)} 88`} />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold ${isProfit ? "text-blue-600" : "text-red-500"}`}>
              {pct(result.netMargin)}
            </span>
          </div>

          {/* 지표 3개 */}
          <div className="flex-1 grid grid-cols-3 gap-1">
            <div>
              <p className="text-[10px] text-slate-400">매출</p>
              <p className="text-[13px] font-bold text-slate-900 truncate">{fmt(result.totalSales)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">순이익</p>
              <p className={`text-[13px] font-bold truncate ${isProfit ? "text-slate-900" : "text-red-500"}`}>{fmt(result.profit)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">실수령</p>
              <p className={`text-[13px] font-bold truncate ${result.netProfit >= 0 ? "text-blue-600" : "text-red-500"}`}>{fmt(result.netProfit)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step1({
  form,
  update,
  errors,
  loadIndustryDefaults,
  applyPosResult,
  plan,
}: {
  form: FullForm;
  update: (k: keyof FullForm, v: unknown) => void;
  errors: Partial<Record<keyof FullForm, string>>;
  loadIndustryDefaults: () => void;
  applyPosResult: (data: Partial<Record<string, unknown>>) => void;
  plan: string;
}) {
  const config = INDUSTRY_CONFIG[form.industry];
  const ratioSum = form.lunchRatio + form.dinnerRatio + form.nightRatio;

  return (
    <div className="space-y-6">
      {/* 가게 정보 */}
      <section className="rounded-2xl bg-white p-5">
        <h2 className="text-[17px] font-bold text-slate-900 mb-1">가게 정보</h2>
        <p className="text-xs text-slate-400 mb-4">기본적인 매장 정보를 입력해주세요.</p>

        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">가게 이름</label>
            <input
              value={form.storeName}
              onChange={(e) => update("storeName", e.target.value)}
              placeholder="예: 민혁이네 카페"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:bg-white focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">주소지 (동)</label>
            <input
              value={form.storeLocation}
              onChange={(e) => update("storeLocation", e.target.value)}
              placeholder="예: 서울 마포구 서교동"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:bg-white focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">오픈 시간</label>
              <input
                type="time"
                value={form.openTime}
                onChange={(e) => update("openTime", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">마감 시간</label>
              <input
                type="time"
                value={form.closeTime}
                onChange={(e) => update("closeTime", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* POS 파일 업로드 */}
      <PosUploader industry={form.industry} onApply={applyPosResult} plan={plan} />

      <section className="rounded-2xl bg-white p-5">
        <h2 className="text-[17px] font-bold text-slate-900 mb-1">업종 선택</h2>
        <p className="text-xs text-slate-400 mb-4">업종에 맞는 기준값이 자동 적용됩니다.</p>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {VALID_INDUSTRIES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => update("industry", key)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition ${
                form.industry === key
                  ? "bg-blue-50 ring-2 ring-blue-500"
                  : "bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <span className="text-xl">{INDUSTRY_CONFIG[key].icon}</span>
              <span className={`text-[11px] font-semibold ${form.industry === key ? "text-blue-600" : "text-slate-500"}`}>{INDUSTRY_CONFIG[key].label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={loadIndustryDefaults}
          className="mt-4 w-full rounded-xl bg-slate-50 px-4 py-3 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100"
        >
          {config.label} 기본값 불러오기
        </button>
      </section>

      <section className="space-y-3 rounded-2xl bg-slate-50 p-3">
        <div className="px-2 pt-2">
          <h2 className="text-[17px] font-bold text-slate-900">홀 매출</h2>
          <p className="text-xs text-slate-400 mt-0.5">매장 내 홀 영업 수치를 입력하세요.</p>
        </div>

        <InputCard
          label="좌석 수"
          hint="매장 총 좌석 수"
          value={form.seats}
          onChange={(v) => update("seats", v)}
          suffix="석"
          error={errors.seats}
        />
        <InputCard
          label="객단가"
          hint="고객 1명 평균 결제 금액"
          value={form.avgSpend}
          onChange={(v) => update("avgSpend", v)}
          suffix="원"
          money
          error={errors.avgSpend}
        />
        <SliderCard
          label="회전율"
          hint={`하루 평균 테이블 회전 횟수 (${config.label} 최대 ${config.maxTurnover}회)`}
          value={form.turnover}
          onChange={(v) => update("turnover", v)}
          min={0.1}
          max={config.maxTurnover}
          step={0.1}
          suffix="회"
          error={errors.turnover}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputCard
            label="평일 영업일"
            hint="월 기준 평일 영업 일수"
            value={form.weekdayDays}
            onChange={(v) => update("weekdayDays", v)}
            suffix="일"
            error={errors.weekdayDays}
          />
          <InputCard
            label="주말 영업일"
            hint="월 기준 주말 영업 일수 (최대 8일)"
            value={form.weekendDays}
            onChange={(v) => update("weekendDays", v)}
            suffix="일"
            error={errors.weekendDays}
          />
        </div>

        <SliderCard
          label="주말 매출 배율"
          hint="평일 대비 주말 매출 비율"
          value={form.weekendMultiplier}
          onChange={(v) => update("weekendMultiplier", v)}
          min={0.5}
          max={3}
          step={0.1}
          suffix="x"
        />

        <div className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-500">
          총 영업일 <span className="font-semibold text-slate-900">{form.weekdayDays + form.weekendDays}일</span>
          &nbsp;·&nbsp; 유효 영업일 환산{" "}
          <span className="font-semibold text-slate-900">
            {(form.weekdayDays + form.weekendDays * form.weekendMultiplier).toFixed(1)}일
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SliderCard
            label="포장/테이크아웃 비율"
            hint="홀 매출 중 포장 비중"
            value={form.takeoutRatio ?? 0}
            onChange={(v) => update("takeoutRatio", v)}
            min={0} max={80} step={5}
            suffix="%"
          />
          <SliderCard
            label="현금 결제 비율"
            hint="나머지는 카드 수수료 적용"
            value={form.cashPaymentRate ?? 10}
            onChange={(v) => update("cashPaymentRate", v)}
            min={0} max={60} step={5}
            suffix="%"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="text-[17px] font-bold text-slate-900 mb-1">시간대별 매출 비중</h2>
        <p className="text-xs text-slate-400 mb-4">합계 100%가 되도록 조절하세요.</p>

        <div className="space-y-5">
          {[
            { label: "점심", time: "11~14시", key: "lunchRatio" as const, value: form.lunchRatio, color: "#3182F6" },
            { label: "저녁", time: "17~22시", key: "dinnerRatio" as const, value: form.dinnerRatio, color: "#6366F1" },
            { label: "심야", time: "22~06시", key: "nightRatio" as const, value: form.nightRatio, color: "#0EA5E9" },
          ].map((item) => (
            <div key={item.key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-slate-800">{item.label} <span className="text-[12px] font-normal text-slate-400">{item.time}</span></span>
                <span className="text-[18px] font-bold" style={{ color: item.color }}>{item.value}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={item.value}
                onChange={(e) => update(item.key, Number(e.target.value))}
                className="vela-slider"
              />
            </div>
          ))}
        </div>

        <div className={`mt-4 rounded-xl px-4 py-2.5 text-[13px] font-medium text-center ${
          ratioSum === 100 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
        }`}>
          합계 {ratioSum}%{ratioSum !== 100 && " · 100%로 맞춰주세요"}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">배달 매출</h2>
          <p className="mt-1 text-sm text-slate-500">배달 채널이 있는 경우 입력하세요.</p>
        </div>

        <ToggleCard
          label="배달 운영 여부"
          hint="배달앱 또는 직접 배달 운영 중인 경우 ON"
          value={form.deliveryEnabled}
          onChange={(v) => update("deliveryEnabled", v)}
        />

        <ToggleCard
          label="배달 운영 의향"
          hint="AI가 배달 전략을 추천할지 여부"
          value={form.deliveryPreference === "possible"}
          onChange={(v) => update("deliveryPreference", v ? "possible" : "impossible")}
        />

        {form.deliveryEnabled && (
          <>
            <InputCard
              label="월 배달 매출"
              hint="배달앱 + 직접 배달 합산 매출"
              value={form.deliverySales}
              onChange={(v) => update("deliverySales", v)}
              money
              error={errors.deliverySales}
            />
            <SliderCard
              label="직접 배달 비율"
              hint="전체 배달 중 직접 배달 비중 (배달앱 수수료 미부과)"
              value={form.deliveryDirectRate}
              onChange={(v) => update("deliveryDirectRate", v)}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
            <SliderCard
              label="배달앱 수수료율"
              hint="배달의민족·쿠팡이츠 등 평균 수수료"
              value={form.deliveryAppRate}
              onChange={(v) => update("deliveryAppRate", v)}
              min={0}
              max={35}
              step={0.5}
              suffix="%"
            />
          </>
        )}
      </section>
    </div>
  );
}

function Step2({
  form,
  update,
  errors,
}: {
  form: FullForm;
  update: (k: keyof FullForm, v: unknown) => void;
  errors: Partial<Record<keyof FullForm, string>>;
}) {
  const config = INDUSTRY_CONFIG[form.industry];

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">인건비</h2>
          <p className="mt-1 text-sm text-slate-500">
            직접 입력하거나 인원·시급으로 계산할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["direct", "calculate"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update("laborType", type)}
              className={`rounded-3xl border p-4 text-center text-sm font-semibold transition ${
                form.laborType === type
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {type === "direct" ? "💰 직접 입력" : "🧮 인원·시급 계산"}
            </button>
          ))}
        </div>

        {form.laborType === "direct" ? (
          <InputCard
            label="월 인건비 합계"
            hint="직원 급여 총합"
            value={form.labor}
            onChange={(v) => update("labor", v)}
            money
            error={errors.labor}
          />
        ) : (
          <div className="space-y-4">
            <InputCard
              label="직원 수"
              hint="파트타임 포함 전체 인원"
              value={form.staffCount}
              onChange={(v) => update("staffCount", v)}
              suffix="명"
              error={errors.staffCount}
            />
            <InputCard
              label="시간당 임금"
              hint="평균 시급"
              value={form.hourlyWage}
              onChange={(v) => update("hourlyWage", v)}
              money
              error={errors.hourlyWage}
            />
            <InputCard
              label="1인 하루 근무시간"
              hint="평균 일 근무시간"
              value={form.workHoursPerDay}
              onChange={(v) => update("workHoursPerDay", v)}
              suffix="시간"
              error={errors.workHoursPerDay}
            />
            <InputCard
              label="월 근무일"
              hint="1인 기준 월 근무일수"
              value={form.workDaysPerMonth}
              onChange={(v) => update("workDaysPerMonth", v)}
              suffix="일"
              error={errors.workDaysPerMonth}
            />

            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
              예상 인건비:{" "}
              <span className="font-bold text-slate-900">
                {fmt(
                  form.staffCount *
                    form.hourlyWage *
                    form.workHoursPerDay *
                    form.workDaysPerMonth
                )}
                원
              </span>
            </div>
          </div>
        )}

        <SliderCard
          label="4대보험 사업자 부담률"
          hint="인건비 대비 사업자 추가 부담 (약 9%)"
          value={form.insuranceRate}
          onChange={(v) => update("insuranceRate", v)}
          min={0}
          max={20}
          step={0.5}
          suffix="%"
        />
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">임대 & 시설비</h2>
        </div>

        <InputCard
          label="월 임대료"
          hint="월세 (관리비 포함 가능)"
          value={form.rent}
          onChange={(v) => update("rent", v)}
          money
          error={errors.rent}
        />
        <InputCard
          label="공과금"
          hint="전기·가스·수도"
          value={form.utilities}
          onChange={(v) => update("utilities", v)}
          money
          error={errors.utilities}
        />
        <InputCard
          label="통신비"
          hint="인터넷·전화·POS 시스템"
          value={form.telecom}
          onChange={(v) => update("telecom", v)}
          money
          error={errors.telecom}
        />
        <InputCard
          label="시설 유지보수비"
          hint="청소·수선·설비 관리"
          value={form.maintenance}
          onChange={(v) => update("maintenance", v)}
          money
          error={errors.maintenance}
        />
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">원가 & 수수료</h2>
        </div>

        {form.industry === "cafe" ? (
          <SliderCard
            label="식자재 원가율"
            hint={`원두·우유·시럽·베이커리 등 재료 원가 (${config.label} 기준 ${config.cogsWarnRate}% 이하)`}
            value={form.cogsRate}
            onChange={(v) => update("cogsRate", v)}
            min={1}
            max={80}
            step={1}
            suffix="%"
            error={errors.cogsRate}
          />
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-1 text-sm font-semibold text-slate-900">원가율 구성</p>
            <p className="mb-4 text-xs text-slate-400">
              식자재와 주류를 분리해 더 정확한 원가를 계산합니다.
            </p>

            <div className="space-y-4">
              <SliderCard
                label="식자재 원가율"
                hint="음식 재료 원가"
                value={form.cogsRate}
                onChange={(v) => update("cogsRate", v)}
                min={1}
                max={80}
                step={1}
                suffix="%"
                error={errors.cogsRate}
              />
              <SliderCard
                label="주류 원가율"
                hint="술·음료 원가"
                value={form.alcoholCogsRate}
                onChange={(v) => update("alcoholCogsRate", v)}
                min={0}
                max={70}
                step={1}
                suffix="%"
              />
              <SliderCard
                label="주류 매출 비중"
                hint="전체 매출 중 주류·음료 매출 비중"
                value={form.alcoholSalesRatio}
                onChange={(v) => update("alcoholSalesRatio", v)}
                min={0}
                max={100}
                step={5}
                suffix="%"
              />

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="mb-1 flex justify-between">
                  <span>
                    식사 매출({100 - form.alcoholSalesRatio}%) × 식자재 원가율({form.cogsRate}%)
                  </span>
                  <span className="font-semibold">
                    {(((100 - form.alcoholSalesRatio) / 100) * form.cogsRate).toFixed(1)}%
                  </span>
                </div>
                <div className="mb-2 flex justify-between">
                  <span>
                    주류 매출({form.alcoholSalesRatio}%) × 주류 원가율({form.alcoholCogsRate}%)
                  </span>
                  <span className="font-semibold">
                    {((form.alcoholSalesRatio / 100) * form.alcoholCogsRate).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                  <span>통합 원가율</span>
                  <span>
                    {(
                      ((100 - form.alcoholSalesRatio) / 100) * form.cogsRate +
                      (form.alcoholSalesRatio / 100) * form.alcoholCogsRate
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <SliderCard
          label="식자재 폐기율"
          hint="구매 식자재 중 폐기되는 비율 — 실질 원가율에 합산"
          value={form.wasteRate ?? 0}
          onChange={(v) => update("wasteRate", v)}
          min={0} max={20} step={0.5}
          suffix="%"
        />
        {(form.wasteRate ?? 0) > 0 && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
            실질 원가율: <span className="font-semibold">{(form.cogsRate + (form.wasteRate ?? 0)).toFixed(1)}%</span>
            &nbsp;(구매원가 {form.cogsRate}% + 폐기율 {form.wasteRate}%)
          </div>
        )}

        <SliderCard
          label="카드 수수료율"
          hint="매출 대비 카드 수수료"
          value={form.cardFeeRate}
          onChange={(v) => update("cardFeeRate", v)}
          min={0}
          max={5}
          step={0.1}
          suffix="%"
        />

        {form.deliveryEnabled && (
          <SliderCard
            label="배달앱 수수료율"
            hint="배달 매출 대비 평균 수수료"
            value={form.deliveryFeeRate}
            onChange={(v) => update("deliveryFeeRate", v)}
            min={0}
            max={35}
            step={0.5}
            suffix="%"
          />
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">마케팅 & 기타</h2>
        </div>

        <InputCard
          label="광고/마케팅비"
          hint="SNS 광고·전단지·이벤트 비용"
          value={form.marketing}
          onChange={(v) => update("marketing", v)}
          money
        />
        <InputCard
          label="소모품비"
          hint="포장재·청소용품·일회용품"
          value={form.supplies}
          onChange={(v) => update("supplies", v)}
          money
        />
        <InputCard
          label="기타 운영비"
          hint="예비비·잡비"
          value={form.etc}
          onChange={(v) => update("etc", v)}
          money
        />
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">세금</h2>
          <p className="mt-1 text-sm text-slate-500">실수령액 계산을 위한 세율을 입력하세요.</p>
        </div>

        <SliderCard
          label="종합소득세율"
          hint="예상 소득세율"
          value={form.incomeTaxRate}
          onChange={(v) => update("incomeTaxRate", v)}
          min={0} max={45} step={1}
          suffix="%"
        />

        {/* 사업자 종류 */}
        <div className="rounded-2xl bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">사업자 종류</p>
          <div className="grid grid-cols-2 gap-2">
            {([["individual", "개인사업자", "종합소득세 적용"], ["corporation", "법인", "법인세 적용"]] as const).map(([val, label, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => update("ownerType", val)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  (form.ownerType ?? "individual") === val
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className={`text-sm font-semibold ${(form.ownerType ?? "individual") === val ? "text-blue-700" : "text-slate-700"}`}>{label}</p>
                <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <ToggleCard
          label="부가세 과세 사업자"
          hint="일반 과세자인 경우 ON"
          value={form.vatEnabled}
          onChange={(v) => update("vatEnabled", v)}
        />
      </section>

      {/* 프랜차이즈 섹션 */}
      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">프랜차이즈</h2>
          <p className="mt-1 text-sm text-slate-500">프랜차이즈 가맹점인 경우 입력하세요.</p>
        </div>
        <ToggleCard
          label="프랜차이즈 가맹점"
          hint="프랜차이즈 로열티가 발생하는 경우"
          value={form.franchiseEnabled ?? false}
          onChange={(v) => update("franchiseEnabled", v)}
        />
        {form.franchiseEnabled && (
          <SliderCard
            label="로열티율"
            hint="매출 대비 본사 로열티 비율"
            value={form.franchiseRoyaltyRate ?? 0}
            onChange={(v) => update("franchiseRoyaltyRate", v)}
            min={0} max={15} step={0.5}
            suffix="%"
          />
        )}
      </section>
    </div>
  );
}

function Step3({
  form,
  update,
  errors,
}: {
  form: FullForm;
  update: (k: keyof FullForm, v: unknown) => void;
  errors: Partial<Record<keyof FullForm, string>>;
}) {
  const result = useMemo(() => calcResult(form), [form]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 text-xl font-bold text-slate-900">사업 현황</h2>
        <p className="mb-4 text-sm text-slate-500">현재 상태를 선택해주세요.</p>

        <div className="grid grid-cols-2 gap-3">
          {(["new", "existing"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update("businessType", type)}
              className={`rounded-3xl border p-4 text-center text-sm font-semibold transition ${
                form.businessType === type
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {type === "new" ? "🏗️ 창업 예정" : "🏪 이미 운영 중"}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">초기 투자비용</h2>
          <p className="mt-1 text-sm text-slate-500">
            창업 시 들어간 (또는 예정인) 비용을 입력하세요.
          </p>
        </div>

        <InputCard
          label="보증금"
          hint="임대 보증금 (퇴거 시 반환)"
          value={form.deposit}
          onChange={(v) => update("deposit", v)}
          money
          error={errors.deposit}
        />
        <InputCard
          label="권리금"
          hint="전 임차인에게 지불한 권리금"
          value={form.premiumKey}
          onChange={(v) => update("premiumKey", v)}
          money
          error={errors.premiumKey}
        />
        <InputCard
          label="인테리어 비용"
          hint="내부 공사·리모델링"
          value={form.interior}
          onChange={(v) => update("interior", v)}
          money
          error={errors.interior}
        />
        <InputCard
          label="주방기기 & 집기"
          hint="냉장고·조리기구·테이블·의자 등"
          value={form.equipment}
          onChange={(v) => update("equipment", v)}
          money
          error={errors.equipment}
        />
        <InputCard
          label="간판 & 홍보물"
          hint="간판 제작·현수막·메뉴판 등"
          value={form.signage}
          onChange={(v) => update("signage", v)}
          money
          error={errors.signage}
        />
        <InputCard
          label="가맹비"
          hint="프랜차이즈 가맹 계약금 (해당 시)"
          value={form.franchiseFee ?? 0}
          onChange={(v) => update("franchiseFee", v)}
          money
        />
        <InputCard
          label="교육비"
          hint="본사 교육·연수 비용 (해당 시)"
          value={form.trainingFee ?? 0}
          onChange={(v) => update("trainingFee", v)}
          money
        />
        <InputCard
          label="기타 초기비용"
          hint="인허가·사업자등록·예비비"
          value={form.otherSetup}
          onChange={(v) => update("otherSetup", v)}
          money
          error={errors.otherSetup}
        />

        <div className="rounded-2xl bg-white px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">총 초기 투자비</span>
            <span className="font-bold text-slate-900">
              {fmt(
                form.deposit +
                  form.premiumKey +
                  form.interior +
                  form.equipment +
                  form.signage +
                  (form.franchiseFee ?? 0) +
                  (form.trainingFee ?? 0) +
                  form.otherSetup
              )}
              원
            </span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>실질 투자금 (보증금 제외)</span>
            <span>
              {fmt(
                form.premiumKey +
                  form.interior +
                  form.equipment +
                  form.signage +
                  (form.franchiseFee ?? 0) +
                  (form.trainingFee ?? 0) +
                  form.otherSetup
              )}
              원
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">부채 & 대출</h2>
          <p className="mt-1 text-sm text-slate-500">사업 관련 대출이 있는 경우 입력하세요.</p>
        </div>

        <ToggleCard
          label="대출 여부"
          hint="창업자금 대출·운영자금 대출 등"
          value={form.loanEnabled}
          onChange={(v) => update("loanEnabled", v)}
        />

        {form.loanEnabled && (
          <>
            <InputCard
              label="대출 원금"
              hint="현재 남은 대출 잔액"
              value={form.loanAmount}
              onChange={(v) => update("loanAmount", v)}
              money
              error={errors.loanAmount}
            />
            <SliderCard
              label="연 이자율"
              hint="대출 이자율 (연 기준)"
              value={form.loanInterestRate}
              onChange={(v) => update("loanInterestRate", v)}
              min={0}
              max={20}
              step={0.1}
              suffix="%"
            />
            <InputCard
              label="상환 기간"
              hint="총 상환 기간"
              value={form.loanTermMonths}
              onChange={(v) => update("loanTermMonths", v)}
              suffix="개월"
              error={errors.loanTermMonths}
            />
            <div className="rounded-2xl bg-white px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">월 상환액 (원리금 균등)</span>
                <span className="font-bold text-slate-900">
                  {fmt(result.monthlyLoanPayment)}원
                </span>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-slate-100 p-4">
        <div className="px-1">
          <h2 className="text-xl font-bold text-slate-900">목표 설정</h2>
          <p className="mt-1 text-sm text-slate-500">
            투자금 회수 목표와 목표 순이익을 설정하세요.
          </p>
        </div>

        <SliderCard
          label="투자금 회수 목표"
          hint="초기 투자비를 몇 개월 안에 회수할지"
          value={form.recoveryMonths}
          onChange={(v) => update("recoveryMonths", v)}
          min={6}
          max={120}
          step={6}
          suffix="개월"
        />
        <InputCard
          label="목표 월 세후 순이익"
          hint="매달 가져가고 싶은 금액"
          value={form.targetMonthlyProfit}
          onChange={(v) => update("targetMonthlyProfit", v)}
          money
          error={errors.targetMonthlyProfit}
        />

        {form.targetMonthlyProfit > 0 && (() => {
          const rev = calcReverse(form, form.targetMonthlyProfit);

          return (
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">
                목표 달성을 위한 필요 수치
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">필요 객단가</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {fmt(rev.neededAvgSpend)}원
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    현재 대비 {fmt(rev.avgSpendDiff)}원
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">필요 회전율</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {rev.neededTurnover}회
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    현재 대비 {rev.turnoverDiff}회
                  </p>
                </div>
            <div className="rounded-2xl bg-slate-50 p-4 col-span-2 sm:col-span-1">
  <p className="text-xs text-slate-500">원가율 여유 진단</p>
  {rev.neededCogsRate === null ? (
    <>
      <p className="mt-2 text-sm font-bold text-slate-400">진단 불가</p>
      <p className="mt-1 text-xs text-slate-400">매출 또는 목표이익을 입력해 주세요</p>
    </>
  ) : (
    <>
      {/* 현재 vs 허용 원가율 수치 비교 */}
      <div className="mt-2 flex items-end gap-2">
        <span className="text-lg font-bold" style={{ color: (rev.cogsRateDiff ?? 0) >= 0 ? '#059669' : '#ef4444' }}>
          {(rev.cogsRateDiff ?? 0) >= 0 ? `+${rev.cogsRateDiff}%p` : `${rev.cogsRateDiff}%p`}
        </span>
        <span className="mb-0.5 text-xs text-slate-400">여유</span>
      </div>

      {/* 게이지 바 */}
      <div className="mt-2">
        <div className="relative h-2 rounded-full bg-slate-200 overflow-hidden">
          {/* 허용 원가율 위치 마커 */}
          <div
            className="absolute top-0 h-2 w-0.5 bg-slate-400 z-10"
            style={{ left: `${Math.min(rev.neededCogsRate, 100)}%` }}
          />
          {/* 현재 원가율 바 */}
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(form.cogsRate, 100)}%`,
              backgroundColor: (rev.cogsRateDiff ?? 0) >= 0 ? '#10b981' : '#ef4444',
            }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
          <span>현재 원가율 <b className="text-slate-600">{form.cogsRate}%</b></span>
          <span>허용 한도 <b className="text-slate-600">{rev.neededCogsRate}%</b></span>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {(rev.cogsRateDiff ?? 0) >= 0
          ? `원가율을 ${rev.cogsRateDiff}%p 더 올려도 목표 달성 가능합니다`
          : `목표 달성을 위해 원가율을 ${Math.abs(rev.cogsRateDiff ?? 0)}%p 낮춰야 합니다`}
      </p>
    </>
  )}
                </div>
              </div>
            </div>
          );
        })()}
      </section>
    </div>
  );
}

function buildQuery(form: FullForm) {
  const params = new URLSearchParams();
  Object.entries(form).forEach(([key, value]) => {
    // 배달 비활성 시 배달 관련 수치는 URL에 포함하지 않음 (수신 측 오염 방지)
    if (!form.deliveryEnabled && (key === "deliverySales" || key === "deliveryAppRate" || key === "deliveryDirectRate")) return;
    params.set(key, String(value));
  });
  return params.toString();
}

export default function Page() {
  const router = useRouter();
  const { plan } = usePlan();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FullForm>(createEmptyForm("restaurant"));
  const [saveMessage, setSaveMessage] = useState("");
  const [stepError, setStepError] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCloudSave, setShowCloudSave] = useState(false);
  const [cloudSaveTitle, setCloudSaveTitle] = useState("");
  const [cloudSaving, setCloudSaving] = useState(false);

  const handleCloudSave = async () => {
    if (!cloudSaveTitle.trim()) return;
    setCloudSaving(true);
    try {
      const sb = createSupabaseBrowserClient();
      const { data: { user } } = await sb.auth.getUser() as { data: { user: { id: string } | null } };
      if (!user) { alert("로그인이 필요합니다."); setShowCloudSave(false); setCloudSaving(false); return; }
      await sb.from("simulation_history").insert({ user_id: user.id, label: cloudSaveTitle.trim(), form });
      showMessage(`'${cloudSaveTitle.trim()}' 클라우드 저장 완료 ✓`);
      setShowCloudSave(false);
      setCloudSaveTitle("");
    } catch { showMessage("저장 실패. 다시 시도해주세요."); }
    setCloudSaving(false);
  };
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveMessage(msg);
    timerRef.current = setTimeout(() => setSaveMessage(""), 2000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const hasParams = Array.from(params.keys()).length > 0;

    if (hasParams) {
      const raw: Record<string, unknown> = {};
      params.forEach((value, key) => {
        raw[key] = value;
      });
      setForm(sanitizeFullForm(raw));
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    const localForm = saved ? (() => { try { return sanitizeFullForm(JSON.parse(saved)); } catch { return null; } })() : null;
    if (localForm) setForm(localForm);

    // 클라우드에 더 최신 데이터가 있는지 확인
    (async () => {
      try {
        const sb = createSupabaseBrowserClient();
        const { data: { user } } = await sb.auth.getUser() as { data: { user: { id: string } | null } };
        if (!user) return;
        const { data: rows } = await sb
          .from("tool_saves")
          .select("data, updated_at")
          .eq("user_id", user.id)
          .eq("tool_key", "vela-form-v3")
          .limit(1);
        if (rows && rows.length > 0 && rows[0].data) {
          const cloudData = rows[0].data;
          const localStr = localStorage.getItem(STORAGE_KEY);
          const cloudStr = JSON.stringify(cloudData);
          if (localStr !== cloudStr) {
            // 클라우드와 로컬이 다르면 클라우드 데이터로 업데이트 안내
            const useCloud = confirm("다른 기기에서 저장한 최신 데이터가 있습니다. 불러올까요?");
            if (useCloud) {
              const cloudForm = sanitizeFullForm(cloudData);
              setForm(cloudForm);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudForm));
            }
          }
        }
      } catch {}
    })();
  }, []);

  const update = (key: keyof FullForm, value: unknown) => {
    setStepError("");
    setForm((prev) => {
      if (key === "industry") {
        // 업종만 변경 — 기본값 자동 주입 안 함
        return { ...prev, industry: value as IndustryKey };
      }
      return sanitizeFullForm({ ...prev, [key]: value });
    });
  };

  const loadIndustryDefaults = () => {
    const cfg = INDUSTRY_CONFIG[form.industry];
    setForm(sanitizeFullForm({
      ...cfg.defaultStep1,
      ...cfg.defaultStep2,
      ...cfg.defaultStep3,
      industry: form.industry,
    }));
    showMessage(`${cfg.label} 기본값을 불러왔습니다.`);
  };

  const applyPosResult = (data: Partial<Record<string, unknown>>) => {
    setForm((prev) => sanitizeFullForm({ ...prev, ...data }));
    showMessage("POS 분석 결과가 폼에 반영되었습니다.");
  };

  const step1Errors = useMemo<Partial<Record<keyof FullForm, string>>>(() => {
    const errors: Partial<Record<keyof FullForm, string>> = {};
    if (form.seats <= 0) errors.seats = "좌석 수는 1 이상이어야 합니다.";
    if (form.avgSpend <= 0) errors.avgSpend = "객단가는 0보다 커야 합니다.";
    if (form.turnover <= 0) errors.turnover = "회전율은 0보다 커야 합니다.";
    if (form.weekdayDays < 0) errors.weekdayDays = "평일 영업일을 확인해주세요.";
    if (form.weekendDays < 0 || form.weekendDays > 8) {
      errors.weekendDays = "주말 영업일은 0~8일 사이여야 합니다.";
    }
    if (form.deliveryEnabled && form.deliverySales < 0) {
      errors.deliverySales = "배달 매출은 0 이상이어야 합니다.";
    }
    return errors;
  }, [form]);

  const step2Errors = useMemo<Partial<Record<keyof FullForm, string>>>(() => {
    const errors: Partial<Record<keyof FullForm, string>> = {};
    if (form.laborType === "direct") {
      if (form.labor < 0) errors.labor = "인건비를 확인해주세요.";
    } else {
      if (form.staffCount <= 0) errors.staffCount = "직원 수는 1명 이상이어야 합니다.";
      if (form.hourlyWage <= 0) errors.hourlyWage = "시급을 확인해주세요.";
      if (form.workHoursPerDay <= 0) errors.workHoursPerDay = "근무시간을 확인해주세요.";
      if (form.workDaysPerMonth <= 0) errors.workDaysPerMonth = "근무일을 확인해주세요.";
    }
    if (form.rent < 0) errors.rent = "임대료를 확인해주세요.";
    if (form.utilities < 0) errors.utilities = "공과금을 확인해주세요.";
    if (form.telecom < 0) errors.telecom = "통신비를 확인해주세요.";
    if (form.maintenance < 0) errors.maintenance = "유지보수비를 확인해주세요.";
    if (form.cogsRate < 0 || form.cogsRate > 100) errors.cogsRate = "원가율을 확인해주세요.";
    return errors;
  }, [form]);

  const step3Errors = useMemo<Partial<Record<keyof FullForm, string>>>(() => {
    const errors: Partial<Record<keyof FullForm, string>> = {};
    if (form.deposit < 0) errors.deposit = "보증금을 확인해주세요.";
    if (form.premiumKey < 0) errors.premiumKey = "권리금을 확인해주세요.";
    if (form.interior < 0) errors.interior = "인테리어 비용을 확인해주세요.";
    if (form.equipment < 0) errors.equipment = "기기 비용을 확인해주세요.";
    if (form.signage < 0) errors.signage = "간판 비용을 확인해주세요.";
    if (form.otherSetup < 0) errors.otherSetup = "기타 초기비용을 확인해주세요.";
    if (form.loanEnabled) {
      if (form.loanAmount <= 0) errors.loanAmount = "대출 원금을 입력해주세요.";
      if (form.loanTermMonths <= 0) errors.loanTermMonths = "상환 기간을 확인해주세요.";
    }
    if (form.targetMonthlyProfit < 0) {
      errors.targetMonthlyProfit = "목표 순이익을 확인해주세요.";
    }
    return errors;
  }, [form]);

  const validateStep1 = () => {
    if (Object.keys(step1Errors).length > 0) return "1단계 입력값을 확인해주세요.";
    const ratioSum = form.lunchRatio + form.dinnerRatio + form.nightRatio;
    if (ratioSum !== 100) return "시간대별 매출 비중 합계는 100%여야 합니다.";
    if (form.weekdayDays + form.weekendDays <= 0) return "총 영업일은 1일 이상이어야 합니다.";
    return "";
  };

  const validateStep2 = () => {
    if (Object.keys(step2Errors).length > 0) return "2단계 입력값을 확인해주세요.";
    return "";
  };

  const validateStep3 = () => {
    if (Object.keys(step3Errors).length > 0) return "3단계 입력값을 확인해주세요.";
    return "";
  };

  const getCurrentStepError = () => {
    if (step === 1) return validateStep1();
    if (step === 2) return validateStep2();
    return validateStep3();
  };

  const [showSimLimit, setShowSimLimit] = useState(false);

  const SIM_USAGE_KEY = "vela-sim-usage";
  const FREE_SIM_LIMIT = 3;

  const getSimUsage = (): { count: number; month: string } => {
    try { const raw = localStorage.getItem(SIM_USAGE_KEY); return raw ? JSON.parse(raw) : { count: 0, month: "" }; } catch { return { count: 0, month: "" }; }
  };

  const goToResult = () => {
    const error = validateStep3();
    if (error) {
      setStepError(error);
      window.scrollTo(0, 0);
      return;
    }

    // 무료 플랜 월 10회 제한
    if (plan === "free") {
      const now = new Date();
      const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
      const usage = getSimUsage();
      const count = usage.month === month ? usage.count : 0;
      if (count >= FREE_SIM_LIMIT) {
        setShowSimLimit(true);
        return;
      }
      localStorage.setItem(SIM_USAGE_KEY, JSON.stringify({ count: count + 1, month }));
    }

    setStepError("");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));

    // 로그인 시 클라우드에도 자동 백업 (비동기, 기다리지 않음)
    try {
      const sb = createSupabaseBrowserClient();
      sb.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
        if (!user) return;
        sb.from("tool_saves").upsert(
          { user_id: user.id, tool_key: "vela-form-v3", data: form, updated_at: new Date().toISOString() },
          { onConflict: "user_id,tool_key" }
        );
      });
    } catch {}

    router.push(`/result?${buildQuery(form)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UpgradeModal open={showSimLimit} onClose={() => setShowSimLimit(false)} title="이번 달 시뮬레이션 한도를 다 사용했어요" description="무료 플랜은 월 10회까지 시뮬레이션할 수 있어요. 스탠다드 플랜으로 업그레이드하면 무제한으로 분석 가능합니다." />

      <main className="px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl">

        {showSaveModal && (
          <SaveModal
            onLoad={(savedForm) => {
              setForm(sanitizeFullForm(savedForm));
              setStepError("");
              showMessage("불러오기가 완료되었습니다.");
            }}
            onClose={() => setShowSaveModal(false)}
          />
        )}

        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => router.push("/")} className="text-sm text-slate-400 hover:text-slate-700 transition">← 홈</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowSaveModal(true)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">불러오기</button>
              <button type="button" onClick={() => { const label = saveSlot(form); showMessage(`${label} 저장 완료`); }} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">저장</button>
              <button type="button" onClick={() => { setCloudSaveTitle(""); setShowCloudSave(true); }} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">클라우드</button>
            </div>
          </div>

          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 mb-1">수익 시뮬레이터</h1>
          <p className="text-[14px] text-slate-400 mb-5">{["매출 정보", "운영 비용", "초기비용"][step - 1]} · {step}/3단계</p>
          <StepIndicator current={step} />
          {saveMessage && <p className="mt-3 text-sm font-medium text-blue-500">{saveMessage}</p>}

          {/* 클라우드 저장 모달 */}
          {showCloudSave && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={e => { if(e.target===e.currentTarget) setShowCloudSave(false); }}>
              <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">☁️ 클라우드에 저장</h3>
                <p className="text-xs text-slate-400">나중에 불러올 수 있도록 제목을 입력해주세요.</p>
                <input
                  value={cloudSaveTitle}
                  onChange={e => setCloudSaveTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCloudSave(); }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  placeholder="예: 홍대 카페 2026년 4월"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowCloudSave(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
                  <button
                    disabled={!cloudSaveTitle.trim() || cloudSaving}
                    onClick={handleCloudSave}
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {cloudSaving ? "저장 중..." : "저장하기"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 모바일 플로팅 미리보기 — NavBar 바로 아래 고정 */}
        <div className="lg:hidden sticky top-0 z-40 mb-3 -mx-4 px-3 pt-1 pb-1 bg-slate-50/95 backdrop-blur-sm">
          <PreviewBar form={form} />
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-4 lg:items-start">

          <div className="space-y-6">
            {step === 1 && <Step1 form={form} update={update} errors={step1Errors} loadIndustryDefaults={loadIndustryDefaults} applyPosResult={applyPosResult} plan={plan} />}
            {step === 2 && <Step2 form={form} update={update} errors={step2Errors} />}
            {step === 3 && <Step3 form={form} update={update} errors={step3Errors} />}

            {/* 데스크톱 네비게이션 */}
            <section className="hidden lg:block rounded-2xl bg-white p-5 ring-1 ring-slate-100">
              {stepError && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{stepError}</div>}
              <div className="flex gap-3">
                {step > 1 && (
                  <button type="button" onClick={() => { setStepError(""); setStep(step - 1); window.scrollTo(0, 0); }} className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">이전</button>
                )}
                {step < 3 ? (
                  <button type="button" onClick={() => { const error = getCurrentStepError(); if (error) { setStepError(error); window.scrollTo(0, 0); return; } setStepError(""); setStep(step + 1); window.scrollTo(0, 0); }} className="flex-1 rounded-xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-600 active:scale-[0.98]">다음 단계</button>
                ) : (
                  <button type="button" onClick={goToResult} className="flex-1 rounded-xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-600 active:scale-[0.98]">결과 보기</button>
                )}
              </div>
            </section>

            {/* 모바일 네비게이션 — 콘텐츠 하단 (고정 아님) */}
            <div className="lg:hidden mt-4 mb-6">
              {stepError && <p className="text-xs text-red-500 text-center mb-2">{stepError}</p>}
              <div className="flex gap-3">
                {step > 1 && (
                  <button type="button" onClick={() => { setStepError(""); setStep(step - 1); window.scrollTo(0, 0); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600">이전</button>
                )}
                {step < 3 ? (
                  <button type="button" onClick={() => { const error = getCurrentStepError(); if (error) { setStepError(error); window.scrollTo(0, 0); return; } setStepError(""); setStep(step + 1); window.scrollTo(0, 0); }} className="flex-1 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white active:scale-[0.98]">다음 단계 →</button>
                ) : (
                  <button type="button" onClick={goToResult} className="flex-1 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white active:scale-[0.98]">결과 보기 →</button>
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:block relative">
            <div className="fixed top-20 w-[244px] space-y-3" style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
              <PreviewBar form={form} />
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">입력 단계</p>
                <div className="space-y-2">
                  {(["매출 정보", "운영 비용", "초기비용 & 부채"] as const).map((label, i) => {
                    const s = i + 1;
                    return (
                      <div key={s} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${step === s ? "bg-slate-900 text-white font-semibold" : step > s ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"}`}>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step === s ? "bg-white text-slate-900" : step > s ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                          {step > s ? "✓" : s}
                        </span>
                        {label}
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={goToResult} className="mt-4 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">결과 보기 →</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
    </div>
  );
}
