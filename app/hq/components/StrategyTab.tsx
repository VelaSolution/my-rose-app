"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { HQRole } from "@/app/hq/types";

const MettTab = dynamic(() => import("./MettTab"));
const AarTab = dynamic(() => import("./AarTab"));

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

export default function StrategyTab({ userId, userName, myRole, flash }: Props) {
  const [sub, setSub] = useState<"mett" | "aar">("mett");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">전략분석</h2>
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button onClick={() => setSub("mett")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "mett" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            상황판단
          </button>
          <button onClick={() => setSub("aar")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "aar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            AAR
          </button>
        </div>
      </div>
      {sub === "mett" && <MettTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
      {sub === "aar" && <AarTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
    </div>
  );
}
