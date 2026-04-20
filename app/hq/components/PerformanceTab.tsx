"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { HQRole } from "@/app/hq/types";

const KpiTab = dynamic(() => import("./KpiTab"));
const GoalTab = dynamic(() => import("./GoalTab"));

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

export default function PerformanceTab({ userId, userName, myRole, flash }: Props) {
  const [sub, setSub] = useState<"kpi" | "goal">("kpi");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">성과관리</h2>
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button onClick={() => setSub("kpi")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "kpi" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            KPI
          </button>
          <button onClick={() => setSub("goal")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "goal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            목표
          </button>
        </div>
      </div>
      {sub === "kpi" && <KpiTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
      {sub === "goal" && <GoalTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
    </div>
  );
}
