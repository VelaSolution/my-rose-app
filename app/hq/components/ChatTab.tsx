"use client";
import { useState, useEffect } from "react";
import { HQRole } from "@/app/hq/types";
import { sb, C } from "@/app/hq/utils";
import { TeamMemberSimple } from "@/app/hq/components/chat/chatHelpers";
import TeamChat from "@/app/hq/components/chat/TeamChat";
import DmChat from "@/app/hq/components/chat/DmChat";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

export default function ChatTab({ userId, userName, myRole, flash }: Props) {
  const [mode, setMode] = useState<"team" | "dm">("team");
  const [allMembers, setAllMembers] = useState<TeamMemberSimple[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberSimple[]>([]);

  useEffect(() => {
    (async () => {
      const s = sb();
      if (!s) return;
      const { data } = await s.from("hq_team").select("id, name").neq("approved", false);
      if (data) {
        const members = data as TeamMemberSimple[];
        setAllMembers(members);
        setTeamMembers(members.filter(m => m.name !== userName));
      }
    })();
  }, [userName]);

  return (
    <div className={`${C} flex flex-col`} style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      {/* Mode tabs */}
      <div className="flex items-center gap-1 mb-4 flex-shrink-0">
        <button
          onClick={() => setMode("team")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === "team" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          팀 채팅
        </button>
        <button
          onClick={() => setMode("dm")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === "dm" ? "bg-[#3182F6] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          개별 채팅
        </button>
      </div>

      {mode === "team" && (
        <TeamChat userName={userName} allMembers={allMembers} flash={flash} />
      )}

      {mode === "dm" && (
        <DmChat userName={userName} teamMembers={teamMembers} flash={flash} />
      )}
    </div>
  );
}
