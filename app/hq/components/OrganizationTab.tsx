"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { HQRole } from "@/app/hq/types";

const ContactsTab = dynamic(() => import("./ContactsTab"));
const OrgChartTab = dynamic(() => import("./OrgChartTab"));

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

export default function OrganizationTab({ userId, userName, myRole, flash }: Props) {
  const [sub, setSub] = useState<"contacts" | "orgchart">("contacts");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">조직</h2>
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button onClick={() => setSub("contacts")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "contacts" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            주소록
          </button>
          <button onClick={() => setSub("orgchart")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "orgchart" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            조직도
          </button>
        </div>
      </div>
      {sub === "contacts" && <ContactsTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
      {sub === "orgchart" && <OrgChartTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
    </div>
  );
}
