"use client";

import { useState, useEffect, useMemo } from "react";
import { TeamMember, HQRole } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE, fmt } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const ROLES: HQRole[] = ["팀원", "팀장", "이사", "대표"];
type TeamMemberExt = TeamMember & { approved?: boolean };
const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-slate-300",
};
const STATUS_LABEL: Record<string, string> = {
  active: "활동중",
  away: "자리비움",
  offline: "오프라인",
};

/* ── 인사 발령 타입 ── */
type ChangeType = "입사" | "퇴사" | "승진" | "부서이동" | "직책변경";
const CHANGE_TYPES: ChangeType[] = ["입사", "퇴사", "승진", "부서이동", "직책변경"];
const CHANGE_COLORS: Record<ChangeType, string> = {
  "입사": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "퇴사": "bg-red-50 text-red-700 border-red-200",
  "승진": "bg-amber-50 text-amber-700 border-amber-200",
  "부서이동": "bg-blue-50 text-blue-700 border-blue-200",
  "직책변경": "bg-purple-50 text-purple-700 border-purple-200",
};
const CHANGE_ICONS: Record<ChangeType, string> = {
  "입사": "🟢",
  "퇴사": "🔴",
  "승진": "⬆️",
  "부서이동": "🔄",
  "직책변경": "📋",
};

interface PersonnelHistory {
  id: string;
  user_name: string;
  change_type: ChangeType;
  from_value: string;
  to_value: string;
  effective_date: string;
  note: string;
  created_by: string;
  created_at: string;
}

export default function TeamTab({ userId, userName, myRole, flash }: Props) {
  const [members, setMembers] = useState<TeamMemberExt[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [hqRole, setHqRole] = useState<HQRole>("팀원");
  const [loading, setLoading] = useState(true);

  /* ── 인사 발령 이력 state ── */
  const [subTab, setSubTab] = useState<"members" | "history">("members");
  const [historyList, setHistoryList] = useState<PersonnelHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilterMember, setHistoryFilterMember] = useState("");
  const [historyFilterType, setHistoryFilterType] = useState<ChangeType | "">("");

  // 발령 등록 폼
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [hfMember, setHfMember] = useState("");
  const [hfType, setHfType] = useState<ChangeType>("입사");
  const [hfFrom, setHfFrom] = useState("");
  const [hfTo, setHfTo] = useState("");
  const [hfDate, setHfDate] = useState(today());
  const [hfNote, setHfNote] = useState("");
  const [hfSaving, setHfSaving] = useState(false);

  const load = async () => {
    const s = sb();
    if (!s) return setLoading(false);
    const { data } = await s
      .from("hq_team")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      const ROLE_RANK: Record<string, number> = { "대표": 0, "이사": 1, "팀장": 2, "팀원": 3 };
      const mapped: TeamMemberExt[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        email: r.email,
        status: r.status || "offline",
        hqRole: (r.hq_role || "팀원") as HQRole,
        approved: r.approved ?? true,
      }));
      mapped.sort((a, b) => (ROLE_RANK[a.hqRole] ?? 9) - (ROLE_RANK[b.hqRole] ?? 9));
      setMembers(mapped);
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const s = sb();
    if (!s) { setHistoryLoading(false); return; }
    try {
      const { data, error } = await s
        .from("hq_personnel_history")
        .select("*")
        .order("effective_date", { ascending: false });
      if (error) throw error;
      setHistoryList((data ?? []) as PersonnelHistory[]);
    } catch (e) {
      console.error("loadHistory error:", e);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (subTab === "history") loadHistory();
  }, [subTab]);

  const add = async () => {
    if (!name.trim()) return flash("이름을 입력하세요");
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_team").insert({
      name: name.trim(),
      role: role.trim(),
      email: email.trim(),
      hq_role: hqRole,
      status: "offline",
      approved: false,
    });
    if (error) return flash("저장 실패: " + error.message);
    // 입사 이력 자동 기록
    await logPersonnelChange(name.trim(), "입사", "", hqRole, today(), `${role.trim()} 입사`, userName);
    flash("팀원이 추가되었습니다");
    setName("");
    setRole("");
    setEmail("");
    setHqRole("팀원");
    load();
  };

  const canApprove = myRole === "대표";
  const isAdmin = myRole === "대표" || myRole === "이사";

  /* ── 인사 발령 자동 기록 헬퍼 ── */
  const logPersonnelChange = async (
    memberName: string, changeType: ChangeType,
    fromVal: string, toVal: string,
    effectiveDate: string, note: string, createdBy: string,
  ) => {
    const s = sb();
    if (!s) return;
    try {
      await s.from("hq_personnel_history").insert({
        user_name: memberName,
        change_type: changeType,
        from_value: fromVal,
        to_value: toVal,
        effective_date: effectiveDate,
        note: note,
        created_by: createdBy,
      });
    } catch (e) {
      console.error("logPersonnelChange error:", e);
    }
  };

  const changeRole = async (id: string, newRole: HQRole) => {
    const s = sb();
    if (!s) return;
    const member = members.find(m => m.id === id);
    const oldRole = member?.hqRole || "";
    const { error } = await s.from("hq_team").update({ hq_role: newRole }).eq("id", id);
    if (error) { flash("변경 실패: " + error.message); return; }
    // 직책 변경 자동 기록
    if (member) {
      const changeType: ChangeType = ROLES.indexOf(newRole) < ROLES.indexOf(oldRole as HQRole) ? "승진" : "직책변경";
      await logPersonnelChange(member.name, changeType, oldRole, newRole, today(), `${oldRole} → ${newRole}`, userName);
    }
    flash(`권한이 "${newRole}"으로 변경되었습니다`);
    load();
  };

  const toggleApproval = async (id: string, approved: boolean) => {
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_team").update({ approved }).eq("id", id);
    if (error) { flash("변경 실패: " + error.message); return; }
    flash(approved ? "승인 완료" : "승인 취소됨");
    load();
  };

  const toggleStatus = async (m: TeamMember) => {
    const order: TeamMember["status"][] = ["active", "away", "offline"];
    const next = order[(order.indexOf(m.status) + 1) % 3];
    const s = sb();
    if (!s) return;
    await s.from("hq_team").update({ status: next }).eq("id", m.id);
    setMembers((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, status: next } : x))
    );
  };

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const s = sb();
    if (!s) return;
    const member = members.find(m => m.id === id);
    await s.from("hq_team").delete().eq("id", id);
    // 퇴사 이력 자동 기록
    if (member) {
      await logPersonnelChange(member.name, "퇴사", member.hqRole, "", today(), "팀원 삭제", userName);
    }
    flash("삭제되었습니다");
    load();
  };

  /* ── 발령 등록 (수동) ── */
  const submitHistory = async () => {
    if (!hfMember) return flash("대상 팀원을 선택하세요");
    if (!hfDate) return flash("발령일을 입력하세요");
    setHfSaving(true);
    try {
      await logPersonnelChange(hfMember, hfType, hfFrom.trim(), hfTo.trim(), hfDate, hfNote.trim(), userName);
      flash("발령이 등록되었습니다");
      setHfMember("");
      setHfType("입사");
      setHfFrom("");
      setHfTo("");
      setHfDate(today());
      setHfNote("");
      setShowHistoryForm(false);
      loadHistory();
    } catch (e) {
      flash("발령 등록 실패");
      console.error(e);
    }
    setHfSaving(false);
  };

  /* ── 필터된 이력 ── */
  const filteredHistory = useMemo(() => {
    let list = historyList;
    if (historyFilterMember) list = list.filter(h => h.user_name === historyFilterMember);
    if (historyFilterType) list = list.filter(h => h.change_type === historyFilterType);
    return list;
  }, [historyList, historyFilterMember, historyFilterType]);

  /* ── 이력 멤버 목록 (필터용) ── */
  const historyMembers = useMemo(() => {
    return [...new Set(historyList.map(h => h.user_name))].sort();
  }, [historyList]);

  return (
    <div className="space-y-6">
      {/* ── 서브탭 ── */}
      <div className="flex gap-2">
        <button
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            subTab === "members"
              ? "bg-[#3182F6] text-white shadow-sm shadow-[#3182F6]/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          onClick={() => setSubTab("members")}
        >
          팀원 관리
        </button>
        <button
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            subTab === "history"
              ? "bg-[#3182F6] text-white shadow-sm shadow-[#3182F6]/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          onClick={() => setSubTab("history")}
        >
          인사 발령 이력
        </button>
      </div>

      {subTab === "members" ? (
        <>
          {/* Add form */}
          <div className={C}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">팀원 추가</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={L}>이름</label>
                <input
                  className={I}
                  placeholder="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className={L}>직무</label>
                <input
                  className={I}
                  placeholder="직무/역할"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div>
                <label className={L}>이메일</label>
                <input
                  className={I}
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className={L}>HQ 권한</label>
                <select
                  className={I}
                  value={hqRole}
                  onChange={(e) => setHqRole(e.target.value as HQRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className={`${B} mt-4`} onClick={add}>
              추가
            </button>
          </div>

          {/* Member list */}
          <div className={C}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              팀원 목록{" "}
              <span className="text-sm font-normal text-slate-400">
                ({members.length}명)
              </span>
            </h3>
            {loading ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                불러오는 중...
              </p>
            ) : members.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                등록된 팀원이 없습니다
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleStatus(m)}
                        title={`상태: ${STATUS_LABEL[m.status]} (클릭하여 변경)`}
                        className="flex-shrink-0"
                      >
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOT[m.status]} ring-2 ring-white`}
                        />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">
                            {m.name}
                          </span>
                          {canApprove ? (
                            <select
                              value={m.hqRole}
                              onChange={e => changeRole(m.id, e.target.value as HQRole)}
                              className={`${BADGE} bg-blue-50 text-blue-600 border-0 cursor-pointer text-xs font-semibold rounded-lg`}
                            >
                              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          ) : (
                            <span className={`${BADGE} bg-blue-50 text-blue-600`}>{m.hqRole}</span>
                          )}
                          {m.approved === false && (
                            <span className={`${BADGE} bg-amber-50 text-amber-600 text-[10px]`}>승인대기</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {m.role && `${m.role} · `}
                          {m.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canApprove && m.approved === false && (
                        <button onClick={() => toggleApproval(m.id, true)}
                          className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition">
                          승인
                        </button>
                      )}
                      {canApprove && m.approved !== false && (
                        <button onClick={() => toggleApproval(m.id, false)}
                          className="text-xs text-slate-300 hover:text-amber-600 transition-colors px-2 py-1 opacity-0 group-hover:opacity-100">
                          승인취소
                        </button>
                      )}
                      <button onClick={() => remove(m.id)}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1">
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── 인사 발령 이력 탭 ── */
        <>
          {/* 발령 등록 버튼 (대표/이사만) */}
          {isAdmin && (
            <div className={C}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">발령 등록</h3>
                <button
                  className={showHistoryForm ? B2 : B}
                  onClick={() => setShowHistoryForm(!showHistoryForm)}
                >
                  {showHistoryForm ? "접기" : "새 발령 등록"}
                </button>
              </div>

              {showHistoryForm && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className={L}>대상 팀원</label>
                      <select className={I} value={hfMember} onChange={e => setHfMember(e.target.value)}>
                        <option value="">선택하세요</option>
                        {members.map(m => (
                          <option key={m.id} value={m.name}>{m.name} ({m.hqRole})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={L}>변경 유형</label>
                      <select className={I} value={hfType} onChange={e => setHfType(e.target.value as ChangeType)}>
                        {CHANGE_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={L}>발령일</label>
                      <input type="date" className={I} value={hfDate} onChange={e => setHfDate(e.target.value)} />
                    </div>
                    <div>
                      <label className={L}>변경 전 (From)</label>
                      <input className={I} placeholder="이전 값" value={hfFrom} onChange={e => setHfFrom(e.target.value)} />
                    </div>
                    <div>
                      <label className={L}>변경 후 (To)</label>
                      <input className={I} placeholder="변경 값" value={hfTo} onChange={e => setHfTo(e.target.value)} />
                    </div>
                    <div>
                      <label className={L}>메모</label>
                      <input className={I} placeholder="비고/사유" value={hfNote} onChange={e => setHfNote(e.target.value)} />
                    </div>
                  </div>
                  <button className={B} onClick={submitHistory} disabled={hfSaving}>
                    {hfSaving ? "등록 중..." : "발령 등록"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 필터 */}
          <div className={C}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                className={`${I} !w-auto min-w-[140px]`}
                value={historyFilterMember}
                onChange={e => setHistoryFilterMember(e.target.value)}
              >
                <option value="">전체 팀원</option>
                {historyMembers.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <select
                className={`${I} !w-auto min-w-[140px]`}
                value={historyFilterType}
                onChange={e => setHistoryFilterType(e.target.value as ChangeType | "")}
              >
                <option value="">전체 유형</option>
                {CHANGE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="flex-1" />
              <span className="text-sm text-slate-400">
                총 {filteredHistory.length}건
              </span>
            </div>
          </div>

          {/* 타임라인 뷰 */}
          <div className={C}>
            <h3 className="text-lg font-bold text-slate-800 mb-6">인사 발령 타임라인</h3>
            {historyLoading ? (
              <p className="text-sm text-slate-400 py-8 text-center">불러오는 중...</p>
            ) : filteredHistory.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">인사 발령 이력이 없습니다</p>
            ) : (
              <div className="relative">
                {/* 세로 타임라인 선 */}
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200" />

                <div className="space-y-0">
                  {(() => {
                    let lastDate = "";
                    return filteredHistory.map((h, idx) => {
                      const showDate = h.effective_date !== lastDate;
                      lastDate = h.effective_date;
                      return (
                        <div key={h.id}>
                          {/* 날짜 라벨 */}
                          {showDate && (
                            <div className="flex items-center gap-3 mb-3 mt-2">
                              <div className="w-10 h-10 rounded-full bg-[#3182F6] flex items-center justify-center z-10 relative">
                                <span className="text-white text-xs font-bold">
                                  {new Date(h.effective_date).getDate()}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-slate-700">
                                {new Date(h.effective_date).toLocaleDateString("ko-KR", {
                                  year: "numeric", month: "long", day: "numeric",
                                })}
                              </span>
                            </div>
                          )}

                          {/* 이력 항목 */}
                          <div className="flex items-start gap-3 ml-0 pl-14 pb-4 relative">
                            {/* 타임라인 노드 */}
                            <div className="absolute left-[15px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-300 z-10" />

                            <div className="flex-1 bg-slate-50/80 rounded-xl px-4 py-3 border border-slate-100 hover:border-slate-200 transition-colors">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-base">{CHANGE_ICONS[h.change_type]}</span>
                                <span className="font-bold text-sm text-slate-800">{h.user_name}</span>
                                <span className={`${BADGE} border ${CHANGE_COLORS[h.change_type]}`}>
                                  {h.change_type}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 space-y-0.5">
                                {(h.from_value || h.to_value) && (
                                  <p>
                                    {h.from_value && (
                                      <span className="text-slate-400 line-through mr-1">{h.from_value}</span>
                                    )}
                                    {h.from_value && h.to_value && <span className="text-slate-300 mx-1">→</span>}
                                    {h.to_value && (
                                      <span className="font-semibold text-slate-700">{h.to_value}</span>
                                    )}
                                  </p>
                                )}
                                {h.note && <p className="text-slate-400">{h.note}</p>}
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-300">
                                <span>등록: {h.created_by}</span>
                                {h.created_at && (
                                  <span>{new Date(h.created_at).toLocaleDateString("ko-KR")}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
