"use client";
export const dynamic = "force-dynamic";

import { useSearchParams, Suspense } from "react";
import Link from "next/link";

function FailContent() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md w-full ring-1 ring-slate-200">
        <div className="text-5xl mb-4">😢</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">결제가 취소됐어요</h1>
        <p className="text-slate-500 mb-8">결제 중 문제가 발생했거나 취소됐어요.</p>
        <Link href="/pricing"
          className="block w-full rounded-2xl bg-slate-900 text-white font-semibold py-3 hover:bg-slate-700 transition">
          다시 시도하기
        </Link>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return <Suspense><FailContent /></Suspense>;
}
