"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSocialLogin(provider: "kakao") {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) setError(error.message);
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push(nextPath);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-5">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="font-serif text-3xl font-bold text-slate-900">VELA</span>
            <span className="font-serif text-3xl font-bold text-blue-500">.</span>
          </Link>
          <p className="mt-3 text-sm text-slate-500">계속하려면 로그인하세요</p>
          {nextPath !== "/" && (
            <p className="mt-1 text-xs text-blue-500 bg-blue-50 rounded-full px-3 py-1 inline-block">
              로그인 후 {nextPath} 으로 이동합니다
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-6 sm:p-8">

          {/* 카카오 로그인 */}
          <div className="mb-6">
            <button
              onClick={() => handleSocialLogin("kakao")}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-4 py-4 text-base font-bold text-[#191919] transition hover:brightness-95 active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.12 1.29 3.98 3.24 5.1l-.83 3.07c-.07.27.22.49.46.34L8.1 13.9c.29.04.59.06.9.06 4.14 0 7.5-2.69 7.5-6S13.14 1.5 9 1.5z" fill="#191919" />
              </svg>
              카카오로 시작하기
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">또는 이메일로 로그인</span></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일" required aria-label="이메일"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400 focus:bg-white transition" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호" required aria-label="비밀번호"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400 focus:bg-white transition" />
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
              {loading ? "로그인 중..." : "이메일로 로그인"}
            </button>
            <button type="button" onClick={async () => {
              if (!email) { setError("이메일을 입력해주세요."); return; }
              const supabase = createSupabaseBrowserClient();
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              if (error) setError(error.message);
              else setError("비밀번호 재설정 이메일을 보냈습니다. 메일을 확인해주세요.");
            }} className="w-full text-sm text-slate-400 hover:text-slate-600 py-3 transition">
              비밀번호를 잊으셨나요?
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className="font-semibold text-slate-700 underline underline-offset-2">회원가입</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
