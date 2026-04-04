"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type Tab = "email" | "phone";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [tab, setTab] = useState<Tab>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSocialLogin(provider: "kakao" | "naver") {
    const supabase = createSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
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

  async function handleSendOtp() {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const formatted = phone.startsWith("0") ? "+82" + phone.slice(1) : phone;
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    if (error) { setError(error.message); setLoading(false); return; }
    setOtpSent(true);
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const formatted = phone.startsWith("0") ? "+82" + phone.slice(1) : phone;
    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: "sms" });
    if (error) { setError(error.message); setLoading(false); return; }
    router.refresh();
    router.push(nextPath);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="font-serif text-3xl font-bold text-slate-900">VELA</span>
            <span className="font-serif text-3xl font-bold text-blue-500">.</span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">계속하려면 로그인하세요</p>
          {nextPath !== "/" && (
            <p className="mt-1 text-xs text-blue-500 bg-blue-50 rounded-full px-3 py-1 inline-block">
              로그인 후 {nextPath} 으로 이동합니다
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-8">

          {/* 카카오 로그인 */}
          <div className="mb-6">
            <button
              onClick={() => handleSocialLogin("kakao")}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-4 py-4 text-base font-bold text-[#191919] transition hover:brightness-95"
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.12 1.29 3.98 3.24 5.1l-.83 3.07c-.07.27.22.49.46.34L8.1 13.9c.29.04.59.06.9.06 4.14 0 7.5-2.69 7.5-6S13.14 1.5 9 1.5z" fill="#191919" />
              </svg>
              카카오로 시작하기
            </button>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <p className="mt-4 text-center text-xs text-slate-400">
            카카오 계정으로 간편하게 시작하세요.<br />
            별도 회원가입이 필요 없습니다.
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
