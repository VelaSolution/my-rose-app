"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const INDUSTRY_OPTIONS = [
  { id: "cafe", label: "☕ 카페" },
  { id: "restaurant", label: "🍽️ 음식점" },
  { id: "bar", label: "🍺 술집/바" },
  { id: "finedining", label: "✨ 파인다이닝" },
  { id: "gogi", label: "🥩 고깃집" },
];

const BUSINESS_STATUS = [
  { id: "operating", label: "🏪 운영 중" },
  { id: "preparing", label: "🚀 준비 중" },
  { id: "considering", label: "💭 고려 중" },
];

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  // Step 1 - 계정정보
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Step 2 - 매장정보
  const [businessStatus, setBusinessStatus] = useState("operating");
  const [storeName, setStoreName] = useState("");
  const [industry, setIndustry] = useState("restaurant");

  // 동의
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  function validateStep1() {
    if (!name.trim()) { setError("이름을 입력해주세요."); return false; }
    if (!email.trim()) { setError("이메일을 입력해주세요."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("올바른 이메일 형식이 아니에요."); return false; }
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 해요."); return false; }
    if (password !== passwordConfirm) { setError("비밀번호가 일치하지 않아요."); return false; }
    setError("");
    return true;
  }

  async function handleSubmit() {
    if (!agreeTerms || !agreePrivacy) {
      setError("이용약관과 개인정보 수집·이용에 동의해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name.trim(),
          business_status: businessStatus,
          store_name: storeName.trim(),
          industry,
          plan: "standard",
          marketing_agreed: agreeMarketing,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/${refCode ? `&ref=${refCode}` : ""}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSignupSuccess(true);
  }

  return (
    <main className="min-h-dvh bg-slate-50 flex items-center justify-center px-5 py-10 pb-[env(safe-area-inset-bottom,20px)]">
      <div className="w-full max-w-md">

        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">VELA</span>
            <span className="text-2xl font-extrabold text-blue-500 tracking-tight">.</span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">외식업 경영 분석 플랫폼</p>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center gap-2 mb-6 sm:mb-8">
          {[{ n: 1, label: "계정 정보" }, { n: 2, label: "매장 정보" }].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= n ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400"}`}>
                {step > n ? "✓" : n}
              </div>
              <span className={`text-xs font-semibold ${step >= n ? "text-slate-700" : "text-slate-400"}`}>{label}</span>
              {n < 2 && <div className={`flex-1 h-0.5 ${step > n ? "bg-slate-900" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        {signupSuccess ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm ring-1 ring-slate-200 p-6 sm:p-8 text-center space-y-4">
            <div className="text-5xl">📧</div>
            <h2 className="text-xl font-extrabold text-slate-900">이메일 인증 필요</h2>
            <p className="text-sm text-slate-500">인증 메일을 보냈습니다. 이메일을 확인해주세요.</p>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-sm text-slate-700">
                이메일 (<strong>{email}</strong>)로 인증 링크를 보냈습니다.<br />
                링크를 클릭하면 자동으로 로그인됩니다.
              </p>
            </div>
            {resendMsg && <p className="text-xs text-blue-600">{resendMsg}</p>}
            <button
              disabled={resending}
              onClick={async () => {
                setResending(true);
                setResendMsg("");
                const supabase = createSupabaseBrowserClient();
                const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
                setResending(false);
                if (resendError) {
                  setResendMsg("재전송에 실패했습니다: " + resendError.message);
                } else {
                  setResendMsg("인증 메일을 다시 보냈습니다.");
                }
              }}
              className="w-full rounded-2xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
            >
              {resending ? "전송 중..." : "다시 보내기"}
            </button>
            <p className="text-sm text-slate-400">
              <Link href="/login" className="font-semibold text-slate-700 underline underline-offset-2">로그인 페이지로 이동</Link>
            </p>
          </div>
        ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm ring-1 ring-slate-200 p-6 sm:p-8">

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">계정 정보</h2>
                <p className="text-sm text-slate-400">VELA 계정을 만들어보세요</p>
              </div>

              {/* 카카오 가입 */}
              <button
                onClick={async () => {
                  const supabase = createSupabaseBrowserClient();
                  await supabase.auth.signInWithOAuth({
                    provider: "kakao" as "kakao",
                    options: { redirectTo: `${window.location.origin}/auth/callback?next=/?signup=success` },
                  });
                }}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-4 py-3.5 text-[15px] font-bold text-[#191919] transition hover:brightness-95 active:scale-[0.98]"
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <path d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.12 1.29 3.98 3.24 5.1l-.83 3.07c-.07.27.22.49.46.34L8.1 13.9c.29.04.59.06.9.06 4.14 0 7.5-2.69 7.5-6S13.14 1.5 9 1.5z" fill="#191919" />
                </svg>
                카카오로 시작하기
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">또는 이메일로 가입</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">이름</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">이메일</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">비밀번호</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">비밀번호 확인</label>
                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="다시 입력" autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition" />
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

              <button onClick={() => { if (validateStep1()) setStep(2); }}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-700 active:scale-[0.98] transition">
                다음 →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">매장 정보</h2>
                <p className="text-sm text-slate-400">맞춤 분석을 위해 알려주세요 (나중에 수정 가능)</p>
              </div>

              {/* 운영 상태 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">현재 상황</label>
                <div className="grid grid-cols-3 gap-2">
                  {BUSINESS_STATUS.map(opt => (
                    <button key={opt.id} type="button" onClick={() => setBusinessStatus(opt.id)}
                      className={`rounded-xl py-3 text-xs font-semibold transition text-center active:scale-[0.96] ${businessStatus === opt.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 업종 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">업종</label>
                <div className="grid grid-cols-3 gap-2">
                  {INDUSTRY_OPTIONS.map(opt => (
                    <button key={opt.id} type="button" onClick={() => setIndustry(opt.id)}
                      className={`rounded-xl py-3 text-xs font-semibold transition text-center active:scale-[0.96] ${industry === opt.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 매장명 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  매장명 <span className="text-slate-300 normal-case font-normal">(선택)</span>
                </label>
                <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="예) 홍대 카페 베이글"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition" />
              </div>

              {/* 약관 동의 */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                  <input type="checkbox" checked={agreeTerms && agreePrivacy && agreeMarketing}
                    onChange={e => { setAgreeTerms(e.target.checked); setAgreePrivacy(e.target.checked); setAgreeMarketing(e.target.checked); }}
                    className="accent-slate-900 w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-bold text-slate-900">전체 동의</span>
                </label>
                <div className="border-t border-slate-200 pt-2 space-y-1">
                  <label className="flex items-center gap-3 cursor-pointer min-h-[40px]">
                    <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                      className="accent-slate-900 w-5 h-5 flex-shrink-0" />
                    <span className="text-xs text-slate-700">
                      <span className="text-red-500 font-bold">[필수]</span>{" "}
                      <Link href="/terms" target="_blank" className="underline underline-offset-2">이용약관</Link>에 동의합니다
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer min-h-[40px]">
                    <input type="checkbox" checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)}
                      className="accent-slate-900 w-5 h-5 flex-shrink-0" />
                    <span className="text-xs text-slate-700">
                      <span className="text-red-500 font-bold">[필수]</span>{" "}
                      <Link href="/privacy" target="_blank" className="underline underline-offset-2">개인정보 수집·이용</Link>에 동의합니다
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer min-h-[40px]">
                    <input type="checkbox" checked={agreeMarketing} onChange={e => setAgreeMarketing(e.target.checked)}
                      className="accent-slate-900 w-5 h-5 flex-shrink-0" />
                    <span className="text-xs text-slate-500">
                      <span className="text-slate-400">[선택]</span> 마케팅 정보 수신에 동의합니다
                    </span>
                  </label>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-shrink-0 rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition">
                  ← 이전
                </button>
                <button onClick={handleSubmit} disabled={loading || !agreeTerms || !agreePrivacy}
                  className="flex-1 rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-700 active:scale-[0.98] transition disabled:opacity-50">
                  {loading ? "가입 중..." : "가입 완료"}
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">
                매장 정보는 언제든 내정보에서 수정할 수 있어요
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-400">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-semibold text-slate-700 underline underline-offset-2">로그인</Link>
          </p>
        </div>
        )}
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </main>
    }>
      <SignUpForm />
    </Suspense>
  );
}
