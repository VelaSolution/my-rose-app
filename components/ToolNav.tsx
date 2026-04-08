"use client";

// components/ToolNav.tsx
// 도구 페이지 간 빠른 이동 네비게이션

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { t, getLocale } from "@/lib/i18n";

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
      { href: "/tools/business-plan", emoji: "📝", label: "사업계획서 도우미", i18nKey: "businessPlan" },
      { href: "/tools/gov-support", emoji: "🏛️", label: "정부 지원사업", i18nKey: "govSupport" },
      { href: "/tools/incorporation", emoji: "🏢", label: "법인 설립 가이드", i18nKey: "incorporation" },
      { href: "/tools/financial-sim", emoji: "📈", label: "재무 시뮬레이션", i18nKey: "financialSim" },
      { href: "/tools/fundraising", emoji: "💎", label: "투자 유치 도구", i18nKey: "fundraising" },
      { href: "/tools/tax-guide", emoji: "🧾", label: "세무·회계 가이드", i18nKey: "taxGuide" },
      { href: "/tools/hiring", emoji: "👥", label: "인력 채용 도구", i18nKey: "hiring" },
    ],
  },
  {
    section: "📣 마케팅",
    tools: [
      { href: "/tools/sns-content", emoji: "📱", label: "SNS 콘텐츠 생성기" },
      { href: "/tools/review-reply", emoji: "💬", label: "리뷰 답변 생성기" },
      { href: "/tools/delivery-menu", emoji: "🛵", label: "배달앱 메뉴 최적화" },
      { href: "/tools/promo-generator", emoji: "📣", label: "프로모션 문구 생성기" },
      { href: "/tools/naver-place", emoji: "🟢", label: "네이버 플레이스 최적화" },
    ],
  },
];

const MOBILE_TABS = [
  { href: "/tools/menu-cost", emoji: "🧮", label: "메뉴 원가" },
  { href: "/tools/labor", emoji: "👥", label: "인건비" },
  { href: "/tools/tax", emoji: "🧾", label: "세금" },
  { href: "/tools", emoji: "🛠️", label: "도구목록" },
];

const toolLabel = (tool: { label: string; i18nKey?: string }, locale?: Parameters<typeof t>[1]) =>
  tool.i18nKey ? t(`tool.${tool.i18nKey}.title`, locale) : tool.label;

export default function ToolNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const locale = typeof window !== "undefined" ? getLocale() : "ko";

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close panel on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 모바일: 고정 하단 탭 바 */}
      <nav role="navigation" aria-label="도구 네비게이션" className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-14">
          {MOBILE_TABS.map(tab => {
            const isActive = tab.href === "/tools"
              ? pathname === "/tools"
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}
              >
                <span className="text-lg leading-none">{tab.emoji}</span>
                <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
              </Link>
            );
          })}
          {/* 더보기 버튼 */}
          <button
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              open ? "text-blue-600" : "text-slate-400"
            }`}
          >
            <span className="text-lg leading-none">⋯</span>
            <span className="text-[10px] mt-0.5 font-medium">더보기</span>
          </button>
        </div>
        <div className="pb-[env(safe-area-inset-bottom)]" />

        {/* 더보기 패널: 하단에서 슬라이드 업 */}
        {open && (
          <>
            {/* 배경 오버레이 */}
            <div className="fixed inset-0 bg-black/30 z-[-1]" />
            <div
              ref={panelRef}
              aria-label="도구 전체 목록"
              className="absolute bottom-full left-0 right-0 bg-white rounded-t-2xl shadow-2xl ring-1 ring-slate-200 p-4 space-y-3 max-h-[70vh] overflow-y-auto animate-[slideUp_0.2s_ease-out]"
            >
              {TOOL_SECTIONS.map(section => (
                <div key={section.section}>
                  <p className="text-xs font-bold text-slate-400 px-2 mb-1">{section.section}</p>
                  {section.tools.map(tool => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      aria-current={pathname === tool.href ? "page" : undefined}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                        pathname === tool.href
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base">{tool.emoji}</span>
                      <span>{toolLabel(tool, locale)}</span>
                    </Link>
                  ))}
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2">
                <Link href="/tools"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-50 transition">
                  ← 도구 목록으로
                </Link>
              </div>
            </div>
          </>
        )}
      </nav>

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
                aria-current={pathname === tool.href ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  pathname === tool.href
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm">{tool.emoji}</span>
                <span className="leading-tight">{toolLabel(tool, locale)}</span>
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </>
  );
}
