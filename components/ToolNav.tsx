"use client";

// components/ToolNav.tsx
// 도구 페이지 간 빠른 이동 네비게이션

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const TOOL_SECTIONS = [
  {
    section: "💰 재무·수익",
    tools: [
      { href: "/tools/menu-cost", emoji: "🧮", label: "메뉴 원가 계산기" },
      { href: "/tools/menu-cost/saved", emoji: "📋", label: "저장된 원가 현황" },
      { href: "/tools/labor", emoji: "👥", label: "인건비 스케줄러" },
      { href: "/tools/tax", emoji: "🧾", label: "세금 계산기" },
      { href: "/tools/pl-report", emoji: "📄", label: "손익계산서 PDF" },
    ],
  },
  {
    section: "🚀 창업·운영",
    tools: [
      { href: "/tools/startup-checklist", emoji: "✅", label: "창업 체크리스트" },
      { href: "/tools/area-analysis", emoji: "🗺️", label: "상권 분석 도우미" },
    ],
  },
  {
    section: "📣 마케팅",
    tools: [
      { href: "/tools/sns-content", emoji: "📱", label: "SNS 콘텐츠 생성기" },
      { href: "/tools/review-reply", emoji: "💬", label: "리뷰 답변 생성기" },
    ],
  },
];

export default function ToolNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentTool = TOOL_SECTIONS.flatMap(s => s.tools).find(t => t.href === pathname);

  return (
    <>
      {/* 모바일: 하단 플로팅 버튼 */}
      <div className="fixed bottom-24 left-4 z-40 md:hidden">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          도구 목록
        </button>

        {open && (
          <div className="absolute bottom-14 left-0 w-64 bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 p-3 space-y-3">
            {TOOL_SECTIONS.map(section => (
              <div key={section.section}>
                <p className="text-xs font-bold text-slate-400 px-2 mb-1">{section.section}</p>
                {section.tools.map(tool => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      pathname === tool.href
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-base">{tool.emoji}</span>
                    <span>{tool.label}</span>
                  </Link>
                ))}
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2">
              <Link href="/tools" onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-50 transition">
                ← 도구 목록으로
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 데스크탑: 좌측 사이드바 */}
      <aside className="hidden md:flex flex-col fixed left-4 top-1/2 -translate-y-1/2 z-40 w-52 bg-white rounded-3xl shadow-lg ring-1 ring-slate-200 p-3 space-y-3 max-h-[80vh] overflow-y-auto">
        <Link href="/tools"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-50 transition">
          ← 도구 목록
        </Link>

        {TOOL_SECTIONS.map(section => (
          <div key={section.section}>
            <p className="text-xs font-bold text-slate-400 px-2 mb-1">{section.section}</p>
            {section.tools.map(tool => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  pathname === tool.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm">{tool.emoji}</span>
                <span className="leading-tight">{tool.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </>
  );
}
