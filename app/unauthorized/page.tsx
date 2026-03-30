// app/unauthorized/page.tsx
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
          접근 권한이 없습니다
        </h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          현재 서비스는 초대된 사용자만 이용할 수 있습니다.<br />
          문의가 있으시면 연락해주세요.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition">
            홈으로
          </Link>
          <a href="mailto:hello@vela.kr" className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            문의하기
          </a>
        </div>
      </div>
    </main>
  );
}
