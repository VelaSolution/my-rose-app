"use client";
import { useState, useEffect } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, today, fmt, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

type Expense = {
  id: string; date: string; category: string; amount: number;
  description: string; receipt_url?: string; status: "대기" | "승인" | "반려";
  author: string; approver?: string; comment?: string; created_at: string;
};

const CATEGORIES = [
  { id: "meal", label: "식대", icon: "🍽️" },
  { id: "transport", label: "교통비", icon: "🚗" },
  { id: "supplies", label: "비품/소모품", icon: "📦" },
  { id: "meeting", label: "회의비", icon: "☕" },
  { id: "education", label: "교육/도서", icon: "📚" },
  { id: "equipment", label: "장비/수리", icon: "🔧" },
  { id: "other", label: "기타", icon: "📌" },
];

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void; }

export default function ExpenseTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [view, setView] = useState<"my" | "approve">("my");
  const [showForm, setShowForm] = useState(false);

  // 폼
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("meal");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const canApprove = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  const load = async () => {
    const s = sb(); if (!s) return;
    const q = view === "approve" && canApprove
      ? s.from("hq_expenses").select("*").order("created_at", { ascending: false })
      : s.from("hq_expenses").select("*").eq("author", userName).order("created_at", { ascending: false });
    const { data } = await q;
    if (data) setExpenses(data as Expense[]);
  };

  useEffect(() => { load(); }, [view]);

  const submit = async () => {
    const num = Number(amount.replace(/,/g, ""));
    if (!num || !desc.trim()) { flash("금액과 내용을 입력해주세요"); return; }
    const s = sb(); if (!s) return;
    await s.from("hq_expenses").insert({
      date, category, amount: num, description: desc.trim(),
      status: "대기", author: userName,
    });
    flash("경비 청구 완료"); setShowForm(false); setAmount(""); setDesc("");
    load();
  };

  const approve = async (id: string, action: "승인" | "반려") => {
    const s = sb(); if (!s) return;
    await s.from("hq_expenses").update({ status: action, approver: userName }).eq("id", id);
    flash(`${action} 완료`); load();
  };

  const del = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    await s.from("hq_expenses").delete().eq("id", id);
    flash("삭제 완료"); load();
  };

  const totalPending = expenses.filter(e => e.status === "대기").reduce((s, e) => s + e.amount, 0);
  const totalApproved = expenses.filter(e => e.status === "승인").reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter(e => e.date.startsWith(today().slice(0, 7)));

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`${C} !p-3 text-center`}>
          <p className="text-[11px] text-slate-400 font-semibold">이번 달 청구</p>
          <p className="text-lg font-bold text-slate-900">{fmt(thisMonth.reduce((s, e) => s + e.amount, 0))}원</p>
        </div>
        <div className={`${C} !p-3 text-center`}>
          <p className="text-[11px] text-amber-600 font-semibold">승인 대기</p>
          <p className="text-lg font-bold text-amber-600">{fmt(totalPending)}원</p>
        </div>
        <div className={`${C} !p-3 text-center`}>
          <p className="text-[11px] text-emerald-600 font-semibold">승인 완료</p>
          <p className="text-lg font-bold text-emerald-600">{fmt(totalApproved)}원</p>
        </div>
      </div>

      {/* 탭 + 신규 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setView("my")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${view === "my" ? "bg-white text-[#3182F6] shadow-sm" : "text-slate-500"}`}>
            내 청구
          </button>
          {canApprove && (
            <button onClick={() => setView("approve")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${view === "approve" ? "bg-white text-[#3182F6] shadow-sm" : "text-slate-500"}`}>
              승인 관리
            </button>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className={B}>
          {showForm ? "취소" : "+ 경비 청구"}
        </button>
      </div>

      {/* 입력 폼 */}
      {showForm && (
        <div className={C}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">🧾 경비 청구서 작성</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={L}>날짜</label><input type="date" className={I} value={date} onChange={e => setDate(e.target.value)} /></div>
              <div><label className={L}>금액 (원)</label><input className={I} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" /></div>
            </div>
            <div>
              <label className={L}>카테고리</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={`py-2 rounded-xl text-xs font-semibold transition text-center active:scale-95 ${
                      category === c.id ? "bg-[#3182F6]/10 text-[#3182F6] ring-1 ring-[#3182F6]/30" : "bg-slate-50 text-slate-600"
                    }`}>
                    <span className="block text-sm mb-0.5">{c.icon}</span>{c.label}
                  </button>
                ))}
              </div>
            </div>
            <div><label className={L}>사용 내역</label><input className={I} value={desc} onChange={e => setDesc(e.target.value)} placeholder="예) 식재료 구매 (하나로마트)" /></div>
            <div className="flex justify-end">
              <button onClick={submit} className={B}>청구하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="space-y-2">
        {expenses.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <span className="text-4xl block mb-2">🧾</span>
            <p className="text-sm">경비 청구 내역이 없습니다</p>
          </div>
        ) : expenses.map(e => {
          const cat = CATEGORIES.find(c => c.id === e.category);
          const statusColor = e.status === "승인" ? "bg-emerald-50 text-emerald-700" : e.status === "반려" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700";
          return (
            <div key={e.id} className={C}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                  {cat?.icon ?? "📌"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-800">{e.description}</span>
                    <span className={`${BADGE} text-[10px] ${statusColor}`}>{e.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{e.date}</span>
                    <span>{cat?.label}</span>
                    {view === "approve" && <span>{displayName(e.author)}</span>}
                    {e.approver && <span>결재: {displayName(e.approver)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{fmt(e.amount)}원</p>
                  <div className="flex gap-1 mt-1">
                    {canApprove && view === "approve" && e.status === "대기" && (
                      <>
                        <button onClick={() => approve(e.id, "승인")} className="text-[10px] text-emerald-600 font-bold hover:underline">승인</button>
                        <button onClick={() => approve(e.id, "반려")} className="text-[10px] text-red-500 font-bold hover:underline">반려</button>
                      </>
                    )}
                    {e.author === userName && e.status === "대기" && (
                      <button onClick={() => del(e.id)} className="text-[10px] text-slate-400 font-semibold hover:text-red-500">삭제</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
