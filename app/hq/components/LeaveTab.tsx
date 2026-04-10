"use client";
import { useState, useEffect, useCallback } from "react";
import { HQRole, LeaveRequest } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, useTeamDisplayNames } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const LEAVE_TYPES: LeaveRequest["type"][] = ["연차", "반차(오전)", "반차(오후)", "병가", "경조", "출장", "기타"];

const STATUS_STYLE: Record<string, string> = {
  "대기": "bg-amber-50 text-amber-700",
  "승인": "bg-emerald-50 text-emerald-700",
  "반려": "bg-red-50 text-red-700",
};

/* DB row (snake_case) → client LeaveRequest (camelCase) */
function toClient(row: Record<string, unknown>): LeaveRequest {
  return {
    id: row.id as string,
    requester: row.requester as string,
    type: row.type as LeaveRequest["type"],
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    days: Number(row.days),
    reason: row.reason as string,
    status: row.status as LeaveRequest["status"],
    approver: (row.approver as string) ?? "",
    date: (row.created_at as string)?.slice(0, 10) ?? "",
  };
}

function calcDays(start: string, end: string, type: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
  if (type === "반차(오전)" || type === "반차(오후)") return diff * 0.5;
  return diff;
}

const LEAVE_TYPE_COLOR: Record<string, string> = {
  "연차": "bg-blue-500",
  "반차(오전)": "bg-amber-500",
  "반차(오후)": "bg-amber-500",
  "병가": "bg-red-500",
  "경조": "bg-purple-500",
  "출장": "bg-emerald-500",
  "기타": "bg-slate-500",
};

const LEAVE_TYPE_TEXT_COLOR: Record<string, string> = {
  "연차": "text-blue-700",
  "반차(오전)": "text-amber-700",
  "반차(오후)": "text-amber-700",
  "병가": "text-red-700",
  "경조": "text-purple-700",
  "출장": "text-emerald-700",
  "기타": "text-slate-700",
};

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay(); // 0=Sun
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function LeaveTab({ userId, userName, myRole, flash }: Props) {
  const { displayName } = useTeamDisplayNames();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<LeaveRequest["type"]>("연차");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"mine" | "pending" | "all">("mine");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  /* ── fetch ────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    const s = sb();
    if (!s) return;
    const { data, error } = await s
      .from("hq_leave")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { flash("데이터 로드 실패"); return; }
    setRequests((data ?? []).map(toClient));
    setLoading(false);
  }, [flash]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isManager = myRole === "대표" || myRole === "이사" || myRole === "팀장";

  /* ── remaining leave ──────────────────────────────────── */
  const year = new Date().getFullYear();
  const usedDays = requests
    .filter(r => r.requester === userName && r.status !== "반려" && r.startDate.startsWith(String(year)))
    .reduce((a, r) => a + r.days, 0);
  const totalLeave = 15;
  const remaining = totalLeave - usedDays;

  const days = calcDays(startDate, endDate, type);

  /* ── submit ───────────────────────────────────────────── */
  const submit = async () => {
    if (!reason.trim()) { flash("사유를 입력하세요"); return; }
    if (days > remaining && (type === "연차" || type === "반차(오전)" || type === "반차(오후)")) {
      flash("잔여 연차가 부족합니다"); return;
    }
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    const { error } = await s.from("hq_leave").insert({
      id: crypto.randomUUID(),
      requester: userName,
      type,
      start_date: startDate,
      end_date: endDate,
      days,
      reason: reason.trim(),
      status: "대기",
      approver: null,
    });
    if (error) { flash("신청 실패: " + error.message); return; }
    flash("휴가 신청이 완료되었습니다");
    setReason("");
    setStartDate(today());
    setEndDate(today());
    setType("연차");
    setShowForm(false);
    fetchAll();
  };

  /* ── cancel (승인 전에만) ──────────────────────────────── */
  const cancelRequest = async (id: string) => {
    if (!confirm("휴가 신청을 취소하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_leave").delete().eq("id", id);
    if (error) { flash("취소 실패"); return; }
    flash("휴가 신청이 취소되었습니다");
    fetchAll();
  };

  /* ── approve / reject ─────────────────────────────────── */
  const updateStatus = async (id: string, status: "승인" | "반려") => {
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    const { error } = await s
      .from("hq_leave")
      .update({ status, approver: userName })
      .eq("id", id);
    if (error) { flash("처리 실패: " + error.message); return; }
    flash(status === "승인" ? "승인 완료" : "반려 완료");
    fetchAll();
  };

  /* ── filter ───────────────────────────────────────────── */
  const pendingCount = requests.filter(r => r.status === "대기" && r.requester !== userName).length;

  const filtered = requests.filter(r => {
    if (filter === "mine") return r.requester === userName;
    if (filter === "pending") return r.status === "대기";
    return true;
  });

  /* ── calendar helpers ──────────────────────────────────── */
  const calDays = getCalendarDays(calYear, calMonth);

  function getLeavesForDate(dateStr: string): LeaveRequest[] {
    return requests.filter(r => {
      if (r.status === "반려") return false;
      return r.startDate <= dateStr && r.endDate >= dateStr;
    });
  }

  const calPrev = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const calNext = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  /* ── render ───────────────────────────────────────────── */
  if (loading) return <p className="text-center text-sm text-slate-400 py-12">불러오는 중...</p>;

  return (
    <div className="space-y-6">
      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("list")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${viewMode === "list" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          목록
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${viewMode === "calendar" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          캘린더
        </button>
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && (
        <div className={C}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={calPrev} className="rounded-xl bg-slate-100 text-slate-600 font-semibold px-3 py-1.5 text-sm hover:bg-slate-200 transition-all">&larr;</button>
            <h3 className="text-sm font-bold text-slate-700">{calYear}년 {calMonth + 1}월 휴가 현황</h3>
            <button onClick={calNext} className="rounded-xl bg-slate-100 text-slate-600 font-semibold px-3 py-1.5 text-sm hover:bg-slate-200 transition-all">&rarr;</button>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {(["연차", "반차(오전)", "병가", "경조", "출장", "기타"] as const).map(t => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full ${LEAVE_TYPE_COLOR[t]}`} />
                {t === "반차(오전)" ? "반차" : t}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
            {["일", "월", "화", "수", "목", "금", "토"].map(d => (
              <div key={d} className="bg-slate-50 text-center py-2 text-[11px] font-bold text-slate-400">{d}</div>
            ))}
            {calDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="bg-white min-h-[72px]" />;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const leaves = getLeavesForDate(dateStr);
              const isToday = dateStr === today();
              return (
                <div key={dateStr} className={`bg-white min-h-[72px] p-1.5 ${isToday ? "ring-2 ring-inset ring-[#3182F6]/40" : ""}`}>
                  <p className={`text-[11px] font-semibold mb-1 ${isToday ? "text-[#3182F6]" : i % 7 === 0 ? "text-red-400" : i % 7 === 6 ? "text-blue-400" : "text-slate-500"}`}>{day}</p>
                  <div className="space-y-0.5">
                    {leaves.slice(0, 3).map(l => (
                      <div key={l.id} className="flex items-center gap-1 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${LEAVE_TYPE_COLOR[l.type]}`} />
                        <span className={`text-[10px] font-medium truncate ${LEAVE_TYPE_TEXT_COLOR[l.type]}`}>{displayName(l.requester)}</span>
                      </div>
                    ))}
                    {leaves.length > 3 && (
                      <p className="text-[9px] text-slate-400 font-semibold">+{leaves.length - 3}명</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remaining leave */}
      <div className={C}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">잔여 연차</h3>
          <button onClick={() => setShowForm(!showForm)} className={B}>
            {showForm ? "닫기" : "+ 휴가 신청"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-blue-50 p-4 text-center">
            <p className="text-xs text-blue-600 font-semibold mb-1">총 연차</p>
            <p className="text-2xl font-bold text-blue-700">{totalLeave}일</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-4 text-center">
            <p className="text-xs text-orange-600 font-semibold mb-1">사용</p>
            <p className="text-2xl font-bold text-orange-700">{usedDays}일</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 text-center">
            <p className="text-xs text-emerald-600 font-semibold mb-1">잔여</p>
            <p className="text-2xl font-bold text-emerald-700">{remaining}일</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-[#3182F6] h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (usedDays / totalLeave) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-right">{((usedDays / totalLeave) * 100).toFixed(0)}% 사용</p>
        </div>
      </div>

      {/* Application form */}
      {showForm && (
        <div className={C}>
          <h3 className="text-sm font-bold text-slate-700 mb-4">휴가 신청</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={L}>휴가 종류</label>
              <select value={type} onChange={e => setType(e.target.value as LeaveRequest["type"])} className={I}>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={L}>사용 일수</label>
              <div className="flex items-center h-[42px] px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#3182F6]">
                {days}일
              </div>
            </div>
            <div>
              <label className={L}>시작일</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={I} />
            </div>
            <div>
              <label className={L}>종료일</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={I} />
            </div>
            <div className="sm:col-span-2">
              <label className={L}>사유</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="휴가 사유를 입력하세요"
                rows={3}
                className={I}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className={B2}>취소</button>
            <button onClick={submit} className={B}>신청하기</button>
          </div>
        </div>
      )}

      {/* Filter & List */}
      <div className={C}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">신청 내역</h3>
          <div className="flex gap-1">
            {([
              ["mine", "내 신청", 0],
              ["pending", "승인 대기", isManager ? pendingCount : 0],
              ["all", "전체", 0],
            ] as const).map(([k, label, badge]) => (
              <button
                key={k}
                onClick={() => setFilter(k as "mine" | "pending" | "all")}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filter === k ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {label}
                {badge > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">신청 내역이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${BADGE} text-[11px] bg-blue-50 text-blue-600`}>{r.type}</span>
                    <span className={`${BADGE} text-[11px] ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                    {r.approver && <span className="text-[11px] text-slate-400">결재: {displayName(r.approver)}</span>}
                  </div>
                  <p className="text-sm text-slate-700 font-medium">
                    {displayName(r.requester)} &middot; {r.startDate} ~ {r.endDate} ({r.days}일)
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.reason}</p>
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  {isManager && r.status === "대기" && r.requester !== userName && (
                    <>
                      <button onClick={() => updateStatus(r.id, "승인")} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors">
                        승인
                      </button>
                      <button onClick={() => updateStatus(r.id, "반려")} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors">
                        반려
                      </button>
                    </>
                  )}
                  {r.requester === userName && r.status === "대기" && (
                    <button onClick={() => cancelRequest(r.id)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold hover:bg-red-50 hover:text-red-600 transition-colors">
                      취소
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
