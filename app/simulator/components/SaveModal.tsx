"use client";

import React, { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  getSaveSlots,
  deleteSaveSlot,
  type SaveSlot,
} from "@/lib/storage";
import { fmt, type FullForm } from "@/lib/vela";

export function SaveModal({
  onLoad,
  onClose,
}: {
  onLoad: (form: FullForm) => void;
  onClose: () => void;
}) {
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [cloudSaves, setCloudSaves] = useState<{id:string;label:string;form:FullForm;created_at:string}[]>([]);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [tab, setTab] = useState<"local"|"cloud">("cloud");

  useEffect(() => { setSaves(getSaveSlots() as SaveSlot[]); }, []);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(async ({ data: { user } }: { data: { user: { id: string; email?: string } | null } }) => {
      if (!user) { setCloudLoading(false); return; }
      const { data } = await sb
        .from("simulation_history")
        .select("id, label, created_at, form")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setCloudSaves((data ?? []) as {id:string;label:string;form:FullForm;created_at:string}[]);
      setCloudLoading(false);
    });
  }, []);

  const industryLabel: Record<string, string> = {
    cafe: "☕ 카페", restaurant: "🍽️ 음식점", bar: "🍺 바", finedining: "✨ 파인다이닝", gogi: "🥩 고깃집",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">저장된 값 불러오기</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-3 border-b border-slate-100">
          <button onClick={() => setTab("cloud")} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab==="cloud"?"bg-slate-900 text-white":"text-slate-500 hover:bg-slate-50"}`}>
            ☁️ 클라우드 ({cloudSaves.length})
          </button>
          <button onClick={() => setTab("local")} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab==="local"?"bg-slate-900 text-white":"text-slate-500 hover:bg-slate-50"}`}>
            💾 로컬 ({saves.length})
          </button>
        </div>

        {/* 클라우드 탭 */}
        {tab === "cloud" && (
          cloudLoading ? (
            <div className="px-6 py-12 text-center"><p className="text-slate-400 text-sm">불러오는 중...</p></div>
          ) : cloudSaves.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-3xl mb-3">☁️</p>
              <p className="text-sm text-slate-400">클라우드에 저장된 값이 없습니다.</p>
              <p className="text-xs text-slate-300 mt-1">결과 페이지에서 '☁️ 클라우드 저장'을 눌러보세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {cloudSaves.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {industryLabel[s.form?.industry] ?? s.form?.industry}
                      &nbsp;·&nbsp;{new Date(s.created_at).toLocaleString("ko-KR", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                    </p>
                  </div>
                  <button
                    onClick={() => { if(s.form) { onLoad(s.form); onClose(); } }}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 flex-shrink-0"
                  >
                    불러오기
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {/* 로컬 탭 */}
        {tab === "local" && (
          saves.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-sm text-slate-400">저장된 값이 없습니다.</p>
              <p className="text-xs text-slate-300 mt-1">'현재 값 저장' 버튼으로 저장해보세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {saves.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {industryLabel[s.form.industry as string] ?? s.form.industry}
                      &nbsp;·&nbsp; 좌석 {s.form.seats as number}석
                      &nbsp;·&nbsp; 객단가 {fmt(s.form.avgSpend as number)}원
                    </p>
                  </div>
                  <button
                    onClick={() => { onLoad(s.form as unknown as FullForm); onClose(); }}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 flex-shrink-0"
                  >
                    불러오기
                  </button>
                  <button
                    onClick={() => { deleteSaveSlot(s.id); setSaves(getSaveSlots() as SaveSlot[]); }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 flex-shrink-0"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        <div className="border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
