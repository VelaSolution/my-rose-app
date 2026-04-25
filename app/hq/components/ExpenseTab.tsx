"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { HQRole, Expense, FixedCost } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type SubTab = "overview" | "fixed" | "expense";

// ── 상수 ─────────────────────────────────────────────────
const EXP_CATS = ["식비", "교통비", "사무용품", "마케팅", "소프트웨어", "통신비", "복리후생", "기타"] as const;
const FIX_CATS = ["급여", "임대료", "도메인", "서버/클라우드", "구독서비스", "보험", "세금/공과금", "통신비", "기타"] as const;
const PAYMENTS = ["법인카드", "개인카드", "사업자카드", "현금", "계좌이체"] as const;
const CURRENCIES = ["KRW", "USD"] as const;
const CURRENCY_SYMBOL: Record<string, string> = { "KRW": "원", "USD": "$" };
const CYCLES = ["월", "분기", "반기", "연"] as const;
const CYCLE_MULT: Record<string, number> = { "월": 1, "분기": 3, "반기": 6, "연": 12 };

const CAT_COLORS: Record<string, string> = {
  "식비": "bg-orange-50 text-orange-700", "교통비": "bg-blue-50 text-blue-700",
  "사무용품": "bg-slate-100 text-slate-700", "마케팅": "bg-purple-50 text-purple-700",
  "소프트웨어": "bg-cyan-50 text-cyan-700", "통신비": "bg-teal-50 text-teal-700",
  "복리후생": "bg-emerald-50 text-emerald-700", "기타": "bg-slate-50 text-slate-600",
  "급여": "bg-indigo-50 text-indigo-700", "임대료": "bg-rose-50 text-rose-700",
  "도메인": "bg-sky-50 text-sky-700", "서버/클라우드": "bg-violet-50 text-violet-700",
  "구독서비스": "bg-fuchsia-50 text-fuchsia-700", "보험": "bg-amber-50 text-amber-700",
  "세금/공과금": "bg-red-50 text-red-700",
};
const STATUS_COLORS: Record<string, string> = {
  "대기": "bg-amber-50 text-amber-700", "승인": "bg-emerald-50 text-emerald-700", "반려": "bg-red-50 text-red-700",
};

const EXP_EMPTY = { date: today(), category: "식비" as string, amount: "", currency: "KRW" as string, description: "", payment: "법인카드" as string, memo: "" };
const FIX_EMPTY = { name: "", category: "급여" as string, amount: "", billing_cycle: "월" as string, due_day: "1", description: "" };

export default function ExpenseTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [sub, setSub] = useState<SubTab>("overview");

  // ── 데이터 ─────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [loading, setLoading] = useState(true);

  // ── 경비 폼 ────────────────────────────────────────────
  const [expForm, setExpForm] = useState(EXP_EMPTY);
  const [expEditId, setExpEditId] = useState<string | null>(null);
  const [showExpForm, setShowExpForm] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  const [expSearch, setExpSearch] = useState("");
  const [expMonth, setExpMonth] = useState(today().slice(0, 7));
  const [expCatFilter, setExpCatFilter] = useState("전체");
  const [expStatusFilter, setExpStatusFilter] = useState("전체");

  // ── 고정비 폼 ──────────────────────────────────────────
  const [fixForm, setFixForm] = useState(FIX_EMPTY);
  const [fixEditId, setFixEditId] = useState<string | null>(null);
  const [showFixForm, setShowFixForm] = useState(false);
  const [fixSaving, setFixSaving] = useState(false);

  // ── 선택 (엑셀 내보내기용) ──────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const canApprove = myRole === "대표" || myRole === "이사";
  const canManageFixed = myRole === "대표" || myRole === "이사";

  // ── 로드 ───────────────────────────────────────────────
  async function load() {
    const s = sb();
    if (!s) { setLoading(false); return; }
    const [r1, r2] = await Promise.all([
      s.from("hq_expenses").select("*").order("date", { ascending: false }),
      s.from("hq_fixed_costs").select("*").order("category").order("name"),
    ]);
    if (r1.data) setExpenses(r1.data as Expense[]);
    if (r2.data) setFixedCosts(r2.data as FixedCost[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // ── 계산 ───────────────────────────────────────────────
  const monthlyFixed = useMemo(() => {
    return fixedCosts.filter(f => f.active).reduce((sum, f) => {
      const monthly = Number(f.amount) / (CYCLE_MULT[f.billing_cycle] ?? 1);
      return sum + monthly;
    }, 0);
  }, [fixedCosts]);

  const fixedByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of fixedCosts.filter(f => f.active)) {
      const monthly = Number(f.amount) / (CYCLE_MULT[f.billing_cycle] ?? 1);
      map[f.category] = (map[f.category] ?? 0) + monthly;
    }
    return map;
  }, [fixedCosts]);

  const filteredExpenses = useMemo(() => {
    let list = [...expenses];
    if (expMonth) list = list.filter(e => e.date.startsWith(expMonth));
    if (expCatFilter !== "전체") list = list.filter(e => e.category === expCatFilter);
    if (expStatusFilter !== "전체") list = list.filter(e => e.status === expStatusFilter);
    if (expSearch.trim()) {
      const q = expSearch.toLowerCase();
      list = list.filter(e => e.description.toLowerCase().includes(q) || e.author.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.memo.toLowerCase().includes(q));
    }
    return list;
  }, [expenses, expMonth, expCatFilter, expStatusFilter, expSearch]);

  const toggleSelectAll = useCallback(() => {
    setSelected(prev => prev.size === filteredExpenses.length ? new Set() : new Set(filteredExpenses.map(e => e.id)));
  }, [filteredExpenses]);

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const target = selected.size > 0
      ? filteredExpenses.filter(e => selected.has(e.id))
      : filteredExpenses;
    if (target.length === 0) { flash("내보낼 데이터가 없습니다"); return; }
    const rows = target.map(e => ({
      "날짜": e.date,
      "카테고리": e.category,
      "금액": Number(e.amount),
      "통화": (e as any).currency || "KRW",
      "설명": e.description,
      "결제수단": e.payment,
      "등록자": e.author,
      "상태": e.status,
      "승인자": e.approver ?? "",
      "비고": e.memo,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 30 },
      { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "지출내역");
    XLSX.writeFile(wb, `경비지출_${expMonth || today().slice(0, 7)}.xlsx`);
    flash(`${target.length}건 엑셀 다운로드 완료`);
  }

  const expSummary = useMemo(() => {
    const total = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const approved = filteredExpenses.filter(e => e.status === "승인").reduce((s, e) => s + Number(e.amount), 0);
    const pending = filteredExpenses.filter(e => e.status === "대기").reduce((s, e) => s + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const e of filteredExpenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
    return { total, approved, pending, byCategory };
  }, [filteredExpenses]);

  // ── 경비 CRUD ──────────────────────────────────────────
  async function saveExpense() {
    const amt = Number(expForm.amount);
    if (!expForm.date || !expForm.category || !amt || amt <= 0) { flash("날짜, 카테고리, 금액을 확인하세요"); return; }
    setExpSaving(true);
    const s = sb();
    if (!s) { setExpSaving(false); return; }
    const row = { author: userName, date: expForm.date, category: expForm.category, amount: amt, currency: expForm.currency, description: expForm.description.trim(), payment: expForm.payment, memo: expForm.memo.trim(), status: "대기" };
    if (expEditId) {
      const { error } = await s.from("hq_expenses").update(row).eq("id", expEditId);
      if (error) { flash("수정 실패"); setExpSaving(false); return; }
      flash("수정 완료");
    } else {
      const { error } = await s.from("hq_expenses").insert(row);
      if (error) { flash("등록 실패"); setExpSaving(false); return; }
      flash("경비 등록 완료");
    }
    setExpForm(EXP_EMPTY); setExpEditId(null); setShowExpForm(false); setExpSaving(false); load();
  }

  function startEditExp(e: Expense) {
    setExpForm({ date: e.date, category: e.category, amount: String(e.amount), currency: (e as any).currency || "KRW", description: e.description, payment: e.payment, memo: e.memo });
    setExpEditId(e.id); setShowExpForm(true);
  }

  async function deleteExpense(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    await s.from("hq_expenses").delete().eq("id", id);
    flash("삭제 완료"); load();
  }

  async function approveExpense(id: string, status: "승인" | "반려") {
    const s = sb(); if (!s) return;
    await s.from("hq_expenses").update({ status, approver: userName }).eq("id", id);
    flash(`${status} 처리 완료`); load();
  }

  // ── 고정비 CRUD ────────────────────────────────────────
  async function saveFixed() {
    const amt = Number(fixForm.amount);
    if (!fixForm.name.trim() || !amt || amt <= 0) { flash("항목명과 금액을 확인하세요"); return; }
    setFixSaving(true);
    const s = sb();
    if (!s) { setFixSaving(false); return; }
    const row = { name: fixForm.name.trim(), category: fixForm.category, amount: amt, billing_cycle: fixForm.billing_cycle, due_day: Number(fixForm.due_day) || 1, description: fixForm.description.trim(), active: true };
    if (fixEditId) {
      const { error } = await s.from("hq_fixed_costs").update(row).eq("id", fixEditId);
      if (error) { flash("수정 실패"); setFixSaving(false); return; }
      flash("수정 완료");
    } else {
      const { error } = await s.from("hq_fixed_costs").insert(row);
      if (error) { flash("등록 실패"); setFixSaving(false); return; }
      flash("고정비 등록 완료");
    }
    setFixForm(FIX_EMPTY); setFixEditId(null); setShowFixForm(false); setFixSaving(false); load();
  }

  function startEditFix(f: FixedCost) {
    setFixForm({ name: f.name, category: f.category, amount: String(f.amount), billing_cycle: f.billing_cycle, due_day: String(f.due_day), description: f.description });
    setFixEditId(f.id); setShowFixForm(true);
  }

  async function toggleFixedActive(f: FixedCost) {
    const s = sb(); if (!s) return;
    await s.from("hq_fixed_costs").update({ active: !f.active }).eq("id", f.id);
    flash(f.active ? "비활성화됨" : "활성화됨"); load();
  }

  async function deleteFixed(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    await s.from("hq_fixed_costs").delete().eq("id", id);
    flash("삭제 완료"); load();
  }

  // ── 렌더링 ─────────────────────────────────────────────
  if (loading) return <div className="text-center py-12 text-slate-400">불러오는 중...</div>;

  const SUB_TABS: { key: SubTab; label: string; icon: string }[] = [
    { key: "overview", label: "현황", icon: "📊" },
    { key: "fixed", label: "고정비", icon: "📌" },
    { key: "expense", label: "지출 내역", icon: "💳" },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 + 서브탭 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-900">재무 관리</h2>
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {SUB_TABS.map(t => (
            <button key={t.key} onClick={() => setSub(t.key)}
              className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${sub === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          현황 탭
         ════════════════════════════════════════════════════ */}
      {sub === "overview" && (
        <>
          {/* 월간 총 요약 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={C}>
              <p className="text-xs font-semibold text-slate-500 mb-1">월 고정비</p>
              <p className="text-xl font-bold text-slate-900">{fmt(Math.round(monthlyFixed))}<span className="text-sm font-medium text-slate-400">원</span></p>
            </div>
            <div className={C}>
              <p className="text-xs font-semibold text-slate-500 mb-1">이번달 지출</p>
              <p className="text-xl font-bold text-slate-900">{fmt(expenses.filter(e => e.date.startsWith(today().slice(0, 7))).reduce((s, e) => s + Number(e.amount), 0))}<span className="text-sm font-medium text-slate-400">원</span></p>
            </div>
            <div className={C}>
              <p className="text-xs font-semibold text-slate-500 mb-1">월 총 비용</p>
              <p className="text-xl font-bold text-[#3182F6]">{fmt(Math.round(monthlyFixed) + expenses.filter(e => e.date.startsWith(today().slice(0, 7))).reduce((s, e) => s + Number(e.amount), 0))}<span className="text-sm font-medium text-slate-400">원</span></p>
            </div>
            <div className={C}>
              <p className="text-xs font-semibold text-slate-500 mb-1">연간 고정비 예상</p>
              <p className="text-xl font-bold text-slate-900">{fmt(Math.round(monthlyFixed * 12))}<span className="text-sm font-medium text-slate-400">원</span></p>
            </div>
          </div>

          {/* 고정비 카테고리별 */}
          {Object.keys(fixedByCategory).length > 0 && (
            <div className={C}>
              <h3 className="text-sm font-bold text-slate-700 mb-4">고정비 구성 (월 환산)</h3>
              <div className="space-y-2.5">
                {Object.entries(fixedByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                  const pct = monthlyFixed > 0 ? (amt / monthlyFixed) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`${BADGE} ${CAT_COLORS[cat] ?? "bg-slate-100 text-slate-600"}`}>{cat}</span>
                        <span className="text-sm font-bold text-slate-700">{fmt(Math.round(amt))}원 <span className="text-xs font-normal text-slate-400">({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#3182F6] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 고정비 항목 목록 */}
          {fixedCosts.filter(f => f.active).length > 0 && (
            <div className={C}>
              <h3 className="text-sm font-bold text-slate-700 mb-3">고정비 상세 항목</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">항목</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">카테고리</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">금액</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500">주기</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">월 환산</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixedCosts.filter(f => f.active).map(f => (
                      <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 px-2 font-medium text-slate-800">{f.name}</td>
                        <td className="py-2.5 px-2"><span className={`${BADGE} ${CAT_COLORS[f.category] ?? "bg-slate-100 text-slate-600"}`}>{f.category}</span></td>
                        <td className="py-2.5 px-2 text-right font-semibold text-slate-700">{fmt(Number(f.amount))}원</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">{f.billing_cycle}</td>
                        <td className="py-2.5 px-2 text-right font-semibold text-[#3182F6]">{fmt(Math.round(Number(f.amount) / (CYCLE_MULT[f.billing_cycle] ?? 1)))}원</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200">
                      <td colSpan={4} className="py-2.5 px-2 font-bold text-slate-700">합계</td>
                      <td className="py-2.5 px-2 text-right font-bold text-[#3182F6] text-base">{fmt(Math.round(monthlyFixed))}원/월</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 이번달 지출 카테고리별 */}
          {(() => {
            const thisMonth = expenses.filter(e => e.date.startsWith(today().slice(0, 7)));
            const byCat: Record<string, number> = {};
            for (const e of thisMonth) byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount);
            if (Object.keys(byCat).length === 0) return null;
            return (
              <div className={C}>
                <h3 className="text-sm font-bold text-slate-700 mb-3">이번달 변동 지출</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className={`${BADGE} ${CAT_COLORS[cat] ?? "bg-slate-100 text-slate-600"} gap-1.5`}>
                      <span>{cat}</span>
                      <span className="font-bold">{fmt(amt)}원</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {fixedCosts.length === 0 && expenses.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">💰</div>
              <p className="text-slate-400 mb-2">아직 등록된 재무 데이터가 없습니다</p>
              <p className="text-sm text-slate-400">고정비와 지출 내역을 등록하면 여기서 한눈에 확인할 수 있습니다</p>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          고정비 탭
         ════════════════════════════════════════════════════ */}
      {sub === "fixed" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">매월 반복되는 비용을 관리합니다 (급여, 임대료, 구독 등)</p>
            {canManageFixed && (
              <button className={B} onClick={() => { setFixForm(FIX_EMPTY); setFixEditId(null); setShowFixForm(!showFixForm); }}>
                {showFixForm ? "닫기" : "+ 고정비 등록"}
              </button>
            )}
          </div>

          {/* 고정비 등록 폼 */}
          {showFixForm && (
            <div className={C}>
              <h3 className="text-lg font-bold text-slate-800 mb-4">{fixEditId ? "고정비 수정" : "고정비 등록"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={L}>항목명</label>
                  <input className={I} placeholder="ex) 김민혁 급여, Vercel Pro, .com 도메인" value={fixForm.name} onChange={e => setFixForm({ ...fixForm, name: e.target.value })} />
                </div>
                <div>
                  <label className={L}>카테고리</label>
                  <select className={I} value={fixForm.category} onChange={e => setFixForm({ ...fixForm, category: e.target.value })}>
                    {FIX_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={L}>금액 (원)</label>
                  <input type="number" className={I} placeholder="0" value={fixForm.amount} onChange={e => setFixForm({ ...fixForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className={L}>결제 주기</label>
                  <select className={I} value={fixForm.billing_cycle} onChange={e => setFixForm({ ...fixForm, billing_cycle: e.target.value })}>
                    {CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={L}>납부일 (매월)</label>
                  <input type="number" className={I} min={1} max={31} placeholder="1" value={fixForm.due_day} onChange={e => setFixForm({ ...fixForm, due_day: e.target.value })} />
                </div>
                <div>
                  <label className={L}>메모</label>
                  <input className={I} placeholder="추가 설명 (선택)" value={fixForm.description} onChange={e => setFixForm({ ...fixForm, description: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className={B2} onClick={() => { setShowFixForm(false); setFixEditId(null); setFixForm(FIX_EMPTY); }}>취소</button>
                <button className={B} onClick={saveFixed} disabled={fixSaving}>{fixSaving ? "저장 중..." : fixEditId ? "수정" : "등록"}</button>
              </div>
            </div>
          )}

          {/* 월 환산 요약 */}
          <div className={C}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-slate-700">월 고정비 합계</span>
              <span className="text-xl font-bold text-[#3182F6]">{fmt(Math.round(monthlyFixed))}원</span>
            </div>
            <p className="text-xs text-slate-400">연간 약 {fmt(Math.round(monthlyFixed * 12))}원</p>
          </div>

          {/* 고정비 목록 - 카테고리별 그룹 */}
          {fixedCosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📌</div>
              <p className="text-slate-400">등록된 고정비가 없습니다</p>
            </div>
          ) : (
            (() => {
              const grouped: Record<string, FixedCost[]> = {};
              for (const f of fixedCosts) {
                if (!grouped[f.category]) grouped[f.category] = [];
                grouped[f.category].push(f);
              }
              return (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} className={C}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`${BADGE} ${CAT_COLORS[cat] ?? "bg-slate-100 text-slate-600"}`}>{cat}</span>
                        <span className="text-sm font-semibold text-slate-500">
                          월 {fmt(Math.round(items.filter(f => f.active).reduce((s, f) => s + Number(f.amount) / (CYCLE_MULT[f.billing_cycle] ?? 1), 0)))}원
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map(f => (
                          <div key={f.id} className={`flex items-center justify-between py-2.5 px-3 rounded-2xl group transition-all ${f.active ? "bg-slate-50/50 hover:bg-slate-50" : "bg-slate-50/30 opacity-50"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${f.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{f.name}</span>
                                {!f.active && <span className={`${BADGE} bg-slate-100 text-slate-400`}>비활성</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                <span>{fmt(Number(f.amount))}원/{f.billing_cycle}</span>
                                <span>·</span>
                                <span>매월 {f.due_day}일</span>
                                {f.description && <><span>·</span><span>{f.description}</span></>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-bold text-slate-700">{fmt(Math.round(Number(f.amount) / (CYCLE_MULT[f.billing_cycle] ?? 1)))}원<span className="text-xs font-normal text-slate-400">/월</span></span>
                              {canManageFixed && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => toggleFixedActive(f)} className="p-1.5 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-slate-600" title={f.active ? "비활성화" : "활성화"}>
                                    {f.active ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    )}
                                  </button>
                                  <button onClick={() => startEditFix(f)} className="p-1.5 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-blue-500" title="수정">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => deleteFixed(f.id)} className="p-1.5 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-red-500" title="삭제">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          지출 내역 탭
         ════════════════════════════════════════════════════ */}
      {sub === "expense" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">개별 경비 지출을 등록하고 승인 관리합니다</p>
            <div className="flex gap-2">
              <button className={B2} onClick={exportExcel}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  엑셀{selected.size > 0 ? ` (${selected.size}건)` : ""}
                </span>
              </button>
              <button className={B} onClick={() => { setExpForm(EXP_EMPTY); setExpEditId(null); setShowExpForm(!showExpForm); }}>
                {showExpForm ? "닫기" : "+ 경비 등록"}
              </button>
            </div>
          </div>

          {/* 경비 등록 폼 */}
          {showExpForm && (
            <div className={C}>
              <h3 className="text-lg font-bold text-slate-800 mb-4">{expEditId ? "경비 수정" : "경비 등록"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={L}>날짜</label>
                  <input type="date" className={I} value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} />
                </div>
                <div>
                  <label className={L}>카테고리</label>
                  <select className={I} value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                    {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={L}>금액</label>
                  <div className="flex gap-2">
                    <input type="number" className={`${I} flex-1`} placeholder="0" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} />
                    <select className={`${I} !w-20 flex-shrink-0`} value={expForm.currency} onChange={e => setExpForm({ ...expForm, currency: e.target.value })}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={L}>결제수단</label>
                  <select className={I} value={expForm.payment} onChange={e => setExpForm({ ...expForm, payment: e.target.value })}>
                    {PAYMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={L}>설명</label>
                  <input className={I} placeholder="지출 내용을 간단히 입력하세요" value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} />
                </div>
                <div className="md:col-span-3 lg:col-span-3">
                  <label className={L}>비고</label>
                  <input className={I} placeholder="추가 메모 (선택)" value={expForm.memo} onChange={e => setExpForm({ ...expForm, memo: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className={B2} onClick={() => { setShowExpForm(false); setExpEditId(null); setExpForm(EXP_EMPTY); }}>취소</button>
                <button className={B} onClick={saveExpense} disabled={expSaving}>{expSaving ? "저장 중..." : expEditId ? "수정" : "등록"}</button>
              </div>
            </div>
          )}

          {/* 요약 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={C}>
              <p className="text-xs font-semibold text-slate-500 mb-1">총 지출</p>
              <p className="text-xl font-bold text-slate-900">{fmt(expSummary.total)}<span className="text-sm font-medium text-slate-400">원</span></p>
            </div>
            <div className={C}>
              <p className="text-xs font-semibold text-slate-500 mb-1">승인 완료</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(expSummary.approved)}<span className="text-sm font-medium text-slate-400">원</span></p>
            </div>
            <div className={C}>
              <p className="text-xs font-semibold text-slate-500 mb-1">승인 대기</p>
              <p className="text-xl font-bold text-amber-600">{fmt(expSummary.pending)}<span className="text-sm font-medium text-slate-400">원</span></p>
            </div>
            <div className={C}>
              <p className="text-xs font-semibold text-slate-500 mb-1">건수</p>
              <p className="text-xl font-bold text-slate-900">{filteredExpenses.length}<span className="text-sm font-medium text-slate-400">건</span></p>
            </div>
          </div>

          {/* 카테고리별 요약 */}
          {Object.keys(expSummary.byCategory).length > 0 && (
            <div className={C}>
              <h3 className="text-sm font-bold text-slate-700 mb-3">카테고리별 지출</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(expSummary.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                  <div key={cat} className={`${BADGE} ${CAT_COLORS[cat] ?? "bg-slate-100 text-slate-600"} gap-1.5`}>
                    <span>{cat}</span><span className="font-bold">{fmt(amt)}원</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필터 */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className={L}>월</label>
              <input type="month" className={I} value={expMonth} onChange={e => setExpMonth(e.target.value)} />
            </div>
            <div>
              <label className={L}>카테고리</label>
              <select className={I} value={expCatFilter} onChange={e => setExpCatFilter(e.target.value)}>
                <option value="전체">전체</option>
                {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={L}>상태</label>
              <select className={I} value={expStatusFilter} onChange={e => setExpStatusFilter(e.target.value)}>
                <option value="전체">전체</option>
                <option value="대기">대기</option>
                <option value="승인">승인</option>
                <option value="반려">반려</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className={L}>검색</label>
              <input className={I} placeholder="설명, 등록자 검색..." value={expSearch} onChange={e => setExpSearch(e.target.value)} />
            </div>
          </div>

          {/* 전체 선택 바 */}
          {filteredExpenses.length > 0 && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.size === filteredExpenses.length && filteredExpenses.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-[#3182F6] focus:ring-[#3182F6]"
                />
                <span className="text-sm text-slate-500">전체 선택</span>
                {selected.size > 0 && <span className="text-xs text-[#3182F6] font-semibold">{selected.size}건 선택됨 · {fmt(filteredExpenses.filter(e => selected.has(e.id)).reduce((s, e) => s + Number(e.amount), 0))}원</span>}
              </label>
            </div>
          )}

          {/* 지출 목록 */}
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💳</div>
              <p className="text-slate-400">{expSearch || expCatFilter !== "전체" || expStatusFilter !== "전체" ? "검색 결과가 없습니다" : "등록된 경비가 없습니다"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map(e => (
                <div key={e.id} className={`${C} group ${selected.has(e.id) ? "ring-2 ring-[#3182F6]/30" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggleSelect(e.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-[#3182F6] focus:ring-[#3182F6] flex-shrink-0 cursor-pointer"
                      />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`${BADGE} ${CAT_COLORS[e.category] ?? "bg-slate-100 text-slate-600"}`}>{e.category}</span>
                        <span className={`${BADGE} ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                        <span className="text-xs text-slate-400">{e.payment}</span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-lg font-bold text-slate-900">{(e as any).currency === "USD" ? "$" : ""}{fmt(Number(e.amount))}{(e as any).currency === "USD" ? "" : "원"}</span>
                        {e.description && <span className="text-sm text-slate-600">{e.description}</span>}
                      </div>
                      {e.memo && <p className="text-xs text-slate-400 mt-1">{e.memo}</p>}
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <span>{displayName(e.author)}</span><span>·</span><span>{e.date}</span>
                        {e.approver && e.status !== "대기" && <><span>·</span><span>{e.status}: {displayName(e.approver)}</span></>}
                      </div>
                    </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canApprove && e.status === "대기" && (
                        <>
                          <button onClick={() => approveExpense(e.id, "승인")} className="text-xs font-semibold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition">승인</button>
                          <button onClick={() => approveExpense(e.id, "반려")} className="text-xs font-semibold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition">반려</button>
                        </>
                      )}
                      {e.author === userName && e.status === "대기" && (
                        <>
                          <button onClick={() => startEditExp(e)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 transition p-1.5 rounded-lg hover:bg-slate-100" title="수정">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => deleteExpense(e.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-slate-100" title="삭제">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
