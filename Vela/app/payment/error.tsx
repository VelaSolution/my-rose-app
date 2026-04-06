"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PaymentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Payment error:", error); }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">💳</div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">결제 오류</h1>
        <p className="text-slate-500 text-sm mb-6">결제 처리 중 문제가 발생했습니다. 결제가 완료되지 않았으니 안심하세요.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition">다시 시도</button>
          <Link href="/pricing" className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">요금제 보기</Link>
        </div>
      </div>
    </main>
  );
}
