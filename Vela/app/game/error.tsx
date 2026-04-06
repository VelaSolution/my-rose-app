"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GameError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Game error:", error); }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🎮</div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">게임 오류</h1>
        <p className="text-slate-500 text-sm mb-6">게임을 불러오는 중 문제가 생겼습니다.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition">다시 시도</button>
          <Link href="/" className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">홈으로</Link>
        </div>
      </div>
    </main>
  );
}
