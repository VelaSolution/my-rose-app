"use client";

import { useState, useEffect } from "react";
import { TeamMember, HQRole } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE } from "@/app/hq/utils";

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

export default function TeamTab({ userId, userName, myRole, flash }: Props) {
  const [members, setMembers] = useState<TeamMemberExt[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [hqRole, setHqRole] = useState<HQRole>("팀원");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    load();
  }, []);

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
    flash("팀원이 추가되었습니다");
    setName("");
    setRole("");
    setEmail("");
    setHqRole("팀원");
    load();
  };

  const canApprove = myRole === "대표";

  const changeRole = async (id: string, newRole: HQRole) => {
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_team").update({ hq_role: newRole }).eq("id", id);
    if (error) { flash("변경 실패: " + error.message); return; }
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
    const s = sb();
    if (!s) return;
    await s.from("hq_team").delete().eq("id", id);
    flash("삭제되었습니다");
    load();
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
}
