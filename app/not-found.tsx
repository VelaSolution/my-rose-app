// app/not-found.tsx

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-extrabold text-slate-200 mb-4">404</div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          주소가 잘못되었거나 삭제된 페이지예요.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition">
            홈으로
          </Link>
          <Link href="/simulator" className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            시뮬레이터
          </Link>
        </div>
      </div>
    </main>
  );
}
