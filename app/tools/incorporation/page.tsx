"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";

const TABS = ["개인 vs 법인", "설립 절차", "필요 서류", "비용 시뮬레이터"] as const;
type Tab = (typeof TABS)[number];

import { compareTax } from "@/lib/tax";

const KEY = "vela-incorporation";
const fmt = (n: number) => n.toLocaleString("ko-KR");

const STEPS = [
  { id: "name", label: "상호 결정 및 중복 확인", desc: "인터넷등기소(iros.go.kr)에서 상호 검색. 동일 관할 구역 내 동일 상호 불가.", cost: "무료" },
  { id: "articles", label: "정관 작성", desc: "목적사업(외식업, 식품제조업 등), 자본금, 주식 수, 대표이사, 이사회 구성 등을 기재. 공증 불요(자본금 10억 미만).", cost: "무료 (10억 이상 시 공증비 ~11만원)" },
  { id: "capital", label: "자본금 납입", desc: "발기인 명의 은행 계좌에 자본금 입금 → 잔고증명서 발급. 최소 자본금 제한 없음 (100만원 이상 권장).", cost: "무료" },
  { id: "seal", label: "법인인감 등록", desc: "법인인감도장 제작 후 등기소에 인감 신고.", cost: "도장 ~2만원" },
  { id: "register", label: "설립등기 신청", desc: "관할 등기소 방문 또는 인터넷등기소 온라인 신청. 처리 기간 2~3일.", cost: "등록면허세 + 교육세 + 수수료" },
  { id: "bizreg", label: "사업자등록증 발급", desc: "관할 세무서 방문 or 홈택스 온라인 신청. 법인등기부등본, 정관 사본, 임대차계약서 필요.", cost: "무료" },
  { id: "account", label: "법인 통장 개설", desc: "법인등기부등본, 사업자등록증 사본 지참. 주거래 은행 추천.", cost: "무료" },
  { id: "insurance", label: "4대보험 성립신고", desc: "직원 채용 시 14일 이내 국민연금/건강보험/고용보험/산재보험 성립신고.", cost: "무료" },
  { id: "card", label: "법인카드 발급", desc: "법인 통장 개설 후 신청. 초기에는 보증금 선납 카드 활용.", cost: "무료" },
];

const DOCUMENTS = [
  { label: "정관 2부", required: true },
  { label: "발기인 회의 의사록", required: true },
  { label: "주식발행사항 동의서", required: true },
  { label: "주금납입증명서 (잔고증명서)", required: true },
  { label: "대표이사 취임승낙서", required: true },
  { label: "인감증명서 (대표이사 개인)", required: true },
  { label: "주민등록등본 (대표이사)", required: true },
  { label: "법인인감도장", required: true },
  { label: "등록면허세 영수증", required: true },
  { label: "위임장 (대리인 신청 시)", required: false },
];

export default function IncorporationPage() {
  const [tab, setTab] = useState<Tab>("개인 vs 법인");
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const [annualProfit, setAnnualProfit] = useState(0);
  const [ceoSalary, setCeoSalary] = useState(3600);
  const { data: incData, update: setIncData, status, userId, error, retry } = useCloudSync<{ checks: Record<string, boolean>; docChecks: Record<string, boolean> }>(KEY, { checks: {}, docChecks: {} });
  const checks = incData.checks;
  const docChecks = incData.docChecks;
  const setChecks = (fn: (p: Record<string, boolean>) => Record<string, boolean>) => setIncData({ ...incData, checks: typeof fn === "function" ? fn(incData.checks) : fn });
  const setDocChecks = (fn: (p: Record<string, boolean>) => Record<string, boolean>) => setIncData({ ...incData, docChecks: typeof fn === "function" ? fn(incData.docChecks) : fn });
  const [capitalAmount, setCapitalAmount] = useState(1000);

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white outline-none transition";
  const cardCls = "bg-white ring-1 ring-slate-200 rounded-3xl p-6 mb-4";
  const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

  /* 개인 vs 법인 비교 계산 */
  const comparison = useMemo(() => compareTax(annualProfit, ceoSalary), [annualProfit, ceoSalary]);

  /* 비용 시뮬레이터 */
  const costSim = useMemo(() => {
    const capitalWon = capitalAmount * 10000;
    const registrationTax = Math.max(112500, Math.round(capitalWon * 0.0048));
    const educationTax = Math.round(registrationTax * 0.2);
    const courtFee = 30000;
    const stampDuty = capitalAmount <= 100000 ? 35000 : 70000;
    const sealCost = 20000;
    const total = registrationTax + educationTax + courtFee + stampDuty + sealCost;
    return { registrationTax, educationTax, courtFee, stampDuty, sealCost, total };
  }, [capitalAmount]);

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl">
          <Link href="/tools" className="text-xs text-slate-400 hover:text-slate-600 transition">← 도구 목록</Link>
          <div className="mt-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <span>🏢</span> 법인 설립 가이드
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">법인 설립 가이드</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm">개인 vs 법인 비교부터 설립 절차, 비용까지 한 번에 확인하세요.</p>
              <CloudSyncBadge status={status} userId={userId} onRetry={retry} />
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-100 text-sm">
                <span className="text-red-500">⚠️</span>
                <div className="flex-1"><p className="font-semibold text-red-700">클라우드 동기화 실패</p><p className="text-red-500 text-xs">데이터는 로컬에 저장되었습니다</p></div>
                <button onClick={retry} className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition">재시도</button>
              </div>
            )}
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* 개인 vs 법인 */}
          {tab === "개인 vs 법인" && (
            <>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-4">💡 내 상황 입력</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>예상 연 매출 (만원)</label>
                    <input className={inputCls} inputMode="numeric" value={annualRevenue || ""}
                      onChange={e => setAnnualRevenue(Number(e.target.value.replace(/[^0-9]/g, "")))} placeholder="30000" />
                  </div>
                  <div>
                    <label className={labelCls}>예상 연 순이익 (만원)</label>
                    <input className={inputCls} inputMode="numeric" value={annualProfit || ""}
                      onChange={e => setAnnualProfit(Number(e.target.value.replace(/[^0-9]/g, "")))} placeholder="6000" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>법인 시 대표자 연봉 설정 (만원)</label>
                    <input className={inputCls} inputMode="numeric" value={ceoSalary || ""}
                      onChange={e => setCeoSalary(Number(e.target.value.replace(/[^0-9]/g, "")))} placeholder="3600" />
                    <p className="text-[11px] text-slate-400 mt-1">법인 이익에서 대표자 급여를 빼고 법인세를 계산합니다.</p>
                  </div>
                </div>
              </div>

              {annualProfit > 0 && (
                <div className={cardCls}>
                  <h3 className="font-bold text-slate-900 text-sm mb-4">📊 세금 비교 결과</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 text-left text-slate-500">항목</th>
                          <th className="py-2 text-right text-blue-600">개인사업자</th>
                          <th className="py-2 text-right text-violet-600">법인사업자</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        <tr className="border-b border-slate-50">
                          <td className="py-2">소득세 / 법인세</td>
                          <td className="py-2 text-right font-semibold">{fmt(comparison.personal.incomeTax)}만원</td>
                          <td className="py-2 text-right font-semibold">{fmt(comparison.corp.corpTax)}만원</td>
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="py-2">지방소득세</td>
                          <td className="py-2 text-right">{fmt(comparison.personal.localTax)}만원</td>
                          <td className="py-2 text-right">{fmt(comparison.corp.corpLocalTax)}만원</td>
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="py-2">대표자 근로소득세</td>
                          <td className="py-2 text-right text-slate-400">-</td>
                          <td className="py-2 text-right">{fmt(comparison.corp.ceoIncomeTax)}만원</td>
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="py-2">건강보험/4대보험</td>
                          <td className="py-2 text-right">{fmt(comparison.personal.healthIns)}만원</td>
                          <td className="py-2 text-right">{fmt(comparison.corp.ceo4Insurance)}만원</td>
                        </tr>
                        <tr className="border-t-2 border-slate-200 font-bold">
                          <td className="py-2">합계</td>
                          <td className="py-2 text-right text-blue-600">{fmt(comparison.personal.total)}만원</td>
                          <td className="py-2 text-right text-violet-600">{fmt(comparison.corp.total)}만원</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className={`mt-4 rounded-xl p-4 text-center ${comparison.saving > 0 ? "bg-emerald-50" : "bg-amber-50"}`}>
                    <p className="text-xs text-slate-500 mb-1">법인 전환 시 절세 효과</p>
                    <p className={`text-xl font-extrabold ${comparison.saving > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {comparison.saving > 0 ? "+" : ""}{fmt(comparison.saving)}만원/년
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {comparison.saving > 200 ? "✅ 법인 설립을 적극 검토하세요!" : comparison.saving > 0 ? "🤔 절세 효과가 크지 않습니다. 관리 비용을 고려하세요." : "⚠️ 현재 수익 수준에서는 개인사업자가 유리합니다."}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 설립 절차 */}
          {tab === "설립 절차" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-sm">📋 설립 절차 체크리스트</h3>
                <span className="text-xs text-slate-400">{Object.values(checks).filter(Boolean).length}/{STEPS.length} 완료</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${Object.values(checks).filter(Boolean).length / STEPS.length * 100}%` }} />
              </div>
              <div className="space-y-3">
                {STEPS.map((step, i) => (
                  <label key={step.id} className={`flex gap-3 p-3 rounded-xl cursor-pointer transition ${checks[step.id] ? "bg-violet-50" : "bg-slate-50 hover:bg-slate-100"}`}>
                    <input type="checkbox" checked={!!checks[step.id]}
                      onChange={e => setChecks(p => ({ ...p, [step.id]: e.target.checked }))}
                      className="mt-0.5 accent-violet-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-500">STEP {i + 1}</span>
                        <span className={`text-sm font-bold ${checks[step.id] ? "text-slate-400 line-through" : "text-slate-900"}`}>{step.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">💰 {step.cost}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 필요 서류 */}
          {tab === "필요 서류" && (
            <div className={cardCls}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-sm">📁 필요 서류 체크리스트</h3>
                <span className="text-xs text-slate-400">{Object.values(docChecks).filter(Boolean).length}/{DOCUMENTS.length}</span>
              </div>
              <div className="space-y-2">
                {DOCUMENTS.map(doc => (
                  <label key={doc.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition ${docChecks[doc.label] ? "bg-violet-50" : "bg-slate-50 hover:bg-slate-100"}`}>
                    <input type="checkbox" checked={!!docChecks[doc.label]}
                      onChange={e => setDocChecks(p => ({ ...p, [doc.label]: e.target.checked }))}
                      className="accent-violet-600" />
                    <span className={`text-sm ${docChecks[doc.label] ? "text-slate-400 line-through" : "text-slate-700"}`}>{doc.label}</span>
                    {doc.required && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">필수</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 비용 시뮬레이터 */}
          {tab === "비용 시뮬레이터" && (
            <>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-4">💰 자본금 입력</h3>
                <label className={labelCls}>자본금 (만원)</label>
                <input className={inputCls} inputMode="numeric" value={capitalAmount || ""}
                  onChange={e => setCapitalAmount(Number(e.target.value.replace(/[^0-9]/g, "")))} placeholder="1000" />
                <p className="text-[11px] text-slate-400 mt-1">최소 자본금 제한 없으나 100만~1,000만원이 일반적입니다.</p>
              </div>
              <div className={cardCls}>
                <h3 className="font-bold text-slate-900 text-sm mb-4">🧾 예상 설립 비용</h3>
                <div className="space-y-2">
                  {[
                    ["등록면허세", costSim.registrationTax, "자본금의 0.48% (최소 112,500원)"],
                    ["지방교육세", costSim.educationTax, "등록면허세의 20%"],
                    ["법원 수수료", costSim.courtFee, "등기 신청 수수료"],
                    ["인지세", costSim.stampDuty, "자본금 10억 이하: 35,000원"],
                    ["법인인감 제작", costSim.sealCost, "도장 제작비"],
                  ].map(([label, amount, note]) => (
                    <div key={label as string} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <div>
                        <p className="text-sm text-slate-700">{label}</p>
                        <p className="text-[11px] text-slate-400">{note}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{fmt(amount as number)}원</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200">
                    <p className="font-bold text-slate-900">합계</p>
                    <p className="text-lg font-extrabold text-violet-600">{fmt(costSim.total)}원</p>
                  </div>
                </div>
              </div>

              {/* 전문가 연결 */}
              <div className={`${cardCls} bg-gradient-to-br from-violet-50 to-white`}>
                <h3 className="font-bold text-slate-900 text-sm mb-2">🤝 전문가에게 맡기기</h3>
                <p className="text-xs text-slate-500 mb-3">법무사/세무사에게 설립 대행을 맡기면 30~50만원 수준입니다. 시간과 실수를 줄일 수 있습니다.</p>
                <Link href="/tools/tax-advisor" className="inline-block text-xs font-semibold text-violet-600 hover:text-violet-800 transition">
                  세무사 연결 바로가기 →
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
