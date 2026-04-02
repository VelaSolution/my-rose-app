"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export type Plan = "free" | "standard" | "pro";

export function usePlan(): { plan: Plan; userId: string | null; loading: boolean } {
  const [plan, setPlan] = useState<Plan>("free");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      sb.from("payments").select("plan").eq("user_id", user.id).eq("status", "done")
        .order("created_at", { ascending: false }).limit(1)
        .then(({ data }: { data: { plan: string }[] | null }) => {
          if (data && data.length > 0) setPlan(data[0].plan as Plan);
          setLoading(false);
        });
    });
  }, []);

  return { plan, userId, loading };
}
