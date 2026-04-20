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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

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
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    router.refresh();
    router.push(nextPath);
    setLoading(false);
  }

  return (
    <main className="min-h-dvh bg-slate-50 flex items-center justify-center px-5 py-10 pb-[env(safe-area-inset-bottom,20px)]">
      <style>{`
        @keyframes loginFadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes formShake { 0%,100% { transform: translateX(0); } 10%,30%,50%,70%,90% { transform: translateX(-4px); } 20%,40%,60%,80% { transform: translateX(4px); } }
        .login-entrance { animation: loginFadeInUp 0.5s ease-out; }
        .form-shake { animation: formShake 0.4s ease-in-out; }
        @keyframes spinnerRotate { to { transform: rotate(360deg); } }
        .login-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spinnerRotate 0.6s linear infinite; display: inline-block; vertical-align: middle; }
      `}</style>
      <div className="w-full max-w-md login-entrance">

        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">VELA</span>
            <span className="text-2xl font-extrabold text-blue-500 tracking-tight">.</span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">외식업 경영 분석 플랫폼</p>
          {nextPath !== "/" && (
            <p className="mt-2 text-xs text-blue-500 bg-blue-50 rounded-full px-3 py-1 inline-block">
              로그인 후 {nextPath} 으로 이동합니다
            </p>
          )}
        </div>

        <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-sm ring-1 ring-slate-200 p-6 sm:p-8 ${shaking ? "form-shake" : ""}`}>

          {/* 카카오 로그인 */}
          <button
            onClick={() => handleSocialLogin("kakao")}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-4 py-3.5 text-[15px] font-bold text-[#191919] transition hover:brightness-95 active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.12 1.29 3.98 3.24 5.1l-.83 3.07c-.07.27.22.49.46.34L8.1 13.9c.29.04.59.06.9.06 4.14 0 7.5-2.69 7.5-6S13.14 1.5 9 1.5z" fill="#191919" />
            </svg>
            카카오로 시작하기
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">또는 이메일로 로그인</span></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">비밀번호</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력" required autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-base outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition" aria-label="비밀번호 보기">
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (<><span className="login-spinner" />로그인 중...</>) : "이메일로 로그인"}
            </button>
            <button type="button" onClick={async () => {
              if (!email) { setError("이메일을 입력해주세요."); return; }
              const supabase = createSupabaseBrowserClient();
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              if (error) setError(error.message);
              else setError("비밀번호 재설정 이메일을 보냈습니다. 메일을 확인해주세요.");
            }} className="w-full text-sm text-slate-400 hover:text-slate-600 py-2 transition">
              비밀번호를 잊으셨나요?
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
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
      <main className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
