"use client";

// app/error.tsx - Next.js 전역 에러 바운더리

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
          오류가 발생했어요
        </h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          일시적인 오류입니다. 다시 시도하거나<br />
          문제가 계속되면 문의해주세요.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            홈으로
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-slate-300">오류 코드: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
