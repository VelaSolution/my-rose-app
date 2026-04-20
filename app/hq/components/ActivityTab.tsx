"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { HQRole } from "@/app/hq/types";

const TimelineTab = dynamic(() => import("./TimelineTab"));
const AuditLog = dynamic(() => import("./AuditLog"));

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

export default function ActivityTab({ userId, userName, myRole, flash }: Props) {
  const [sub, setSub] = useState<"timeline" | "audit">("timeline");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">활동로그</h2>
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button onClick={() => setSub("timeline")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "timeline" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            타임라인
          </button>
          <button onClick={() => setSub("audit")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "audit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            감사로그
          </button>
        </div>
      </div>
      {sub === "timeline" && <TimelineTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
      {sub === "audit" && <AuditLog userId={userId} userName={userName} myRole={myRole} flash={flash} />}
    </div>
  );
}
