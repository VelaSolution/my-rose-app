"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { HQRole } from "@/app/hq/types";

const BookingTab = dynamic(() => import("./BookingTab"));
const AssetTab = dynamic(() => import("./AssetTab"));

interface Props { userId: string; userName: string; myRole: HQRole; flash: (m: string) => void }

export default function ResourceTab({ userId, userName, myRole, flash }: Props) {
  const [sub, setSub] = useState<"booking" | "asset">("booking");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">자원관리</h2>
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button onClick={() => setSub("booking")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "booking" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            예약
          </button>
          <button onClick={() => setSub("asset")}
            className={`px-4 py-2 text-[14px] font-semibold rounded-xl transition-all ${
              sub === "asset" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}>
            자산
          </button>
        </div>
      </div>
      {sub === "booking" && <BookingTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
      {sub === "asset" && <AssetTab userId={userId} userName={userName} myRole={myRole} flash={flash} />}
    </div>
  );
}
