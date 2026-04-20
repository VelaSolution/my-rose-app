"use client";
import { useState, useEffect, useMemo } from "react";
import type { HQRole } from "@/app/hq/types";
import { sb, I, C, L, B, B2, BADGE, fmt, today, useTeamDisplayNames } from "@/app/hq/utils";

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

type SubTab = "회의실" | "차량" | "장비";
type Resource = { id: string; name: string; type: SubTab; description: string; capacity: number; active: boolean };
type Booking = {
  id: string; resource_type: SubTab; resource_name: string; date: string;
  start_time: string; end_time: string; purpose: string; booker: string; status: string;
};

const SUB_TABS: SubTab[] = ["회의실", "차량", "장비"];
const STATUS_COLORS: Record<string, string> = {
  "예약됨": "bg-blue-50 text-blue-700",
  "사용중": "bg-emerald-50 text-emerald-700",
  "취소": "bg-red-50 text-red-700",
  "완료": "bg-slate-100 text-slate-600",
};
const HOURS = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

const EMPTY = { resource_name: "", date: today(), start_time: "09:00", end_time: "10:00", purpose: "" };

export default function BookingTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [sub, setSub] = useState<SubTab>("회의실");
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewDate, setViewDate] = useState(today());
  const [showResForm, setShowResForm] = useState(false);
  const [resForm, setResForm] = useState({ name: "", description: "", capacity: "1" });

  const isAdmin = myRole === "대표" || myRole === "이사";

  const load = async () => {
    const s = sb(); if (!s) return;
    setLoading(true);
    try {
      const [{ data: r }, { data: b }] = await Promise.all([
        s.from("hq_resources").select("*").eq("active", true).order("name"),
        s.from("hq_bookings").select("*").order("date", { ascending: true }),
      ]);
      if (r) setResources(r.map((d: any) => ({ id: d.id, name: d.name, type: d.type, description: d.description ?? "", capacity: d.capacity ?? 0, active: d.active ?? true })));
      if (b) setBookings(b.map((d: any) => ({ id: d.id, resource_type: d.resource_type, resource_name: d.resource_name, date: d.date, start_time: d.start_time, end_time: d.end_time, purpose: d.purpose ?? "", booker: d.booker, status: d.status ?? "예약됨" })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => resources.filter(r => r.type === sub), [resources, sub]);
  const dayBookings = useMemo(() => bookings.filter(b => b.date === viewDate && b.resource_type === sub && b.status !== "취소"), [bookings, viewDate, sub]);
  const myBookings = useMemo(() => bookings.filter(b => b.booker === userName && b.status !== "취소").sort((a, b) => b.date.localeCompare(a.date)), [bookings, userName]);

  const handleBook = async () => {
    if (!form.resource_name || !form.date || !form.start_time || !form.end_time || !form.purpose) { flash("모든 항목을 입력하세요"); return; }
    if (form.start_time >= form.end_time) { flash("종료 시간이 시작 시간보다 빨라야 합니다"); return; }
    const conflict = dayBookings.find(b => b.resource_name === form.resource_name && b.start_time < form.end_time && b.end_time > form.start_time);
    if (conflict) { flash("해당 시간에 이미 예약이 있습니다"); return; }
    const s = sb(); if (!s) return;
    setSaving(true);
    try {
      const { error } = await s.from("hq_bookings").insert({ resource_type: sub, resource_name: form.resource_name, date: form.date, start_time: form.start_time, end_time: form.end_time, purpose: form.purpose, booker: userName, status: "예약됨" });
      if (error) throw error;
      flash("예약이 완료되었습니다");
      setForm(EMPTY); setShowForm(false); load();
    } catch (e) { flash("예약 실패"); console.error(e); }
    setSaving(false);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("예약을 취소하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_bookings").update({ status: "취소" }).eq("id", id);
      flash("예약이 취소되었습니다"); load();
    } catch (e) { flash("취소 실패"); }
  };

  const handleAddResource = async () => {
    if (!resForm.name) { flash("자원 이름을 입력하세요"); return; }
    const s = sb(); if (!s) return;
    try {
      const { error } = await s.from("hq_resources").insert({ name: resForm.name, type: sub, description: resForm.description, capacity: Number(resForm.capacity) || 0, active: true });
      if (error) throw error;
      flash("자원이 등록되었습니다"); setResForm({ name: "", description: "", capacity: "1" }); setShowResForm(false); load();
    } catch (e) { flash("등록 실패"); }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("자원을 삭제하시겠습니까?")) return;
    const s = sb(); if (!s) return;
    try {
      await s.from("hq_resources").update({ active: false }).eq("id", id);
      flash("삭제되었습니다"); load();
    } catch (e) { flash("삭제 실패"); }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">불러오는 중...</div>;

  return (
    <div className="space-y-5">
      {/* Sub-tab */}
      <div className="flex gap-2">
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setSub(t)} className={`${BADGE} ${sub === t ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600"} cursor-pointer`}>{t}</button>
        ))}
      </div>

      {/* 헤더 & 버튼 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{sub} 예약</h2>
        <div className="flex gap-2">
          <button className={B} onClick={() => { setForm({ ...EMPTY, date: viewDate }); setShowForm(true); }}>+ 예약하기</button>
          {isAdmin && <button className={B2} onClick={() => setShowResForm(true)}>+ 자원 등록</button>}
        </div>
      </div>

      {/* 자원 목록 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(r => {
          const booked = dayBookings.filter(b => b.resource_name === r.name);
          return (
            <div key={r.id} className={C}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800">{r.name}</span>
                <span className={`${BADGE} ${booked.length > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{booked.length > 0 ? `${booked.length}건 예약` : "사용 가능"}</span>
              </div>
              {r.description && <p className="text-xs text-slate-500 mb-1">{r.description}</p>}
              {r.capacity > 0 && sub === "회의실" && <p className="text-xs text-slate-400">수용: {r.capacity}명</p>}
              {booked.map(b => (
                <div key={b.id} className="mt-2 p-2 rounded-lg bg-blue-50 text-xs text-blue-700">{b.start_time}~{b.end_time} · {displayName(b.booker)} · {b.purpose}</div>
              ))}
              {isAdmin && <button onClick={() => handleDeleteResource(r.id)} className="mt-2 text-xs text-red-400 hover:text-red-600">삭제</button>}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-slate-400 col-span-full">등록된 {sub}이(가) 없습니다</p>}
      </div>

      {/* 일별 타임라인 */}
      <div className={C}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">일별 예약 현황</h3>
          <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className={`${I} w-44`} />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* 시간 헤더 */}
            <div className="flex border-b border-slate-100 pb-1 mb-2">
              <div className="w-24 shrink-0 text-xs text-slate-400">자원</div>
              {HOURS.map(h => <div key={h} className="flex-1 text-center text-xs text-slate-400">{h}</div>)}
            </div>
            {filtered.map(r => {
              const rBookings = dayBookings.filter(b => b.resource_name === r.name);
              return (
                <div key={r.id} className="flex items-center border-b border-slate-50 py-1">
                  <div className="w-24 shrink-0 text-xs font-medium text-slate-600 truncate">{r.name}</div>
                  <div className="flex-1 relative h-6">
                    {rBookings.map(b => {
                      const startH = parseInt(b.start_time.split(":")[0]) - 8;
                      const startM = parseInt(b.start_time.split(":")[1]) / 60;
                      const endH = parseInt(b.end_time.split(":")[0]) - 8;
                      const endM = parseInt(b.end_time.split(":")[1]) / 60;
                      const left = ((startH + startM) / 13) * 100;
                      const width = ((endH + endM - startH - startM) / 13) * 100;
                      return <div key={b.id} title={`${b.start_time}-${b.end_time} ${b.booker}: ${b.purpose}`} className="absolute top-0 h-full rounded bg-[#3182F6]/20 border border-[#3182F6]/40 text-[10px] text-[#3182F6] flex items-center px-1 truncate" style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}>{displayName(b.booker)}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 내 예약 */}
      <div className={C}>
        <h3 className="font-semibold text-slate-700 mb-3">내 예약 목록</h3>
        {myBookings.length === 0 && <p className="text-sm text-slate-400">예약 내역이 없습니다</p>}
        <div className="space-y-2">
          {myBookings.map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div>
                <span className={`${BADGE} ${STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-600"} mr-2`}>{b.status}</span>
                <span className="text-sm font-medium text-slate-700">[{b.resource_type}] {b.resource_name}</span>
                <span className="text-xs text-slate-400 ml-2">{b.date} {b.start_time}~{b.end_time}</span>
                <span className="text-xs text-slate-500 ml-2">{b.purpose}</span>
              </div>
              {b.status === "예약됨" && <button className="text-xs text-red-500 hover:text-red-700" onClick={() => handleCancel(b.id)}>취소</button>}
            </div>
          ))}
        </div>
      </div>

      {/* 예약 폼 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowForm(false)}>
          <div className={`${C} w-full max-w-md mx-4`} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">{sub} 예약</h3>
            <div className="space-y-3">
              <div>
                <label className={L}>{sub} 선택</label>
                <select value={form.resource_name} onChange={e => setForm({ ...form, resource_name: e.target.value })} className={I}>
                  <option value="">선택하세요</option>
                  {filtered.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className={L}>날짜</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={I} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={L}>시작 시간</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className={I} />
                </div>
                <div>
                  <label className={L}>종료 시간</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className={I} />
                </div>
              </div>
              <div>
                <label className={L}>목적</label>
                <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className={I} placeholder="예약 목적을 입력하세요" />
              </div>
              <div className="flex gap-2 pt-2">
                <button className={B} onClick={handleBook} disabled={saving}>{saving ? "저장 중..." : "예약하기"}</button>
                <button className={B2} onClick={() => setShowForm(false)}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 자원 등록 모달 */}
      {showResForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowResForm(false)}>
          <div className={`${C} w-full max-w-md mx-4`} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">{sub} 등록</h3>
            <div className="space-y-3">
              <div><label className={L}>이름</label><input value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} className={I} placeholder={`${sub} 이름`} /></div>
              <div><label className={L}>설명</label><input value={resForm.description} onChange={e => setResForm({ ...resForm, description: e.target.value })} className={I} placeholder="설명 (선택)" /></div>
              {sub === "회의실" && <div><label className={L}>수용 인원</label><input type="number" value={resForm.capacity} onChange={e => setResForm({ ...resForm, capacity: e.target.value })} className={I} /></div>}
              <div className="flex gap-2 pt-2">
                <button className={B} onClick={handleAddResource}>등록</button>
                <button className={B2} onClick={() => setShowResForm(false)}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
