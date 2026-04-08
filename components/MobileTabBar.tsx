"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", icon: "🏠", label: "홈" },
  { href: "/simulator", icon: "📊", label: "시뮬레이터" },
  { href: "/tools", icon: "🛠️", label: "도구" },
  { href: "/dashboard", icon: "📈", label: "대시보드" },
  { href: "/profile", icon: "👤", label: "내 정보" },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  if (pathname.startsWith("/game")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden vela-mobile-tab" style={{ paddingBottom: "env(safe-area-inset-bottom)", background: "#fff", borderTop: "1px solid #E5E8EB" }}>
      <div style={{ display: "flex", height: 50 }}>
        {TABS.map(tab => {
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
              <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
