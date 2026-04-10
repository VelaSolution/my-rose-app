"use client";

import { useState } from "react";
import Link from "next/link";
import { fmt } from "@/lib/vela";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";
import ToolNav from "@/components/ToolNav";
import EmptyState from "@/components/EmptyState";
import { exportCSV } from "@/lib/exportCSV";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

type DayRecord = {
  date: string;
  sales: number;
  customers: number;
  memo: string;
};

export default function DailySalesPage() {
  const { data: records, update: setRecords, status, userId } = useCloudSync<DayRecord[]>("vela-daily-sales", []);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sales, setSales] = useState("");
  const [customers, setCustomers] = useState("");
  const [memo, setMemo] = useState("");
  const [view, setView] = useState<"input" | "stats">("input");

  const handleSave = () => {
    if (!sales) return;
    const updated = records.filter((r) => r.date !== date);
    updated.push({ date, sales: Number(sales), customers: Number(customers) || 0, memo });
    updated.sort((a, b) => b.date.localeCompare(a.date));
    setRecords(updated);
    setSales(""); setCustomers(""); setMemo("");
  };

  // 이번 달 데이터
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRecords = records.filter((r) => r.date.startsWith(thisMonth));
  const totalSales = monthRecords.reduce((a, r) => a + r.sales, 0);
  const totalCustomers = monthRecords.reduce((a, r) => a + r.customers, 0);
  const avgSales = monthRecords.length > 0 ? totalSales / monthRecords.length : 0;
  const avgSpend = totalCustomers > 0 ? totalSales / totalCustomers : 0;

  // 요일별 패턴
  const dayPattern = DAYS.map((day, i) => {
    const dayRecords = monthRecords.filter((r) => new Date(r.date).getDay() === i);
    return {
      day,
      avg: dayRecords.length > 0 ? Math.round(dayRecords.reduce((a, r) => a + r.sales, 0) / dayRecords.length) : 0,
      count: dayRecords.length,
    };
  });
  const maxDayAvg = Math.max(...dayPattern.map((d) => d.avg), 1);

  const existing = records.find((r) => r.date === date);

  return (
    <>
    <ToolNav />
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
      <div className="mx-auto max-w-2xl">
        <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>

        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>📝</span> 일일 매출
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">일일 매출 기록</h1>
            <CloudSyncBadge status={status} userId={userId} />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-sm">매일 매출과 고객수만 입력하면 월간 자동 집계 + 요일별 패턴을 분석합니다.</p>
            {records.length > 0 && (
              <button
                onClick={() => exportCSV(
                  `일일매출_${new Date().toISOString().slice(0, 10)}.csv`,
                  ["날짜", "매출", "고객수", "메모"],
                  records.map(r => [r.date, r.sales, r.customers, r.memo])
                )}
                className="flex-shrink-0 text-xs text-slate-500 bg-white ring-1 ring-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
              >
                📥 CSV 내보내기
              </button>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView("input")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${view === "input" ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>기록</button>
          <button onClick={() => setView("stats")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${view === "stats" ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>분석</button>
        </div>

        {view === "input" ? (
          <>
            {/* 입력 */}
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 space-y-4 mb-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">날짜</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                {existing && <p className="text-xs text-amber-500 mt-1">이미 기록이 있습니다. 저장하면 덮어씁니다.</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">매출 (원)</label>
                <input type="number" value={sales} onChange={(e) => setSales(e.target.value)} placeholder="예: 1500000" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">고객 수 (선택)</label>
                <input type="number" value={customers} onChange={(e) => setCustomers(e.target.value)} placeholder="예: 85" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">메모 (선택)</label>
                <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 비오는 날, 이벤트 진행" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <button onClick={handleSave} disabled={!sales} className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition">저장</button>
            </div>

            {/* 최근 기록 */}
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4">최근 기록</h3>
              {records.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title="아직 기록이 없어요"
                  description="매일 매출과 고객수를 기록하면 패턴을 분석해드려요"
                />
              ) : (
                <div className="space-y-2">
                  {records.slice(0, 14).map((r) => (
                    <div key={r.date} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="text-sm font-semibold text-slate-700">{r.date}</span>
                        <span className="text-xs text-slate-400 ml-2">({DAYS[new Date(r.date).getDay()]})</span>
                        {r.memo && <span className="text-xs text-slate-400 ml-2">· {r.memo}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{fmt(r.sales)}원</p>
                          {r.customers > 0 && <p className="text-xs text-slate-400">{r.customers}명</p>}
                        </div>
                        <button
                          onClick={() => {
                            if (!confirm(`${r.date} 기록을 삭제할까요?`)) return;
                            setRecords(records.filter((rec) => rec.date !== r.date));
                          }}
                          className="text-slate-300 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50 flex-shrink-0"
                          title="삭제"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* 월간 통계 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "이번 달 매출", value: `${fmt(totalSales)}원` },
                { label: "영업일수", value: `${monthRecords.length}일` },
                { label: "일 평균 매출", value: `${fmt(avgSales)}원` },
                { label: "객단가", value: avgSpend > 0 ? `${fmt(avgSpend)}원` : "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className="text-lg font-bold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* 요일별 패턴 */}
            <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4">요일별 매출 패턴</h3>
              <div className="flex items-end gap-2 h-32">
                {dayPattern.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-600">{d.avg > 0 ? `${Math.round(d.avg / 10000)}만` : ""}</span>
                    <div
                      className={`w-full rounded-t-lg ${d.day === "토" || d.day === "일" ? "bg-blue-400" : "bg-slate-300"}`}
                      style={{ height: `${Math.max(4, (d.avg / maxDayAvg) * 100)}px` }}
                    />
                    <span className={`text-xs font-semibold ${d.day === "토" || d.day === "일" ? "text-blue-600" : "text-slate-500"}`}>{d.day}</span>
                  </div>
                ))}
              </div>
              {monthRecords.length < 7 && <p className="text-xs text-slate-400 text-center mt-4">7일 이상 기록하면 패턴이 더 정확해집니다</p>}
            </div>
          </>
        )}
      </div>
    </main>
    </>
  );
}
