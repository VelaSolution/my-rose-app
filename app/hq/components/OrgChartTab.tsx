"use client";

import { useState, useEffect } from "react";
import { TeamMember, HQRole } from "@/app/hq/types";
import { sb, C, BADGE } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const ROLE_ORDER: HQRole[] = ["대표", "이사", "팀장", "팀원"];
const ROLE_COLORS: Record<HQRole, string> = {
  "대표": "bg-[#3182F6] text-white",
  "이사": "bg-indigo-500 text-white",
  "팀장": "bg-emerald-500 text-white",
  "팀원": "bg-slate-400 text-white",
};
const ROLE_BADGE_COLORS: Record<HQRole, string> = {
  "대표": "bg-[#3182F6]/10 text-[#3182F6]",
  "이사": "bg-indigo-50 text-indigo-600",
  "팀장": "bg-emerald-50 text-emerald-600",
  "팀원": "bg-slate-100 text-slate-600",
};
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

type OrgNode = TeamMember & { children: OrgNode[]; teamName?: string };

// 대표실 → 이사 → 팀별(role 기준) 구조
function buildTree(members: TeamMember[]): OrgNode[] {
  const ceo = members.filter(m => m.hqRole === "대표");
  const directors = members.filter(m => m.hqRole === "이사");
  const leaders = members.filter(m => m.hqRole === "팀장");
  const staff = members.filter(m => m.hqRole === "팀원");

  // 팀 그룹핑: role(직책/팀명)을 기준으로 팀 구성
  // 팀장은 각자 자기 role이 팀명
  // 팀원은 같은 role의 팀장 아래로 배치
  const teams: Map<string, { leader?: TeamMember; members: TeamMember[] }> = new Map();

  // 팀장들로 팀 생성
  for (const l of leaders) {
    const teamName = l.role || "기타";
    if (!teams.has(teamName)) teams.set(teamName, { members: [] });
    teams.get(teamName)!.leader = l;
  }

  // 팀원들을 role이 같은 팀에 배치
  for (const s of staff) {
    const teamName = s.role || "기타";
    if (!teams.has(teamName)) teams.set(teamName, { members: [] });
    teams.get(teamName)!.members.push(s);
  }

  // 팀 노드 만들기
  const teamNodes: OrgNode[] = [...teams.entries()].map(([teamName, team]) => {
    const memberNodes: OrgNode[] = team.members.map(m => ({ ...m, children: [] }));
    if (team.leader) {
      return { ...team.leader, children: memberNodes, teamName };
    }
    // 팀장 없는 팀: 가상 노드
    return {
      id: `team-${teamName}`,
      name: teamName,
      role: teamName,
      email: "",
      status: "active" as const,
      hqRole: "팀장" as HQRole,
      children: memberNodes,
      teamName,
    };
  });

  // 이사 노드: 팀들을 이사에게 분배
  let directorNodes: OrgNode[];
  if (directors.length > 0) {
    directorNodes = directors.map((d, i) => {
      const chunkSize = Math.ceil(teamNodes.length / directors.length);
      const start = i * chunkSize;
      return { ...d, children: teamNodes.slice(start, start + chunkSize) };
    });
  } else {
    directorNodes = teamNodes; // 이사 없으면 바로 팀 연결
  }

  // 대표 노드: 최상위
  if (ceo.length > 0) {
    return ceo.map(c => ({ ...c, children: directorNodes, teamName: "대표실" }));
  }

  return directorNodes;
}

function PersonCard({ node, onSelect, selected }: { node: OrgNode; onSelect: (n: OrgNode) => void; selected: string | null }) {
  const isSelected = selected === node.id;
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => onSelect(node)}
        className={`${C} !p-4 min-w-[140px] max-w-[180px] cursor-pointer border-2 transition-all ${
          isSelected ? "!border-[#3182F6] shadow-lg shadow-blue-100" : "!border-transparent hover:!border-slate-300"
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${ROLE_COLORS[node.hqRole]}`}>
            {node.name[0]}
          </div>
          {/* Name + status */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${STATUS_DOT[node.status] || "bg-slate-300"}`} />
            <span className="text-sm font-bold text-slate-900">{node.name}</span>
          </div>
          {/* Role/Team */}
          <span className="text-xs text-slate-500">{node.role}</span>
          {/* HQ Role badge */}
          <span className={`${BADGE} text-[10px] ${ROLE_BADGE_COLORS[node.hqRole]}`}>{node.hqRole}</span>
          {/* Team label for leaders */}
          {node.teamName && node.hqRole === "팀장" && (
            <span className="text-[10px] text-slate-400 font-medium">{node.teamName}팀</span>
          )}
        </div>
      </button>
    </div>
  );
}

function OrgLevel({ nodes, onSelect, selected }: { nodes: OrgNode[]; onSelect: (n: OrgNode) => void; selected: string | null }) {
  if (nodes.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="flex items-start justify-center gap-6 flex-wrap">
        {nodes.map(node => (
          <div key={node.id} className="flex flex-col items-center">
            <PersonCard node={node} onSelect={onSelect} selected={selected} />
            {node.children.length > 0 && (
              <>
                {/* Vertical connector from parent */}
                <div className="w-0.5 h-6 bg-slate-200" />
                {/* Horizontal connector bar */}
                {node.children.length > 1 && (
                  <div className="relative w-full flex justify-center">
                    <div
                      className="h-0.5 bg-slate-200"
                      style={{
                        width: `${Math.max(0, (node.children.length - 1) * 170)}px`,
                      }}
                    />
                  </div>
                )}
                {/* Children */}
                <div className="flex items-start justify-center gap-6">
                  {node.children.map(child => (
                    <div key={child.id} className="flex flex-col items-center">
                      {/* Vertical connector to child */}
                      <div className="w-0.5 h-6 bg-slate-200" />
                      <PersonCard node={child} onSelect={onSelect} selected={selected} />
                      {child.children.length > 0 && (
                        <>
                          <div className="w-0.5 h-6 bg-slate-200" />
                          {child.children.length > 1 && (
                            <div className="relative w-full flex justify-center">
                              <div
                                className="h-0.5 bg-slate-200"
                                style={{
                                  width: `${Math.max(0, (child.children.length - 1) * 170)}px`,
                                }}
                              />
                            </div>
                          )}
                          <div className="flex items-start justify-center gap-6">
                            {child.children.map(gc => (
                              <div key={gc.id} className="flex flex-col items-center">
                                <div className="w-0.5 h-6 bg-slate-200" />
                                <PersonCard node={gc} onSelect={onSelect} selected={selected} />
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrgChartTab({ userId, userName, myRole, flash }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrgNode | null>(null);

  useEffect(() => {
    (async () => {
      const s = sb();
      if (!s) return setLoading(false);
      const { data } = await s
        .from("hq_team")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) {
        setMembers(
          data.map((r: any) => ({
            id: r.id,
            name: r.name,
            role: r.role,
            email: r.email,
            status: r.status || "offline",
            hqRole: r.hq_role || "팀원",
          }))
        );
      }
      setLoading(false);
    })();
  }, []);

  const tree = buildTree(members);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#3182F6] rounded-full animate-spin" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className={`${C} text-center py-16`}>
        <p className="text-slate-400 text-sm">등록된 팀원이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-2">
      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        {ROLE_ORDER.map(r => {
          const count = members.filter(m => m.hqRole === r).length;
          if (count === 0) return null;
          return (
            <div key={r} className={`${C} !p-3 flex items-center gap-2`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${ROLE_COLORS[r]}`}>
                {count}
              </div>
              <span className="text-sm font-semibold text-slate-700">{r}</span>
            </div>
          );
        })}
        <div className={`${C} !p-3 flex items-center gap-2`}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-600">
            {members.length}
          </div>
          <span className="text-sm font-semibold text-slate-700">전체</span>
        </div>
      </div>

      {/* Org Chart */}
      <div className={`${C} !p-6 overflow-x-auto`}>
        <div className="min-w-[600px]">
          <OrgLevel nodes={tree} onSelect={(n) => setSelected(selected?.id === n.id ? null : n)} selected={selected?.id ?? null} />
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className={`${C} !p-5`}>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${ROLE_COLORS[selected.hqRole]}`}>
              {selected.name[0]}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{selected.name}</h3>
                <span className={`${BADGE} ${ROLE_BADGE_COLORS[selected.hqRole]}`}>{selected.hqRole}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[selected.status] || "bg-slate-300"}`} />
                  <span className="text-xs text-slate-500">{STATUS_LABEL[selected.status] || "오프라인"}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-slate-400 text-xs font-semibold">직책/역할</span>
                  <p className="text-slate-700 font-medium">{selected.role || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold">이메일</span>
                  <p className="text-slate-700 font-medium">{selected.email || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold">상태</span>
                  <p className="text-slate-700 font-medium">{STATUS_LABEL[selected.status] || "오프라인"}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-slate-600 transition text-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
