"use client";
import { useState, useEffect } from "react";
import type { HQRole, Metric } from "@/app/hq/types";
import { sb, fmt, today, I, C, L, B, B2 } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const EMPTY = { date: today(), revenue: "", users_count: "", conversion_rate: "", profit: "" };

export default function KpiTab({ userId, flash }: Props) {
  const [records, setRecords] = useState<Metric[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const s = sb();
    if (!s) return;
    const { data } = await s
      .from("hq_metrics")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(15);
    setRecords((data as Metric[]) ?? []);
  }

  async function save() {
    if (!form.date) { flash("날짜를 입력하세요"); return; }
    setSaving(true);
    const s = sb();
    if (!s) return;
    const payload = {
      user_id: userId,
      date: form.date,
      revenue: Number(form.revenue) || 0,
      users_count: Number(form.users_count) || 0,
      conversion_rate: Number(form.conversion_rate) || 0,
      profit: Number(form.profit) || 0,
    };
    // upsert on date conflict
    const { error } = await s.from("hq_metrics").upsert(payload, { onConflict: "user_id,date" });
    if (error) flash("저장 실패: " + error.message);
    else { flash("저장 완료"); setForm({ ...EMPTY }); await load(); }
    setSaving(false);
  }

  async function remove(id: string) {
    const s = sb();
    if (!s) return;
    await s.from("hq_metrics").delete().eq("id", id);
    flash("삭제 완료");
    await load();
  }

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">KPI 트래킹</h2>

      {/* Form */}
      <div className={C}>
        <h3 className="mb-4 text-sm font-bold text-slate-700">KPI 입력</h3>
        <div className="grid gap-4 sm:grid-cols-5">
          <div>
            <label className={L}>날짜</label>
            <input type="date" className={I} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className={L}>매출 (₩)</label>
            <input type="number" className={I} placeholder="0" value={form.revenue} onChange={(e) => set("revenue", e.target.value)} />
          </div>
          <div>
            <label className={L}>사용자 수</label>
            <input type="number" className={I} placeholder="0" value={form.users_count} onChange={(e) => set("users_count", e.target.value)} />
          </div>
          <div>
            <label className={L}>전환율 (%)</label>
            <input type="number" step="0.1" className={I} placeholder="0.0" value={form.conversion_rate} onChange={(e) => set("conversion_rate", e.target.value)} />
          </div>
          <div>
            <label className={L}>이익 (₩)</label>
            <input type="number" className={I} placeholder="0" value={form.profit} onChange={(e) => set("profit", e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className={B} onClick={save} disabled={saving}>
            {saving ? "저장 중..." : "저장 (날짜 중복 시 갱신)"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={C}>
        <h3 className="mb-3 text-sm font-bold text-slate-700">최근 15일 기록</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                <th className="pb-2 pr-4">날짜</th>
                <th className="pb-2 pr-4 text-right">매출</th>
                <th className="pb-2 pr-4 text-right">사용자</th>
                <th className="pb-2 pr-4 text-right">전환율</th>
                <th className="pb-2 pr-4 text-right">이익</th>
                <th className="pb-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-slate-700">{r.date}</td>
                  <td className="py-2.5 pr-4 text-right text-slate-700">₩{fmt(r.revenue)}</td>
                  <td className="py-2.5 pr-4 text-right text-slate-700">{fmt(r.users_count)}</td>
                  <td className="py-2.5 pr-4 text-right text-slate-700">{r.conversion_rate}%</td>
                  <td className={`py-2.5 pr-4 text-right font-semibold ${r.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    ₩{fmt(r.profit)}
                  </td>
                  <td className="py-2.5 text-right">
                    <button className="text-xs text-red-400 hover:text-red-600" onClick={() => remove(r.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">기록이 없습니다.</p>
          )}
        </div>
        {records.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                const header = "날짜,매출,사용자,전환율,이익";
                const rows = records.map(r =>
                  [r.date, r.revenue, r.users_count, r.conversion_rate, r.profit].join(",")
                );
                const csv = "\uFEFF" + [header, ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `KPI_${today()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold px-4 py-2 text-xs hover:bg-emerald-100 transition-all"
            >
              📥 CSV 다운로드
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
