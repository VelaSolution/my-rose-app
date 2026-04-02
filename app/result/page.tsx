"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import PlanGate from "@/components/PlanGate";
import { usePlan } from "@/lib/usePlan";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";
import {
  INDUSTRY_CONFIG, INDUSTRY_BENCHMARK, sanitizeFullForm, calcResult, calcSimulation,
  calcStrategies, calcAnalysis, calcReverse, saveHistory, loadHistory, deleteHistory,
  fmt, pct,
  type FullForm, type HistoryRecord,
} from "@/lib/vela";
import VelaChat from "@/components/VelaChat";

const CHART_COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1"];
type Briefing = { currentStatus: string; mainIssue: string; topAction: string; actionHint: string };

// ─── 전략 가이드 아코디언 ──────────────────────────────────────
type GuideItem = { title: string; items: { action: string; detail: string }[] };

function buildGuides(form: FullForm, result: ReturnType<typeof calcResult>): GuideItem[] {
  const config = INDUSTRY_CONFIG[form.industry];
  return [
    {
      title: "객단가를 높이는 방법",
      items: [
        { action: "세트 메뉴 구성", detail: "단품보다 10~15% 비싼 세트를 만들어 자연스럽게 추가 주문을 유도하세요. 음료+메인 조합이 가장 효과적입니다." },
        { action: "프리미엄 옵션 추가", detail: "기존 메뉴에 +2,000~5,000원짜리 업그레이드 옵션(특제 소스, 사이즈업, 토핑 추가)을 붙이세요." },
        { action: "테이블 추가 주문 유도", detail: "주문 시 '오늘의 추천', '인기 사이드' 등을 직원이 적극적으로 언급하면 객단가가 평균 8~12% 상승합니다." },
        { action: "계절 한정 메뉴 운영", detail: "희소성이 있는 시즌 메뉴는 일반 메뉴보다 20~30% 높은 가격을 책정해도 저항이 낮습니다." },
        { action: "디저트·음료 패키지", detail: `현재 객단가 ${fmt(form.avgSpend)}원 기준, 디저트 1개만 추가해도 ${fmt(Math.round(form.avgSpend * 0.15))}원 이상 객단가 상승 효과가 있습니다.` },
      ],
    },
    {
      title: "회전율을 높이는 방법",
      items: [
        { action: "주문·서빙 동선 개선", detail: "주문 → 조리 → 서빙 흐름을 분석해 병목 구간을 찾으세요. 보통 조리 대기가 가장 큰 병목입니다." },
        { action: "메뉴 수 줄이기", detail: "메뉴가 많을수록 선택 시간이 길어집니다. 핵심 메뉴 10~15개로 압축하면 주문 속도가 빨라지고 원가 관리도 쉬워집니다." },
        { action: "피크타임 예약제 도입", detail: "예약 고객은 대기 없이 바로 착석해 회전이 빠릅니다. 특히 주말 저녁 피크타임에 효과적입니다." },
        { action: "테이블 배치 재검토", detail: `현재 ${form.seats}석 기준, 4인 테이블을 2인 테이블 2개로 분리하면 소규모 손님 수용력이 높아져 실질 회전율이 올라갑니다.` },
        { action: "빠른 결제 시스템", detail: "QR 결제·테이블 오더 시스템 도입 시 테이블당 마감 시간이 평균 5~8분 단축됩니다." },
      ],
    },
    {
      title: "원가율을 낮추는 방법",
      items: [
        { action: "발주량 최적화", detail: "식재료 폐기율을 주 단위로 기록하세요. 폐기율 5% 감소만으로 원가율이 1~2%p 개선됩니다." },
        { action: "공동구매·단체 계약", detail: "인근 같은 업종 식당들과 식자재 공동구매를 하면 단가를 10~20% 낮출 수 있습니다." },
        { action: "메뉴 엔지니어링", detail: `원가율 ${form.cogsRate}% 기준, 원가율 높은 메뉴의 판매 비중을 줄이고 원가율 낮은 메뉴를 전면에 배치하세요.` },
        { action: "제철 식재료 활용", detail: "제철 재료는 품질이 좋고 가격이 저렴합니다. 계절 메뉴로 구성하면 원가와 신선도를 동시에 잡을 수 있습니다." },
        ...(form.industry !== "cafe" ? [{ action: "주류 구성 최적화", detail: `현재 주류 원가율 ${form.alcoholCogsRate}%. 하우스 와인·생맥주 등 원가율 낮은 주류 비중을 높이면 통합 원가율을 낮출 수 있습니다.` }] : []),
      ],
    },
    {
      title: "인건비를 효율화하는 방법",
      items: [
        { action: "시간대별 탄력 스케줄", detail: `평일 ${form.weekdayDays}일·주말 ${form.weekendDays}일 패턴에서 피크 시간대에만 풀 인원 배치하고, 한가한 시간대는 최소 인원으로 운영하세요.` },
        { action: "파트타임 비중 조정", detail: "정규직보다 파트타임 비중을 높이면 유연성이 올라갑니다. 단, 숙련도 관리가 핵심입니다." },
        { action: "다기능 직원 육성", detail: "홀·카운터·간단한 조리를 모두 할 수 있는 직원을 육성하면 인원 효율이 20~30% 올라갑니다." },
        { action: "키오스크·테이블 오더 도입", detail: "주문·결제를 자동화하면 카운터 인력 1명 분량을 줄일 수 있습니다. 초기 투자비 회수는 보통 6~12개월입니다." },
        { action: "비수기 영업시간 조정", detail: "매출이 낮은 시간대 영업을 단축하면 인건비와 공과금을 동시에 절감할 수 있습니다." },
      ],
    },
    {
      title: "배달 매출을 늘리는 방법",
      items: [
        { action: "배달 전용 메뉴 구성", detail: "배달에 최적화된(식어도 맛있는) 메뉴를 별도로 구성하세요. 홀 메뉴와 차별화하면 배달 전용 고객층을 잡을 수 있습니다." },
        { action: "리뷰 관리 집중", detail: "배달앱에서 별점 4.8 이상 유지가 핵심입니다. 주문 후 리뷰 요청 메시지 발송이 효과적입니다." },
        { action: "점심 특가 운영", detail: "배달 경쟁이 약한 오전 11~12시 구간에 점심 특가를 운영하면 주문 수를 늘릴 수 있습니다." },
        { action: "배달앱 수수료 구조 비교", detail: "배달의민족·쿠팡이츠·요기요 수수료 구조가 다릅니다. 주문 패턴에 맞는 플랫폼 조합을 찾으세요." },
        ...(form.deliveryEnabled ? [] : [{ action: "배달 채널 시작 검토", detail: `현재 홀 매출만으로 운영 중입니다. 배달 추가 시 월 ${fmt(Math.round(result.totalSales * 0.2))}원 이상의 추가 매출이 가능합니다.` }]),
      ],
    },
    {
      title: "마케팅·고객 유치 전략",
      items: [
        { action: "SNS 콘텐츠 정기 발행", detail: "인스타그램·네이버 플레이스에 주 2~3회 음식 사진을 올리세요. 플레이스 노출이 곧 신규 고객 유입입니다." },
        { action: "단골 고객 관리 프로그램", detail: "스탬프 카드·회원 적립 시스템 도입 시 재방문율이 평균 25% 상승합니다. 단골 1명이 신규 고객 3명보다 수익성이 높습니다." },
        { action: "점심 세트 할인으로 유입", detail: "처음 오는 고객을 점심 특가로 유입시키고, 저녁 정가 방문으로 전환하는 전략이 효과적입니다." },
        { action: "근처 직장인 타깃", detail: `${form.weekdayDays}일 평일 영업 기준, 주변 오피스 건물에 점심 단체 예약 할인 전단을 배포하면 안정적인 점심 매출이 만들어집니다.` },
        { action: "구글 맵 등록 & 관리", detail: "구글 맵 리뷰 관리는 외국인 관광객과 젊은 층 유입에 효과적입니다. 등록 후 사진과 메뉴 정보를 최신화하세요." },
      ],
    },
    {
      title: "손익분기점 빠르게 달성하는 방법",
      items: [
        { action: "BEP까지 비용 긴축", detail: `현재 BEP ${fmt(result.bep)}원 대비 매출이 ${result.bepGap >= 0 ? `${fmt(result.bepGap)}원 초과` : `${fmt(Math.abs(result.bepGap))}원 부족`} 상태입니다. BEP 달성 전까지는 마케팅·소모품비를 최소화하세요.` },
        { action: "변동비 우선 절감", detail: "BEP 달성에는 고정비 절감보다 변동비(원가율, 카드 수수료) 절감이 더 빠른 효과를 냅니다." },
        { action: "단기 매출 부스터 이벤트", detail: "오픈 특가, 생일 할인, SNS 이벤트 등 단기 프로모션으로 초기 인지도를 빠르게 올리세요." },
        { action: "고정비 재협상", detail: "임대료·통신비 등 고정비는 계약 갱신 시 협상 여지가 있습니다. 장기 계약 조건으로 임대료 인하를 요청해보세요." },
        { action: "투자금 회수 우선순위 설정", detail: `총 초기 투자비 ${fmt(result.totalInitialCost)}원 중 보증금 ${fmt(form.deposit)}원은 퇴거 시 반환됩니다. 실질 회수 대상은 ${fmt(result.totalInitialCost - form.deposit)}원입니다.` },
      ],
    },
  ];
}

function StrategyGuideSection({
  form, result,
}: {
  form: FullForm;
  result: ReturnType<typeof calcResult>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const guides = useMemo(() => buildGuides(form, result), [form, result]);

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">전략 가이드</h2>
        <p className="mt-1 text-sm text-slate-500">
          지표별 실행 전략을 펼쳐서 확인하세요. 현재 매장 수치에 맞춰 구체적으로 제안합니다.
        </p>
      </div>
      <div className="space-y-2">
        {guides.map((guide, index) => (
          <div key={guide.title} className="overflow-hidden rounded-2xl border border-slate-100">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <span className="text-sm font-semibold text-slate-900">{guide.title}</span>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className={`shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {openIndex === index && (
              <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-5 py-5">
                {guide.items.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.action}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

type AIStrategy = {
  title: string;
  description: string;
  difficulty: "쉬움" | "보통" | "어려움";
  category: string;
};

const DIFFICULTY_STYLE: Record<string, string> = {
  "쉬움": "bg-emerald-100 text-emerald-700",
  "보통": "bg-amber-100 text-amber-700",
  "어려움": "bg-red-100 text-red-700",
};

const CATEGORY_STYLE: Record<string, string> = {
  "메뉴": "bg-orange-100 text-orange-700",
  "마케팅": "bg-blue-100 text-blue-700",
  "운영": "bg-purple-100 text-purple-700",
  "공간": "bg-teal-100 text-teal-700",
  "고객관리": "bg-pink-100 text-pink-700",
};

function AIStrategySection({
  form, result, strategies,
}: {
  form: FullForm;
  result: ReturnType<typeof calcResult>;
  strategies: ReturnType<typeof calcStrategies>;
}) {
  const [aiStrategies, setAiStrategies] = useState<AIStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStrategies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, result, existingStrategies: strategies }),
      });
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      setAiStrategies(data.strategies ?? []);
    } catch (e) {
      setError("AI 전략 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">AI 추천 전략</h2>
          <p className="mt-1 text-sm text-slate-500">
            수치 시뮬레이션 외에 AI가 운영 방식·마케팅·메뉴 관점에서 새로운 전략을 제안합니다.
          </p>
        </div>
        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">VELA AI</div>
      </div>

      {!aiStrategies.length && !loading && (
        <button
          onClick={fetchStrategies}
          className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-95"
        >
          AI 전략 추천 받기
        </button>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl bg-slate-50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-slate-200" />
              </div>
              <div className="space-y-2">
                <div className="h-4 animate-pulse rounded bg-slate-200 w-2/5" />
                <div className="h-3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 animate-pulse rounded bg-slate-200 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button onClick={fetchStrategies} className="ml-3 underline">다시 시도</button>
        </div>
      )}

      {aiStrategies.length > 0 && (
        <>
          <div className="space-y-4">
            {aiStrategies.map((item, index) => (
              <div key={index} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <p className="text-base font-bold text-slate-900">{item.title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLE[item.category] ?? "bg-slate-100 text-slate-600"}`}>
                      {item.category}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLE[item.difficulty] ?? "bg-slate-100 text-slate-600"}`}>
                      {item.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-700">{item.description}</p>
              </div>
            ))}
          </div>
          <button
            onClick={fetchStrategies}
            className="mt-4 w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            다시 생성하기
          </button>
        </>
      )}
    </section>
  );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────
function SummaryCard({ title, value, sub, highlight }: { title: string; value: string; sub?: string; highlight?: "good" | "bad" | "info" }) {
  const bg = highlight === "good" ? "bg-emerald-50 ring-emerald-200" : highlight === "bad" ? "bg-red-50 ring-red-200" : highlight === "info" ? "bg-blue-50 ring-blue-200" : "bg-white ring-slate-200";
  const tc = highlight === "good" ? "text-emerald-700" : highlight === "bad" ? "text-red-700" : highlight === "info" ? "text-blue-700" : "text-slate-900";
  return (
    <div className={`rounded-3xl p-5 shadow-sm ring-1 ${bg}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${tc}`}>{value}</p>
      {sub && <p className="mt-2 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function InfoBox({ title, value, sub, tone = "default" }: { title: string; value: string; sub?: string; tone?: "default" | "good" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-slate-900";
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`mt-2 text-xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function AnalysisCard({ title, body, tone = "default" }: { title: string; body: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const map = { default: "bg-slate-50 text-slate-800", good: "bg-emerald-50 text-emerald-800", warn: "bg-amber-50 text-amber-800", bad: "bg-red-50 text-red-800" };
  return (
    <div className={`rounded-3xl p-4 ${map[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6">{body}</p>
    </div>
  );
}

function TagBadge({ label }: { label: string }) {
  const map: Record<string, string> = { "객단가": "bg-blue-100 text-blue-700", "회전율": "bg-purple-100 text-purple-700", "효율화": "bg-amber-100 text-amber-700", "원가": "bg-orange-100 text-orange-700", "복합": "bg-emerald-100 text-emerald-700", "배달": "bg-pink-100 text-pink-700" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[label] ?? "bg-slate-100 text-slate-600"}`}>{label}</span>;
}

// ─── AI 브리핑 ─────────────────────────────────────────────────
const BRIEFING_KEY = "vela-briefing-usage";
const FREE_BRIEFING_LIMIT = 3;

function getBriefingUsage(): { count: number; month: string } {
  if (typeof window === "undefined") return { count: 0, month: "" };
  try {
    const raw = localStorage.getItem(BRIEFING_KEY);
    if (!raw) return { count: 0, month: "" };
    return JSON.parse(raw);
  } catch { return { count: 0, month: "" }; }
}

function incrementBriefingUsage() {
  const now = new Date();
  const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const usage = getBriefingUsage();
  const count = usage.month === month ? usage.count + 1 : 1;
  localStorage.setItem(BRIEFING_KEY, JSON.stringify({ count, month }));
}

function AIBriefingSection({ form, result, plan }: { form: FullForm; result: ReturnType<typeof calcResult>; plan: string }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const usage = getBriefingUsage();
  const usedThisMonth = usage.month === currentMonth ? usage.count : 0;
  const isLimited = plan === "free" && usedThisMonth >= FREE_BRIEFING_LIMIT;
  const remaining = FREE_BRIEFING_LIMIT - usedThisMonth;

  const fetchBriefing = async () => {
    if (isLimited) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ form, result }) });
      if (!res.ok) throw new Error("API 오류");
      setBriefing(await res.json());
      if (plan === "free") incrementBriefingUsage();
    } catch (e) { setError("AI 분석 중 오류가 발생했습니다. 다시 시도해주세요."); console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">AI 브리핑</h2>
          <p className="mt-1 text-sm text-slate-500">
            현재 수치를 기반으로 AI가 실시간 경영 조언을 생성합니다.
            {plan === "free" && <span className="ml-2 text-blue-500 font-semibold">(월 {remaining > 0 ? `${remaining}회 남음` : "한도 소진"})</span>}
          </p>
        </div>
        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">VELA AI</div>
      </div>
      {isLimited && !briefing && (
        <div className="rounded-2xl bg-slate-50 p-5 text-center">
          <p className="text-sm text-slate-600 mb-3">이번 달 무료 AI 브리핑 횟수를 모두 사용했어요.</p>
          <a href="/pricing" className="inline-block rounded-xl bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-blue-700 transition">업그레이드하면 무제한 →</a>
        </div>
      )}
      {!isLimited && !briefing && !loading && (
        <button onClick={fetchBriefing} className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white transition hover:bg-slate-700">AI 브리핑 생성하기</button>
      )}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {["현재 상태", "핵심 문제", "최우선 전략", "실행 힌트"].map((t) => (
            <div key={t} className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{t}</p>
              <div className="mt-2 space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className={`h-3 animate-pulse rounded bg-slate-200 ${i === 2 ? "w-4/5" : i === 3 ? "w-3/5" : "w-full"}`} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}<button onClick={fetchBriefing} className="ml-3 underline">다시 시도</button></div>}
      {briefing && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {[{ title: "현재 상태", body: briefing.currentStatus }, { title: "핵심 문제", body: briefing.mainIssue }, { title: "최우선 전략", body: briefing.topAction }, { title: "실행 힌트", body: briefing.actionHint }].map(({ title, body }) => (
              <div key={title} className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
              </div>
            ))}
          </div>
          <button onClick={fetchBriefing} className="mt-4 w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">다시 생성하기</button>
        </>
      )}
    </section>
  );
}

// ─── 히스토리 ──────────────────────────────────────────────────
function HistorySection() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  useEffect(() => { setHistory(loadHistory()); }, []);
  if (history.length === 0) return null;

  const chartData = [...history].reverse().map((r) => ({
    label: r.label.replace("년 ", "/").replace("월", ""),
    매출: Math.round(r.result.totalSales / 10000),
    세전순이익: Math.round(r.result.profit / 10000),
    세후실수령: Math.round(r.result.netProfit / 10000),
  }));

  const latest = history[0];
  const prev = history[1];
  const profitDiff = prev ? latest.result.profit - prev.result.profit : null;

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">월별 추이</h2>
          <p className="mt-1 text-sm text-slate-500">저장된 최근 {history.length}개월 데이터입니다.</p>
        </div>
        {profitDiff !== null && (
          <div className={`rounded-full px-4 py-2 text-sm font-semibold ${profitDiff >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            전월 대비 {profitDiff >= 0 ? "+" : ""}{fmt(profitDiff)}원
          </div>
        )}
      </div>
      {history.length >= 2 && (
        <div className="mb-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}만`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, name) => [`${fmt(Number(v) * 10000)}원`, String(name)]} />
              <Legend />
              <Line type="monotone" dataKey="매출" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="세전순이익" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="세후실수령" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="space-y-2">
        {history.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{r.label}</p>
              <p className="text-xs text-slate-500">
                매출 {fmt(r.result.totalSales)}원 &nbsp;·&nbsp;
                <span className={r.result.profit >= 0 ? "text-emerald-600" : "text-red-500"}>순이익 {fmt(r.result.profit)}원</span>
                &nbsp;·&nbsp; 세후 {fmt(r.result.netProfit)}원
                {r.result.recoveryMonthsActual < 999 && <span className="text-slate-400"> &nbsp;·&nbsp; 회수 {r.result.recoveryMonthsActual}개월</span>}
              </p>
            </div>
            <button onClick={() => { deleteHistory(r.id); setHistory(loadHistory()); }}
              className="ml-3 rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-400 hover:bg-slate-100">삭제</button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── 결과 컨텐츠 ───────────────────────────────────────────────
function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareMemo, setShareMemo] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [showCloudSave, setShowCloudSave] = useState(false);
  const [cloudSaveTitle, setCloudSaveTitle] = useState("");
  const [cloudSaving, setCloudSaving] = useState(false);
  const autoSavedRef = React.useRef(false);
  const { plan } = usePlan();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => setUserId(data.user?.id ?? null));
  }, []);

  const form = useMemo<FullForm>(() => {
    const raw: Record<string, unknown> = {};
    searchParams.forEach((v, k) => { raw[k] = v; });
    return sanitizeFullForm(raw);
  }, [searchParams]);

  const result = useMemo(() => calcResult(form), [form]);
  const simulation = useMemo(() => calcSimulation(form), [form]);
  const strategies = useMemo(() => calcStrategies(form, result.profit), [form, result.profit]);
  const analysis = useMemo(() => calcAnalysis(form, result), [form, result]);
  const config = INDUSTRY_CONFIG[form.industry];
  const isProfit = result.profit >= 0;

  useEffect(() => { saveHistory(form, result); }, [form, result]);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // 자동 클라우드 저장 (로그인 시 시뮬레이션 실행마다 자동 저장)
  // 무료: 최대 3개, 스탠다드/프로: 무제한
  const FREE_HISTORY_LIMIT = 3;
  useEffect(() => {
    if (!userId || autoSavedRef.current) return;
    autoSavedRef.current = true;
    const supabase = createSupabaseBrowserClient();

    // 무료 플랜이면 저장 개수 확인
    if (plan === "free") {
      supabase.from("simulation_history").select("id").eq("user_id", userId)
        .then(({ data: rows }: { data: { id: string }[] | null }) => {
          if ((rows?.length ?? 0) >= FREE_HISTORY_LIMIT) return;
          const now = new Date();
          const label = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} (자동저장)`;
          supabase.from("simulation_history").insert({
            user_id: userId, label, form,
            result: { totalSales: result.totalSales, profit: result.profit, netProfit: result.netProfit, netMargin: result.netMargin, bep: result.bep, recoveryMonthsActual: result.recoveryMonthsActual, cogsRate: form.cogsRate, laborRate: result.laborCost > 0 ? Math.round((result.laborCost / result.totalSales) * 100) : 0 },
          }).then(() => {});
        });
    } else {
      const now = new Date();
      const label = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} (자동저장)`;
      supabase.from("simulation_history").insert({
        user_id: userId, label, form,
        result: { totalSales: result.totalSales, profit: result.profit, netProfit: result.netProfit, netMargin: result.netMargin, bep: result.bep, recoveryMonthsActual: result.recoveryMonthsActual, cogsRate: form.cogsRate, laborRate: result.laborCost > 0 ? Math.round((result.laborCost / result.totalSales) * 100) : 0 },
      }).then(() => {});
    }
  }, [userId, form, result, plan]);

  const saveToCloud = async (title?: string) => {
    if (!userId) { router.push("/login"); return; }
    const supabase = createSupabaseBrowserClient();
    const now = new Date();
    const label = title || `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const { error } = await supabase.from("simulation_history").insert({
      user_id: userId, label, form,
      result: { totalSales: result.totalSales, profit: result.profit, netProfit: result.netProfit, netMargin: result.netMargin, bep: result.bep, recoveryMonthsActual: result.recoveryMonthsActual },
    });
    if (error) { setSaveMsg("저장 실패. 다시 시도해주세요."); return; }
    setSaveMsg(`'${label}' 저장 완료 ✓`);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleCloudSaveSubmit = async () => {
    if (!cloudSaveTitle.trim()) return;
    setCloudSaving(true);
    await saveToCloud(cloudSaveTitle.trim());
    setCloudSaving(false);
    setShowCloudSave(false);
    setCloudSaveTitle("");
  };

  // 커뮤니티 공유
  const shareToComm = async () => {
    if (!userId) { router.push("/login"); return; }
    if (!shareTitle.trim()) { alert("제목을 입력해주세요."); return; }
    setSharing(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const nick = user?.user_metadata?.nickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "익명 사장님";
    const { error } = await supabase.from("simulation_shares").insert({
      user_id: userId,
      nickname: nick,
      industry: form.industry,
      title: shareTitle.trim(),
      total_sales: result.totalSales,
      profit: result.profit,
      net_profit: result.netProfit,
      net_margin: result.netMargin,
      cogs_ratio: form.cogsRate,
      labor_ratio: result.laborCost > 0 ? Math.round((result.laborCost / result.totalSales) * 100) : 0,
      bep: result.bep,
      memo: shareMemo.trim(),
    });
    setSharing(false);
    if (error) { alert("공유 실패. 다시 시도해주세요."); return; }
    setShareMsg("커뮤니티에 공유됐어요! 🎉");
    setShowShareModal(false);
    setShareTitle(""); setShareMemo("");
    setTimeout(() => setShareMsg(""), 4000);
  };

  const pieData = useMemo(() => {
    const base = [
      { name: "원가", value: result.cogs },
      { name: "인건비", value: result.laborCost },
      { name: "임대료", value: form.rent },
      { name: "공과금+통신", value: form.utilities + form.telecom },
      { name: "마케팅+기타", value: form.marketing + form.supplies + form.maintenance + form.etc },
    ];
    if (isProfit) base.push({ name: "순이익", value: result.profit });
    return base;
  }, [result, form, isProfit]);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      
      <main className="px-4 py-6 md:px-8 print:px-0">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* 헤더 */}
        <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">VELA</div>
                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{config.label}</div>
                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{form.businessType === "new" ? "창업 예정" : "운영 중"}</div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">분석 결과</h1>
              <p className="mt-2 text-slate-500">입력하신 수치를 {config.label} 기준으로 분석했습니다.</p>
            </div>
            <div className={`inline-flex h-fit rounded-full px-4 py-2 text-sm font-semibold ${isProfit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {isProfit ? "현재 흑자 구조입니다" : "현재 적자 구조입니다"}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 print:hidden">
            <button onClick={() => router.push("/simulator")} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">← 입력으로 돌아가기</button>
            <button onClick={() => window.print()} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">PDF로 저장</button>
            <button onClick={() => navigator.clipboard.writeText(window.location.href).catch(console.error)} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">링크 공유</button>
            <button onClick={() => { if (!userId) { router.push("/login"); return; } setShareTitle(`${config.label} 분석 결과 공유`); setShowShareModal(true); }} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500">
              👥 커뮤니티에 공유
            </button>
            <button onClick={() => { if (!userId) { router.push("/login"); return; } setCloudSaveTitle(""); setShowCloudSave(true); }} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              {userId ? "☁️ 클라우드 저장" : "🔒 로그인 후 저장"}
            </button>
            {saveMsg && <span className="self-center text-sm font-medium text-emerald-600">{saveMsg}</span>}
            {shareMsg && <span className="self-center text-sm font-medium text-emerald-600">{shareMsg}</span>}
            {userId && (
              <button onClick={() => router.push("/profile")} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                대시보드 →
              </button>
            )}
          </div>

          {/* 클라우드 저장 모달 */}
          {showCloudSave && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowCloudSave(false)}>
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold text-slate-900">☁️ 클라우드에 저장</h3>
                <p className="text-xs text-slate-400">나중에 불러올 수 있도록 제목을 입력해주세요.</p>
                <input
                  value={cloudSaveTitle}
                  onChange={e => setCloudSaveTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCloudSaveSubmit(); }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  placeholder="예: 홍대 카페 2026년 4월"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowCloudSave(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
                  <button onClick={handleCloudSaveSubmit} disabled={!cloudSaveTitle.trim() || cloudSaving}
                    className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                    {cloudSaving ? "저장 중..." : "저장하기"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 커뮤니티 공유 모달 */}
          {showShareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowShareModal(false)}>
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">커뮤니티에 공유하기</h3>
                    <p className="text-xs text-slate-400 mt-1">분석 결과를 사장님 커뮤니티에 공유하세요</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{config.icon} {config.label}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">게시글 제목 (수정 가능)</label>
                    <input value={shareTitle} onChange={e => setShareTitle(e.target.value)} placeholder="제목을 입력하세요"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3">
                    {[
                      { l: "월 총 매출", v: `${result.totalSales.toLocaleString()}원` },
                      { l: "세후 순이익", v: `${result.netProfit.toLocaleString()}원`, c: result.netProfit >= 0 ? "text-emerald-600" : "text-red-500" },
                      { l: "순이익률", v: `${result.netMargin.toFixed(1)}%` },
                      { l: "원가율", v: `${form.cogsRate}%` },
                    ].map(s => (
                      <div key={s.l}>
                        <p className="text-xs text-slate-400">{s.l}</p>
                        <p className={`text-sm font-bold ${s.c ?? "text-slate-800"}`}>{s.v}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">한 마디 (선택)</label>
                    <textarea value={shareMemo} onChange={e => setShareMemo(e.target.value)} placeholder="요즘 어떤가요? 한 마디 남겨보세요 (선택)"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 resize-none h-16" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowShareModal(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
                  <button onClick={shareToComm} disabled={sharing || !shareTitle.trim()} className="flex-2 flex-grow-[2] rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                    {sharing ? "공유 중..." : "👥 공유하기"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 핵심 요약 — 6개 */}
        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard title="월 총 매출" value={`${fmt(result.totalSales)}원`} sub={`홀 ${fmt(result.hallSales)} · 배달 ${fmt(result.deliveryNetSales)}`} />
          <SummaryCard title="세전 순이익" value={`${fmt(result.profit)}원`} sub={`순이익률 ${pct(result.netMargin)}`} highlight={isProfit ? "good" : "bad"} />
          <SummaryCard title="세후 실수령" value={`${fmt(result.netProfit)}원`} sub={`세금 ${fmt(result.incomeTax + result.vatBurden)}원 차감`} highlight={result.netProfit >= 0 ? "good" : "bad"} />
          <SummaryCard title="현금흐름" value={`${fmt(result.cashFlow)}원`} sub={form.loanEnabled ? `대출 상환 ${fmt(result.monthlyLoanPayment)}원 차감` : "대출 없음"} highlight={result.cashFlow >= 0 ? "good" : "bad"} />
          <SummaryCard title="손익분기점" value={`${fmt(result.bep)}원`} sub={result.bepGap >= 0 ? `${fmt(result.bepGap)}원 초과` : `${fmt(Math.abs(result.bepGap))}원 부족`} highlight={result.bepGap >= 0 ? "good" : "bad"} />
          <SummaryCard title="투자금 회수" value={result.recoveryMonthsActual === 999 ? "불가" : `${result.recoveryMonthsActual}개월`}
            sub={`목표 ${form.recoveryMonths}개월`} highlight={result.recoveryMonthsActual <= form.recoveryMonths ? "good" : result.recoveryMonthsActual === 999 ? "bad" : "info"} />
        </section>

        {/* 업종 평균 벤치마크 */}
        {(() => {
          const bench = INDUSTRY_BENCHMARK[form.industry];
          const metrics = [
            { label: "원가율", mine: result.cogsRatio, avg: bench.cogsRate, lowerBetter: true },
            { label: "인건비율", mine: result.laborRatio, avg: bench.laborRate, lowerBetter: true },
            { label: "임대료율", mine: result.rentRatio, avg: bench.rentRate, lowerBetter: true },
            { label: "순이익률", mine: result.netMargin, avg: bench.netMargin, lowerBetter: false },
          ];
          return (
            <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">업종 평균 비교</h2>
                  <p className="mt-1 text-sm text-slate-500">{config.label} 업종 평균과 내 매장을 비교합니다.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{config.label} 평균</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map(({ label, mine, avg, lowerBetter }) => {
                  const diff = mine - avg;
                  const good = lowerBetter ? diff <= 0 : diff >= 0;
                  const color = good ? "text-emerald-600" : "text-red-500";
                  const barColor = good ? "#10b981" : "#ef4444";
                  const maxVal = Math.max(mine, avg) * 1.3;
                  return (
                    <div key={label} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-2xl font-bold text-slate-900">{pct(mine)}</span>
                        <span className={`mb-0.5 text-xs font-semibold ${color}`}>
                          {diff > 0 ? "+" : ""}{pct(diff)}
                        </span>
                      </div>
                      {/* 게이지 */}
                      <div className="mt-3 space-y-1.5">
                        <div>
                          <div className="mb-0.5 flex justify-between text-[10px] text-slate-400">
                            <span>내 매장</span><span>{pct(mine)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(mine / maxVal * 100, 100)}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                        <div>
                          <div className="mb-0.5 flex justify-between text-[10px] text-slate-400">
                            <span>업종 평균</span><span>{pct(avg)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200">
                            <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${Math.min(avg / maxVal * 100, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* 비용 구조 차트 */}
        {(() => {
          const breakdown = result.costBreakdown ?? {
            labor: result.laborCost + result.insuranceCost,
            cogs: result.cogs,
            rent: form.rent,
            utilities: form.utilities + form.telecom,
            cardFee: result.cardFee,
            royalty: 0,
            marketing: form.marketing,
            other: form.supplies + form.maintenance + form.etc,
          };
          const items = [
            { name: "인건비", value: breakdown.labor, color: "#0f172a" },
            { name: "원가", value: breakdown.cogs, color: "#334155" },
            { name: "임대료", value: breakdown.rent, color: "#475569" },
            { name: "공과금·통신", value: breakdown.utilities, color: "#64748b" },
            { name: "카드수수료", value: breakdown.cardFee, color: "#94a3b8" },
            { name: "마케팅", value: breakdown.marketing, color: "#b0bec5" },
            { name: "기타", value: breakdown.other, color: "#cbd5e1" },
          ].filter(i => i.value > 0);
          const total = items.reduce((s, i) => s + i.value, 0);
          return (
            <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-1 text-xl font-bold text-slate-900">비용 구조</h2>
              <p className="mb-5 text-sm text-slate-500">월 총 비용 {fmt(total)}원의 구성</p>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                {/* 파이차트 */}
                <div className="flex-shrink-0" style={{ width: 220, height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={items} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                        {items.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${fmt(Number(v ?? 0))}원`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* 범례 + 바 */}
                <div className="flex-1 space-y-2">
                  {items.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-semibold">{fmt(item.value)}원 ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* 민감도 슬라이더 */}
        {(() => {
          const [sensitivity, setSensitivity] = React.useState({ avgSpend: form.avgSpend, turnover: form.turnover, cogsRate: form.cogsRate });
          const simResult = useMemo(() => calcResult({ ...form, ...sensitivity }), [sensitivity]);
          const profitDiff = simResult.profit - result.profit;
          return (
            <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">민감도 분석</h2>
                <p className="mt-1 text-sm text-slate-500">슬라이더를 조절해 수익 변화를 즉시 확인하세요.</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
                  {[
                    { key: "avgSpend" as const, label: "객단가", min: Math.round(form.avgSpend * 0.5), max: Math.round(form.avgSpend * 2), step: 100, suffix: "원" },
                    { key: "turnover" as const, label: "회전율", min: 0.1, max: config.maxTurnover, step: 0.1, suffix: "회" },
                    { key: "cogsRate" as const, label: "원가율", min: 5, max: 70, step: 0.5, suffix: "%" },
                  ].map(({ key, label, min, max, step, suffix }) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span className="font-bold text-slate-900">{sensitivity[key]}{suffix}</span>
                      </div>
                      <input
                        type="range" min={min} max={max} step={step}
                        value={sensitivity[key]}
                        onChange={(e) => setSensitivity(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full accent-slate-900"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>{min}{suffix}</span><span>{max}{suffix}</span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setSensitivity({ avgSpend: form.avgSpend, turnover: form.turnover, cogsRate: form.cogsRate })}
                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                  >초기값으로 리셋</button>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 p-5 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">세전 순이익</p>
                    <p className={`text-3xl font-bold mt-1 ${simResult.profit >= 0 ? "text-slate-900" : "text-red-500"}`}>{fmt(simResult.profit)}원</p>
                    <p className={`text-sm font-semibold mt-1 ${profitDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {profitDiff >= 0 ? "▲" : "▼"} {fmt(Math.abs(profitDiff))}원 ({profitDiff >= 0 ? "+" : ""}{result.profit !== 0 ? ((profitDiff / Math.abs(result.profit)) * 100).toFixed(1) : "0"}%)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">세후 실수령</p>
                      <p className="font-bold text-slate-900 mt-0.5">{fmt(simResult.netProfit)}원</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">총 매출</p>
                      <p className="font-bold text-slate-900 mt-0.5">{fmt(simResult.totalSales)}원</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">손익분기점</p>
                      <p className={`font-bold mt-0.5 ${simResult.bepGap >= 0 ? "text-emerald-600" : "text-red-500"}`}>{simResult.bepGap >= 0 ? "✓ 달성" : "✗ 미달"}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-slate-400">순이익률</p>
                      <p className="font-bold text-slate-900 mt-0.5">{pct(simResult.netMargin)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* 운영 진단 */}
        <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">운영 진단</h2>
            <p className="mt-1 text-sm text-slate-500">{config.label} 기준으로 해당하는 문제를 모두 표시합니다.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analysis.map((item) => <AnalysisCard key={item.title} title={item.title} body={item.body} tone={item.tone} />)}
          </div>
        </section>

        {/* AI 브리핑 — 무료: 월3회, 유료: 무제한 */}
        <AIBriefingSection form={form} result={result} plan={plan} />

        {/* 비용 상세 + 추천 전략 */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">비용 상세</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoBox title="인건비 (4대보험 포함)" value={`${fmt(result.laborCost + result.insuranceCost)}원`} sub={`비율 ${pct(result.laborRatio)}`} tone={result.laborRatio < config.laborWarnRate ? "good" : "bad"} />
              {form.industry === "cafe" ? (
                <InfoBox title="식자재 원가" value={`${fmt(result.cogs)}원`} sub={`원가율 ${pct(result.cogsRatio)}`} tone={form.cogsRate < config.cogsWarnRate ? "good" : "bad"} />
              ) : (
                <>
                  <InfoBox title="식자재 원가" value={`${fmt(result.foodCogs)}원`} sub={`식자재 원가율 ${form.cogsRate}% (식사 매출의 ${100 - form.alcoholSalesRatio}%)`} />
                  <InfoBox title="주류 원가" value={`${fmt(result.alcoholCogs)}원`} sub={`주류 원가율 ${form.alcoholCogsRate}% (주류 매출의 ${form.alcoholSalesRatio}%)`} />
                  <InfoBox title="통합 원가율" value={pct(result.cogsRatio)} sub={`식자재 + 주류 합산`} tone={result.cogsRatio < config.cogsWarnRate ? "good" : "bad"} />
                </>
              )}
              <InfoBox title="임대 & 시설" value={`${fmt(form.rent + form.utilities + form.telecom + form.maintenance)}원`} />
              <InfoBox title="마케팅 & 기타" value={`${fmt(form.marketing + form.supplies + form.etc)}원`} />
              <InfoBox title="카드 수수료" value={`${fmt(result.cardFee)}원`} sub={`${form.cardFeeRate}% 적용`} />
              <InfoBox title="소득세 + 부가세" value={`${fmt(result.incomeTax + result.vatBurden)}원`} sub={`세율 ${form.incomeTaxRate}% ${form.vatEnabled ? "+ 부가세" : ""}`} />
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">추천 전략</h2>
            <p className="mt-1 text-sm text-slate-500">단일·복합 시나리오 순이익 개선 효과 순입니다.</p>
            <div className="mt-5 space-y-3">
              {strategies.map((item, index) => (
                <div key={item.label} className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${index === 0 ? "bg-slate-900" : "bg-slate-400"}`}>{index + 1}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <div className="mt-1 flex flex-wrap gap-1">{item.tags.map((t) => <TagBadge key={t} label={t} />)}</div>
                      <p className="mt-1 text-xs text-slate-500">세후 {fmt(item.netProfit)}원 · 현금흐름 {fmt(item.cashFlow)}원</p>
                    </div>
                  </div>
                  <div className="ml-2 shrink-0 text-sm font-semibold text-emerald-600">+{fmt(item.diff)}원</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI 추천 전략 — 유료 전용 */}
        <PlanGate>
          <AIStrategySection form={form} result={result} strategies={strategies} />
        </PlanGate>

        {/* 초기비용 & 부채 현황 */}
        {result.totalInitialCost > 0 && (
          <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">초기비용 & 투자 회수 현황</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoBox title="총 초기 투자비" value={`${fmt(result.totalInitialCost)}원`} sub="보증금 포함" />
              <InfoBox title="실질 투자금" value={`${fmt(result.totalInitialCost - form.deposit)}원`} sub="보증금 제외" />
              <InfoBox title="월 현금흐름" value={`${fmt(result.cashFlow)}원`} sub="세후 - 대출상환" tone={result.cashFlow >= 0 ? "good" : "bad"} />
              <InfoBox title="예상 회수 기간" value={result.recoveryMonthsActual === 999 ? "회수 불가" : `${result.recoveryMonthsActual}개월`}
                sub={`목표 ${form.recoveryMonths}개월`} tone={result.recoveryMonthsActual <= form.recoveryMonths ? "good" : "bad"} />
            </div>
            {/* 비용 구성 */}
            <div className="mt-5 space-y-2">
              {[
                { label: "보증금", value: form.deposit, note: "퇴거 시 반환" },
                { label: "권리금", value: form.premiumKey, note: "회수 불가" },
                { label: "인테리어", value: form.interior, note: "회수 불가" },
                { label: "주방기기 & 집기", value: form.equipment, note: "중고 처분 일부 회수 가능" },
                { label: "간판 & 홍보물", value: form.signage, note: "회수 불가" },
                { label: "기타 초기비용", value: form.otherSetup, note: "" },
              ].filter((i) => i.value > 0).map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    {item.note && <span className="ml-2 text-xs text-slate-400">{item.note}</span>}
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{fmt(item.value)}원</span>
                </div>
              ))}
            </div>
            {/* 부채 현황 */}
            {form.loanEnabled && (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-900">부채 현황</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div><p className="text-xs text-amber-700">대출 원금</p><p className="font-bold text-amber-900">{fmt(form.loanAmount)}원</p></div>
                  <div><p className="text-xs text-amber-700">월 상환액</p><p className="font-bold text-amber-900">{fmt(result.monthlyLoanPayment)}원</p></div>
                  <div><p className="text-xs text-amber-700">상환 기간</p><p className="font-bold text-amber-900">{form.loanTermMonths}개월</p></div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 차트 */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">매출 대비 구성비</h2>
            {!isProfit && <p className="mb-2 text-xs text-red-500">적자 상태로 순이익 슬라이스는 표시되지 않습니다.</p>}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3}>
                    {pieData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `${fmt(Number(value ?? 0))}원`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-1">객단가 변화 시뮬레이션</h2>
            <p className="mb-4 text-sm text-slate-500">{config.label} 기준 +{Math.round(config.simPctMin * 100)}%~+{Math.round(config.simPctMax * 100)}% 범위</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={simulation}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 10000)}만`} />
                  <Tooltip formatter={(value, name) => [`${fmt(Number(value ?? 0))}원`, String(name)]} />
                  <Bar dataKey="profit" name="세전순이익" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="netProfit" name="세후실수령" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="cashFlow" name="현금흐름" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 월별 히스토리 */}
        <HistorySection />

        {/* 전략 가이드 — 지표별 실행 전략 아코디언 */}
        <StrategyGuideSection form={form} result={result} />

        <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 print:hidden">
          <button onClick={() => router.push("/simulator")} className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">← 수치 다시 입력하기</button>
        </section>
      </div>

      {/* 플로팅 AI 채팅 */}
      <VelaChat context={{ form: form as unknown as Record<string, unknown>, result: result as unknown as Record<string, unknown> }} />
    </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">결과를 불러오는 중...</p></main>}>
      <ResultContent />
    </Suspense>
  );
}