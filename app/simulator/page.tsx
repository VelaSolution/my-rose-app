"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { usePlan } from "@/lib/usePlan";
import UpgradeModal from "@/components/UpgradeModal";
import {
  INDUSTRY_CONFIG,
  sanitizeFullForm,
  createEmptyForm,
  type IndustryKey,
  type FullForm,
} from "@/lib/vela";
import {
  STORAGE_KEYS,
  loadFormData,
  saveFormData,
  addSaveSlot,
} from "@/lib/storage";

import { SaveModal } from "./components/SaveModal";
import { FormStep1 } from "./components/FormStep1";
import { FormStep2 } from "./components/FormStep2";
import { FormStep3 } from "./components/FormStep3";
import { PreviewBar, StepIndicator } from "./components/PreviewBar";

function buildQuery(form: FullForm) {
  const params = new URLSearchParams();
  Object.entries(form).forEach(([key, value]) => {
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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveMessage(msg);
    timerRef.current = setTimeout(() => setSaveMessage(""), 2000);
  };

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ─── URL 파라미터 / 로컬 저장값 복원 ──────────────────────────
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

    const saved = loadFormData<Record<string, unknown>>();
    if (saved) {
      try {
        setForm(sanitizeFullForm(saved));
      } catch (error) {
        console.error("저장값 불러오기 실패", error);
      }
    }

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
          const localStr = localStorage.getItem(STORAGE_KEYS.FORM);
          const cloudStr = JSON.stringify(cloudData);
          if (localStr !== cloudStr) {
            const useCloud = confirm("다른 기기에서 저장한 최신 데이터가 있습니다. 불러올까요?");
            if (useCloud) {
              const cloudForm = sanitizeFullForm(cloudData);
              setForm(cloudForm);
              localStorage.setItem(STORAGE_KEYS.FORM, JSON.stringify(cloudForm));
            }
          }
        }
      } catch {}
    })();
  }, []);

  // ─── 폼 업데이트 ──────────────────────────────────────────────
  const update = (key: keyof FullForm, value: unknown) => {
    setStepError("");
    setForm((prev) => {
      if (key === "industry") {
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

  // ─── 유효성 검사 ──────────────────────────────────────────────
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
    saveFormData(form as unknown as Record<string, unknown>);

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

  // ─── 렌더링 ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <UpgradeModal open={showSimLimit} onClose={() => setShowSimLimit(false)} title="이번 달 시뮬레이션 한도를 다 사용했어요" description="무료 플랜은 월 10회까지 시뮬레이션할 수 있어요. 스탠다드 플랜으로 업그레이드하면 무제한으로 분석 가능합니다." />

      <main className="px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">

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
              <button type="button" onClick={() => { const label = addSaveSlot(form as unknown as Record<string, unknown>); showMessage(`${label} 저장 완료`); }} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">저장</button>
              <button type="button" onClick={() => { setCloudSaveTitle(""); setShowCloudSave(true); }} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">클라우드</button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => { const label = addSaveSlot(form as unknown as Record<string, unknown>); showMessage(`${label} 저장 완료`); }} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">💾 현재 값 저장</button>
            <button type="button" onClick={() => { setCloudSaveTitle(""); setShowCloudSave(true); }} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">☁️ 클라우드 저장</button>
            <button type="button" onClick={() => setShowSaveModal(true)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">📂 저장값 불러오기</button>
            <button type="button" onClick={() => { setForm(createEmptyForm(form.industry)); setStep(1); setStepError(""); showMessage("초기화가 완료되었습니다."); }} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">초기화</button>
            <button type="button" onClick={async () => { try { const url = `${window.location.origin}${window.location.pathname}?${buildQuery(form)}`; await navigator.clipboard.writeText(url); showMessage("링크가 복사되었습니다."); } catch (error) { console.error(error); showMessage("링크 복사에 실패했습니다."); } }} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">링크 공유</button>
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

        {/* 미리보기 — 모바일: sticky, 데스크톱: 폼 상단 */}
        <div className="sticky top-0 z-40 mb-4 -mx-4 px-3 pt-1 pb-1 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm lg:mx-0 lg:px-0 lg:static lg:bg-transparent lg:backdrop-blur-none">
          <PreviewBar form={form} />
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:items-start">

          <div className="space-y-6">
            {step === 1 && <FormStep1 form={form} update={update} errors={step1Errors} loadIndustryDefaults={loadIndustryDefaults} applyPosResult={applyPosResult} />}
            {step === 2 && <FormStep2 form={form} update={update} errors={step2Errors} />}
            {step === 3 && <FormStep3 form={form} update={update} errors={step3Errors} />}

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
            <div className="fixed top-20 w-[284px] space-y-3" style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
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
