"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export type Plan = "free" | "standard";

export function usePlan(): { plan: Plan; userId: string | null; loading: boolean } {
  const [plan, setPlan] = useState<Plan>("free");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(async ({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: profile } = await sb.from("profiles").select("plan, plan_expires_at").eq("id", user.id).single();
      if (!profile) { setLoading(false); return; }

      const profilePlan = (profile as any).plan ?? "free";
      const expiresAt = (profile as any).plan_expires_at;

      // 만료일이 있고 과거이면 → free
      if (expiresAt && new Date(expiresAt) < new Date()) {
        setPlan("free");
        // 서버에도 반영 (클라이언트에서 감지한 만료)
        sb.from("profiles").update({ plan: "free", plan_expires_at: null }).eq("id", user.id).then(() => {});
      } else {
        setPlan(profilePlan as Plan);
      }

      setLoading(false);
    });
  }, []);

  return { plan, userId, loading };
}
