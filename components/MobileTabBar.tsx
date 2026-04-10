"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const TABS = [
  { href: "/", icon: "🏠", label: "홈" },
  { href: "/simulator", icon: "📊", label: "시뮬레이터" },
  { href: "/tools", icon: "🛠️", label: "도구" },
  { href: "/dashboard", icon: "📈", label: "대시보드" },
  { href: "/profile", icon: "👤", label: "내 정보" },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [isHqMember, setIsHqMember] = useState(false);

  if (pathname?.startsWith("/hq")) return null;

  useEffect(() => {
    (async () => {
      try {
        const sb = createSupabaseBrowserClient();
        if (!sb) return;
        const { data: { user } } = await sb.auth.getUser();
        if (!user?.email) return;

        const adminEmails = ["mnhyuk@velaanalytics.com", "mnhyuk0213@gmail.com"];
        if (adminEmails.includes(user.email)) { setIsHqMember(true); return; }

        const { data: td } = await sb.from("hq_team").select("email, approved");
        if (td) {
          const email = user.email.trim().toLowerCase();
          const found = td.find((t: any) => (t.email ?? "").trim().toLowerCase() === email && t.approved !== false);
          if (found) setIsHqMember(true);
        }
      } catch {}
    })();
  }, []);

  if (pathname.startsWith("/game")) return null;
  if (pathname.startsWith("/login")) return null;
  if (pathname.startsWith("/signup")) return null;
  if (pathname.startsWith("/reset-password")) return null;
  if (pathname.startsWith("/hq")) return null;

  const tabs = isHqMember
    ? [...TABS.slice(0, 3), { href: "/hq", icon: "🏛️", label: "HQ" }, ...TABS.slice(3)]
    : TABS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden vela-mobile-tab" style={{ paddingBottom: "env(safe-area-inset-bottom)", background: "#fff", borderTop: "1px solid #E5E8EB" }}>
      <div style={{ display: "flex", height: 50 }}>
        {tabs.map(tab => {
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: isActive ? "#3182F6" : "#9EA6B3",
                gap: 2,
                minHeight: "auto",
                fontSize: "inherit",
                fontWeight: "inherit",
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
