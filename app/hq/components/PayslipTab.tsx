"use client";
import { useState, useEffect } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, today, fmt, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void; }

type Payslip = {
  id: string; month: string; name: string;
  base_pay: number; overtime_pay: number; bonus: number;
  national_pension: number; health_insurance: number;
  employment_insurance: number; income_tax: number;
  total_pay: number; total_deductions: number; net_pay: number;
  memo: string; created_at: string;
};

export default function PayslipTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canManage = myRole === "대표" || myRole === "이사";

  // 폼
  const [fName, setFName] = useState("");
  const [fBase, setFBase] = useState("");
  const [fOvertime, setFOvertime] = useState("0");
  const [fBonus, setFBonus] = useState("0");
  const [fMemo, setFMemo] = useState("");

  const load = async () => {
    const s = sb(); if (!s) return;
    const q = canManage
      ? s.from("hq_payslips").select("*").eq("month", selectedMonth).order("name")
      : s.from("hq_payslips").select("*").eq("name", userName).order("month", { ascending: false });
    const { data } = await q;
    if (data) setSlips(data as Payslip[]);
    if (canManage) {
      const { data: td } = await s.from("hq_team").select("name").neq("approved", false);
      if (td) setTeamNames((td as { name: string }[]).map(t => t.name));
    }
  };

  useEffect(() => { load(); }, [selectedMonth]);

  const calcDeductions = (base: number) => {
    const total = base;
    const np = Math.round(total * 0.045);
    const hi = Math.round(total * 0.03545);
    const ei = Math.round(total * 0.009);
    const tax = Math.round(total * 0.01);
    return { national_pension: np, health_insurance: hi, employment_insurance: ei, income_tax: tax, total_deductions: np + hi + ei + tax };
  };

  const submitPayslip = async () => {
    const base = Number(fBase.replace(/,/g, ""));
    const overtime = Number(fOvertime.replace(/,/g, ""));
    const bonus = Number(fBonus.replace(/,/g, ""));
    if (!fName || !base) { flash("이름과 기본급을 입력해주세요"); return; }
    const totalPay = base + overtime + bonus;
    const ded = calcDeductions(totalPay);
    const s = sb(); if (!s) return;
    await s.from("hq_payslips").upsert({
      month: selectedMonth, name: fName,
      base_pay: base, overtime_pay: overtime, bonus,
      ...ded, total_pay: totalPay, net_pay: totalPay - ded.total_deductions,
      memo: fMemo.trim(),
    }, { onConflict: "month,name" });
    flash("급여 명세서 저장 완료");
    setShowForm(false); setFBase(""); setFOvertime("0"); setFBonus("0"); setFMemo("");
    load();
  };

  const monthLabel = (() => { const [y, m] = selectedMonth.split("-"); return `${y}년 ${Number(m)}월`; })();

  return (
    <div className="space-y-4">
      {/* 월 선택 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input type="month" className={`${I} !w-auto`} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          <h2 className="text-lg font-bold text-slate-800">{monthLabel} 급여</h2>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)} className={B}>
            {showForm ? "취소" : "+ 급여 등록"}
          </button>
        )}
      </div>

      {/* 등록 폼 (대표/이사만) */}
      {showForm && canManage && (
        <div className={C}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">💰 급여 명세서 등록</h3>
          <div className="space-y-3">
            <div>
              <label className={L}>직원</label>
              <select className={I} value={fName} onChange={e => setFName(e.target.value)}>
                <option value="">선택</option>
                {teamNames.map(n => <option key={n} value={n}>{displayName(n)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={L}>기본급</label><input className={I} inputMode="numeric" value={fBase} onChange={e => setFBase(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" /></div>
              <div><label className={L}>초과근무수당</label><input className={I} inputMode="numeric" value={fOvertime} onChange={e => setFOvertime(e.target.value.replace(/[^0-9]/g, ""))} /></div>
              <div><label className={L}>상여금</label><input className={I} inputMode="numeric" value={fBonus} onChange={e => setFBonus(e.target.value.replace(/[^0-9]/g, ""))} /></div>
            </div>
            <div><label className={L}>메모</label><input className={I} value={fMemo} onChange={e => setFMemo(e.target.value)} placeholder="비고사항" /></div>
            {fBase && (
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p>총 지급액: <b>{fmt(Number(fBase.replace(/,/g, "")) + Number(fOvertime.replace(/,/g, "")) + Number(fBonus.replace(/,/g, "")))}원</b></p>
                <p>공제 합계: <b>{fmt(calcDeductions(Number(fBase.replace(/,/g, "")) + Number(fOvertime.replace(/,/g, "")) + Number(fBonus.replace(/,/g, ""))).total_deductions)}원</b> (국민연금 4.5% + 건강 3.545% + 고용 0.9% + 소득세 1%)</p>
                <p className="text-emerald-700 font-bold">실수령액: {fmt(Number(fBase.replace(/,/g, "")) + Number(fOvertime.replace(/,/g, "")) + Number(fBonus.replace(/,/g, "")) - calcDeductions(Number(fBase.replace(/,/g, "")) + Number(fOvertime.replace(/,/g, "")) + Number(fBonus.replace(/,/g, ""))).total_deductions)}원</p>
              </div>
            )}
            <div className="flex justify-end"><button onClick={submitPayslip} className={B}>저장</button></div>
          </div>
        </div>
      )}

      {/* 명세서 목록 */}
      {slips.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <span className="text-4xl block mb-2">💰</span>
          <p className="text-sm">{canManage ? "등록된 급여 명세서가 없습니다" : "아직 급여 명세서가 없습니다"}</p>
        </div>
      ) : slips.map(s => {
        const isOpen = expandedId === s.id;
        return (
          <div key={s.id} className={C}>
            <button onClick={() => setExpandedId(isOpen ? null : s.id)} className="w-full flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">💰</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{canManage ? displayName(s.name) : `${s.month.replace("-", "년 ")}월`}</p>
                  <p className="text-xs text-slate-400">{canManage ? s.month : ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-600">{fmt(s.net_pay)}원</p>
                <p className="text-[10px] text-slate-400">실수령</p>
              </div>
            </button>
            {isOpen && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <table className="w-full text-sm">
                  <tbody className="text-slate-700">
                    <tr className="border-b border-slate-50"><td className="py-1.5 text-slate-500">기본급</td><td className="py-1.5 text-right font-semibold">{fmt(s.base_pay)}원</td></tr>
                    {s.overtime_pay > 0 && <tr className="border-b border-slate-50"><td className="py-1.5 text-slate-500">초과근무수당</td><td className="py-1.5 text-right font-semibold">{fmt(s.overtime_pay)}원</td></tr>}
                    {s.bonus > 0 && <tr className="border-b border-slate-50"><td className="py-1.5 text-slate-500">상여금</td><td className="py-1.5 text-right font-semibold">{fmt(s.bonus)}원</td></tr>}
                    <tr className="border-b border-slate-200 font-bold"><td className="py-1.5">총 지급액</td><td className="py-1.5 text-right">{fmt(s.total_pay)}원</td></tr>
                    <tr className="border-b border-slate-50 text-red-500"><td className="py-1.5">국민연금</td><td className="py-1.5 text-right">-{fmt(s.national_pension)}원</td></tr>
                    <tr className="border-b border-slate-50 text-red-500"><td className="py-1.5">건강보험</td><td className="py-1.5 text-right">-{fmt(s.health_insurance)}원</td></tr>
                    <tr className="border-b border-slate-50 text-red-500"><td className="py-1.5">고용보험</td><td className="py-1.5 text-right">-{fmt(s.employment_insurance)}원</td></tr>
                    <tr className="border-b border-slate-200 text-red-500"><td className="py-1.5">소득세</td><td className="py-1.5 text-right">-{fmt(s.income_tax)}원</td></tr>
                    <tr className="font-extrabold text-emerald-700"><td className="py-2">실수령액</td><td className="py-2 text-right text-lg">{fmt(s.net_pay)}원</td></tr>
                  </tbody>
                </table>
                {s.memo && <p className="text-xs text-slate-400 mt-2">메모: {s.memo}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
