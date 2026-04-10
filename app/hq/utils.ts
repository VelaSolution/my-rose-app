import { useState, useEffect, useContext, createContext, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
export { ST, REPORT_ST } from "./types";

// ── Supabase 헬퍼 ──────────────────────────────────────
export const sb = () => { try { return createSupabaseBrowserClient(); } catch { return null; } };

// ── 팀원 표시명 Context (한번만 로드, 전체 공유) ──────
export type TeamInfo = { name: string; role: string; hq_role: string };
type TeamDisplayCtx = { displayName: (name: string) => string; teamMap: Record<string, { role: string; hqRole: string }> };

const fallbackDisplayName = (name: string) => name;
const TeamDisplayContext = createContext<TeamDisplayCtx>({ displayName: fallbackDisplayName, teamMap: {} });

export function TeamDisplayProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<Record<string, { role: string; hqRole: string }>>({});

  useEffect(() => {
    (async () => {
      const s = sb();
      if (!s) return;
      const { data } = await s.from("hq_team").select("name, role, hq_role").neq("approved", false);
      if (data) {
        const m: Record<string, { role: string; hqRole: string }> = {};
        for (const t of data as TeamInfo[]) {
          if (t.name) m[t.name] = { role: t.role || "", hqRole: t.hq_role || "" };
        }
        setMap(m);
      }
    })();
  }, []);

  const displayName = useCallback((name: string) => {
    const info = map[name];
    if (!info) return name;
    const parts = [info.role, info.hqRole, name].filter(Boolean);
    return parts.join(" ");
  }, [map]);

  return <TeamDisplayContext value={{ displayName, teamMap: map }}>{children}</TeamDisplayContext>;
}

export function useTeamDisplayNames() {
  return useContext(TeamDisplayContext);
}

// ── 포맷팅 ─────────────────────────────────────────────
export const fmt = (n: number) => n.toLocaleString("ko-KR");
export const today = () => new Date().toISOString().slice(0, 10);
export const toKR = (d: string | Date) => new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

// ── Tailwind 스타일 상수 (Vela 디자인 시스템) ──────────
export const I = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all";
export const C = "bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow";
export const L = "block text-xs font-semibold text-slate-500 mb-1.5";
export const B = "rounded-xl bg-[#3182F6] text-white font-semibold px-5 py-2.5 text-sm hover:bg-[#2672DE] active:scale-[0.98] transition-all";
export const B2 = "rounded-xl bg-slate-100 text-slate-700 font-semibold px-4 py-2 text-sm hover:bg-slate-200 transition-all";
export const BADGE = "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold";
