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

// ── Tailwind 스타일 상수 (Vela 디자인 시스템) ──
// 라벨 = 입력 = 버튼 모두 13px(text-[13px])으로 통일
export const I = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 outline-none transition-all placeholder:text-slate-300";
export const C = "bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200";
export const L = "block text-[13px] font-semibold text-slate-600 mb-1";
export const B = "rounded-lg bg-[#3182F6] text-white font-semibold px-4 py-2 text-[13px] hover:bg-[#2672DE] active:scale-[0.97] transition-all shadow-sm shadow-[#3182F6]/20";
export const B2 = "rounded-lg bg-slate-100 text-slate-700 font-semibold px-3.5 py-1.5 text-[13px] hover:bg-slate-200 active:scale-[0.97] transition-all";
export const BADGE = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold";
