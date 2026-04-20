"use client";

import { useState } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge, { ConflictBanner } from "@/components/CloudSyncBadge";

const TABS = ["사업 개요", "시장 분석", "메뉴 전략", "재무 계획", "마케팅 전략", "실행 일정"] as const;
type Tab = (typeof TABS)[number];

type Competitor = { name: string; strength: string; weakness: string };
type SigMenu = { name: string; price: number; costRate: number };
type Timeline = { period: string; task: string; status: "대기" | "진행중" | "완료" };

interface BPlan {
  /* 사업 개요 */
  bizName: string; industry: string; concept: string; target: string; diff: string;
  /* 시장 분석 */
  location: string; traffic: string; competitors: Competitor[]; opportunity: string;
  /* 메뉴 전략 */
  menus: SigMenu[]; pricingStrategy: string;
  /* 재무 계획 */
  initInvest: number; monthlyFixed: number; variableRate: number; targetRevenue: number;
  /* 마케팅 */
  mktBefore: string; mktAfter: string; mktSns: string; mktDelivery: string;
  /* 실행 일정 */
  timeline: Timeline[];
}

const empty: BPlan = {
  bizName: "", industry: "cafe", concept: "", target: "", diff: "",
  location: "", traffic: "", competitors: [{ name: "", strength: "", weakness: "" }], opportunity: "",
  menus: [{ name: "", price: 0, costRate: 30 }], pricingStrategy: "",
  initInvest: 0, monthlyFixed: 0, variableRate: 35, targetRevenue: 0,
  mktBefore: "", mktAfter: "", mktSns: "", mktDelivery: "",
  timeline: [{ period: "", task: "", status: "대기" }],
};

const KEY = "vela-business-plan";
const INDUSTRY: Record<string, string> = { cafe: "카페", restaurant: "음식점", bar: "술집/바", finedining: "파인다이닝", gogi: "고깃집" };

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default function BusinessPlanPage() {
  const [tab, setTab] = useState<Tab>("사업 개요");
  const { data: bp, update: setBpCloud, status, userId, storageMode, lastSyncedAt, conflict, resolveConflict, saveNow } = useCloudSync<BPlan>(KEY, empty);
  const [preview, setPreview] = useState(false);

  const up = <K extends keyof BPlan>(k: K, v: BPlan[K]) => setBpCloud({ ...bp, [k]: v });

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white outline-none transition";
  const cardCls = "bg-white ring-1 ring-slate-200 rounded-3xl p-6 mb-4";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

  /* BEP */
  const bepRevenue = bp.variableRate < 100 ? Math.round(bp.monthlyFixed / (1 - bp.variableRate / 100)) : 0;

  /* 12개월 현금흐름 */
  const cashFlow = Array.from({ length: 12 }, (_, i) => {
    const rev = bp.targetRevenue;
    const variable = Math.round(rev * bp.variableRate / 100);
    const profit = rev - bp.monthlyFixed - variable;
    return { month: i + 1, rev, fixed: bp.monthlyFixed, variable, profit };
  });

  const buildText = () => {
    let t = `━━━ 사업계획서: ${bp.bizName || "(미입력)"} ━━━\n\n`;
    t += `【사업 개요】\n업종: ${INDUSTRY[bp.industry] ?? bp.industry}\n컨셉: ${bp.concept}\n타깃 고객: ${bp.target}\n차별화: ${bp.diff}\n\n`;
    t += `【시장 분석】\n위치: ${bp.location}\n유동인구: ${bp.traffic}\n`;
    bp.competitors.forEach((c, i) => { t += `경쟁업체 ${i + 1}: ${c.name} | 강점: ${c.strength} | 약점: ${c.weakness}\n`; });
    t += `시장 기회: ${bp.opportunity}\n\n`;
    t += `【메뉴 전략】\n`;
    bp.menus.forEach(m => { t += `• ${m.name} — ${fmt(m.price)}원 (목표 원가율 ${m.costRate}%)\n`; });
    t += `가격 전략: ${bp.pricingStrategy}\n\n`;
    t += `【재무 계획】\n초기 투자금: ${fmt(bp.initInvest)}만원\n월 고정비: ${fmt(bp.monthlyFixed)}만원\n변동비율: ${bp.variableRate}%\n목표 월매출: ${fmt(bp.targetRevenue)}만원\n손익분기점 매출: ${fmt(bepRevenue)}만원\n\n`;
    t += `【마케팅 전략】\n오픈 전: ${bp.mktBefore}\n오픈 후: ${bp.mktAfter}\nSNS: ${bp.mktSns}\n배달앱: ${bp.mktDelivery}\n\n`;
    t += `【실행 일정】\n`;
    bp.timeline.forEach(tl => { t += `• [${tl.status}] ${tl.period} — ${tl.task}\n`; });
    return t;
  };

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <Link href="/tools" className="text-xs text-slate-400 hover:text-slate-600 transition">← 도구 목록</Link>
          <div className="mt-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>📝</span> 사업계획서 도우미
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">사업계획서 작성 도우미</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm">단계별로 작성하고 한 번에 미리보기 · 복사할 수 있습니다.</p>
              <CloudSyncBadge status={status} userId={userId} storageMode={storageMode} lastSyncedAt={lastSyncedAt} onSaveNow={saveNow} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* 사업 개요 */}
          {tab === "사업 개요" && (
            <div className={cardCls}>
              <label className={labelCls}>사업명</label>
              <input className={inputCls} value={bp.bizName} onChange={e => up("bizName", e.target.value)} placeholder="예: 로즈 카페" />
              <label className={`${labelCls} mt-4`}>업종</label>
              <select className={inputCls} value={bp.industry} onChange={e => up("industry", e.target.value)}>
                {Object.entries(INDUSTRY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label className={`${labelCls} mt-4`}>사업 컨셉</label>
              <textarea className={`${inputCls} h-24`} value={bp.concept} onChange={e => up("concept", e.target.value)} placeholder="핵심 컨셉과 방향성을 서술하세요" />
              <label className={`${labelCls} mt-4`}>타깃 고객</label>
              <textarea className={`${inputCls} h-20`} value={bp.target} onChange={e => up("target", e.target.value)} placeholder="연령, 성별, 직업, 라이프스타일 등" />
              <label className={`${labelCls} mt-4`}>차별화 포인트</label>
              <textarea className={`${inputCls} h-20`} value={bp.diff} onChange={e => up("diff", e.target.value)} placeholder="경쟁업체 대비 핵심 차별점" />
            </div>
          )}

          {/* 시장 분석 */}
          {tab === "시장 분석" && (
            <div className={cardCls}>
              <label className={labelCls}>상권 위치</label>
              <input className={inputCls} value={bp.location} onChange={e => up("location", e.target.value)} placeholder="예: 서울 강남구 역삼동" />
              <label className={`${labelCls} mt-4`}>유동인구 예상</label>
              <input className={inputCls} value={bp.traffic} onChange={e => up("traffic", e.target.value)} placeholder="예: 평일 점심 약 3,000명/시간" />
              <label className={`${labelCls} mt-4`}>주요 경쟁업체</label>
              {bp.competitors.map((c, i) => (
                <div key={i} className="flex gap-2 mb-2 flex-wrap">
                  <input className={`${inputCls} flex-1 min-w-[100px]`} placeholder="업체명" value={c.name}
                    onChange={e => { const a = [...bp.competitors]; a[i] = { ...a[i], name: e.target.value }; up("competitors", a); }} />
                  <input className={`${inputCls} flex-1 min-w-[100px]`} placeholder="강점" value={c.strength}
                    onChange={e => { const a = [...bp.competitors]; a[i] = { ...a[i], strength: e.target.value }; up("competitors", a); }} />
                  <input className={`${inputCls} flex-1 min-w-[100px]`} placeholder="약점" value={c.weakness}
                    onChange={e => { const a = [...bp.competitors]; a[i] = { ...a[i], weakness: e.target.value }; up("competitors", a); }} />
                  {bp.competitors.length > 1 && (
                    <button onClick={() => up("competitors", bp.competitors.filter((_, j) => j !== i))} className="text-red-400 text-xs font-semibold px-2">삭제</button>
                  )}
                </div>
              ))}
              {bp.competitors.length < 5 && (
                <button onClick={() => up("competitors", [...bp.competitors, { name: "", strength: "", weakness: "" }])}
                  className="text-xs text-blue-600 font-semibold mt-1">+ 경쟁업체 추가</button>
              )}
              <label className={`${labelCls} mt-4`}>시장 기회</label>
              <textarea className={`${inputCls} h-24`} value={bp.opportunity} onChange={e => up("opportunity", e.target.value)} placeholder="시장의 빈틈이나 성장 가능성" />
            </div>
          )}

          {/* 메뉴 전략 */}
          {tab === "메뉴 전략" && (
            <div className={cardCls}>
              <label className={labelCls}>시그니처 메뉴</label>
              {bp.menus.map((m, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center flex-wrap">
                  <input className={`${inputCls} flex-1 min-w-[100px]`} placeholder="메뉴명" value={m.name}
                    onChange={e => { const a = [...bp.menus]; a[i] = { ...a[i], name: e.target.value }; up("menus", a); }} />
                  <input className={`${inputCls} w-28`} placeholder="가격(원)" inputMode="numeric" value={m.price || ""}
                    onChange={e => { const a = [...bp.menus]; a[i] = { ...a[i], price: Number(e.target.value.replace(/[^0-9]/g, "")) }; up("menus", a); }} />
                  <div className="flex items-center gap-1">
                    <input className={`${inputCls} w-16 text-center`} inputMode="numeric" value={m.costRate}
                      onChange={e => { const a = [...bp.menus]; a[i] = { ...a[i], costRate: Number(e.target.value.replace(/[^0-9]/g, "")) }; up("menus", a); }} />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                  {bp.menus.length > 1 && (
                    <button onClick={() => up("menus", bp.menus.filter((_, j) => j !== i))} className="text-red-400 text-xs font-semibold px-2">삭제</button>
                  )}
                </div>
              ))}
              {bp.menus.length < 10 && (
                <button onClick={() => up("menus", [...bp.menus, { name: "", price: 0, costRate: 30 }])}
                  className="text-xs text-blue-600 font-semibold mt-1">+ 메뉴 추가</button>
              )}
              <label className={`${labelCls} mt-4`}>가격 전략</label>
              <textarea className={`${inputCls} h-24`} value={bp.pricingStrategy} onChange={e => up("pricingStrategy", e.target.value)}
                placeholder="가격 포지셔닝 전략 (프리미엄/가성비 등)" />
            </div>
          )}

          {/* 재무 계획 */}
          {tab === "재무 계획" && (
            <>
              <div className={cardCls}>
                <div className="grid grid-cols-2 gap-4">
                  {([["initInvest", "초기 투자금 (만원)"], ["monthlyFixed", "월 고정비 (만원)"], ["variableRate", "변동비율 (%)"], ["targetRevenue", "목표 월매출 (만원)"]] as const).map(([k, label]) => (
                    <div key={k}>
                      <label className={labelCls}>{label}</label>
                      <input className={inputCls} inputMode="numeric"
                        value={bp[k] || ""} onChange={e => up(k, Number(e.target.value.replace(/[^0-9]/g, "")))} />
                    </div>
                  ))}
                </div>
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">📊 손익분기점(BEP) 분석</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">BEP 월매출</p>
                    <p className="font-extrabold text-blue-600">{fmt(bepRevenue)}만원</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">BEP 일매출</p>
                    <p className="font-extrabold text-emerald-600">{fmt(Math.round(bepRevenue / 30))}만원</p>
                  </div>
                </div>
                {bp.targetRevenue > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>목표매출 vs BEP</span>
                      <span>{bepRevenue > 0 ? Math.round(bp.targetRevenue / bepRevenue * 100) : 0}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${bp.targetRevenue >= bepRevenue ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(100, bepRevenue > 0 ? bp.targetRevenue / bepRevenue * 100 : 0)}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-3">💰 월간 예상 손익</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="py-2 text-left">항목</th><th className="py-2 text-right">금액(만원)</th><th className="py-2 text-right">비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlow.length > 0 && (() => {
                        const cf = cashFlow[0];
                        const rows = [
                          ["매출", cf.rev, 100],
                          ["고정비", cf.fixed, cf.rev ? Math.round(cf.fixed / cf.rev * 100) : 0],
                          ["변동비", cf.variable, cf.rev ? Math.round(cf.variable / cf.rev * 100) : 0],
                          ["순이익", cf.profit, cf.rev ? Math.round(cf.profit / cf.rev * 100) : 0],
                        ];
                        return rows.map(([label, val, pct]) => (
                          <tr key={label as string} className="border-b border-slate-50">
                            <td className="py-2 font-semibold text-slate-700">{label}</td>
                            <td className={`py-2 text-right font-bold ${(val as number) < 0 ? "text-red-500" : "text-slate-900"}`}>{fmt(val as number)}</td>
                            <td className="py-2 text-right text-slate-400">{pct}%</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 마케팅 전략 */}
          {tab === "마케팅 전략" && (
            <div className={cardCls}>
              {([["mktBefore", "🚀 오픈 전 마케팅", "SNS 사전 홍보, 시식 이벤트 등"], ["mktAfter", "📢 오픈 후 마케팅", "오픈 할인, 리뷰 이벤트, 쿠폰 등"], ["mktSns", "📱 SNS 전략", "인스타그램, 네이버 블로그 운영 계획"], ["mktDelivery", "🛵 배달앱 전략", "배민, 쿠팡이츠 입점 및 프로모션"]] as const).map(([k, label, ph]) => (
                <div key={k} className="mb-4">
                  <label className={labelCls}>{label}</label>
                  <textarea className={`${inputCls} h-24`} value={bp[k]} onChange={e => up(k, e.target.value)} placeholder={ph} />
                </div>
              ))}
            </div>
          )}

          {/* 실행 일정 */}
          {tab === "실행 일정" && (
            <div className={cardCls}>
              <label className={labelCls}>단계별 실행 일정</label>
              {bp.timeline.map((tl, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center flex-wrap">
                  <input className={`${inputCls} w-28`} placeholder="기간" value={tl.period}
                    onChange={e => { const a = [...bp.timeline]; a[i] = { ...a[i], period: e.target.value }; up("timeline", a); }} />
                  <input className={`${inputCls} flex-1 min-w-[120px]`} placeholder="할일" value={tl.task}
                    onChange={e => { const a = [...bp.timeline]; a[i] = { ...a[i], task: e.target.value }; up("timeline", a); }} />
                  <select className={`${inputCls} w-24`} value={tl.status}
                    onChange={e => { const a = [...bp.timeline]; a[i] = { ...a[i], status: e.target.value as Timeline["status"] }; up("timeline", a); }}>
                    <option value="대기">대기</option><option value="진행중">진행중</option><option value="완료">완료</option>
                  </select>
                  {bp.timeline.length > 1 && (
                    <button onClick={() => up("timeline", bp.timeline.filter((_, j) => j !== i))} className="text-red-400 text-xs font-semibold px-2">삭제</button>
                  )}
                </div>
              ))}
              <button onClick={() => up("timeline", [...bp.timeline, { period: "", task: "", status: "대기" }])}
                className="text-xs text-blue-600 font-semibold mt-1">+ 일정 추가</button>
            </div>
          )}

          {/* 하단 버튼 */}
          <div className="flex gap-3 mt-4 mb-6">
            <button onClick={() => setPreview(true)}
              className="flex-1 rounded-xl bg-slate-900 text-white font-semibold px-5 py-3 text-sm hover:bg-slate-800 transition">
              📄 사업계획서 미리보기
            </button>
            <button onClick={() => { navigator.clipboard.writeText(buildText()); alert("클립보드에 복사되었습니다!"); }}
              className="rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 font-semibold px-5 py-3 text-sm hover:bg-slate-50 transition">
              📋 복사하기
            </button>
          </div>

          {/* 미리보기 모달 */}
          {preview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreview(false)}>
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-extrabold text-lg text-slate-900">📄 사업계획서 미리보기</h2>
                  <button onClick={() => setPreview(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">{buildText()}</pre>
                <button onClick={() => { navigator.clipboard.writeText(buildText()); alert("복사 완료!"); }}
                  className="mt-4 w-full rounded-xl bg-slate-900 text-white font-semibold py-3 text-sm hover:bg-slate-800 transition">
                  📋 전체 복사하기
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
