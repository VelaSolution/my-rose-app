import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "경영 도구 모음 — VELA | 원가·인건비·세금·AI 마케팅",
  description: "메뉴 원가 계산기, 인건비 스케줄러, 세금 계산기, SNS 콘텐츠 생성기, 리뷰 답변 AI 등 외식업 사장님을 위한 30가지 무료 경영 도구.",
};

function ToolSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="h-4 w-16 bg-slate-200 rounded mb-6 animate-pulse" />
        <div className="h-7 w-48 bg-slate-200 rounded-lg mb-2 animate-pulse" />
        <div className="h-4 w-72 bg-slate-100 rounded mb-6 animate-pulse" />
        <div className="bg-white ring-1 ring-slate-200 rounded-3xl p-6 space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-10 w-3/4 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </main>
  );
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ToolSkeleton />}>{children}</Suspense>;
}
