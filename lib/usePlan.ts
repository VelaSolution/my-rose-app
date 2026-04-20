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
    sb.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      sb.from("profiles").select("plan, plan_expires_at").eq("id", user.id).single()
        .then(({ data: profile }: { data: { plan: string; plan_expires_at: string | null } | null }) => {
          if (!profile) { setLoading(false); return; }

          const profilePlan = profile.plan ?? "free";
          const expiresAt = profile.plan_expires_at;

          // 만료일이 있고 과거이면 → free
          if (expiresAt && new Date(expiresAt) < new Date()) {
            setPlan("free");
          } else {
            setPlan(profilePlan as Plan);
          }

          setLoading(false);
        });
    });
  }, []);

  return { plan, userId, loading };
}
