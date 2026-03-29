"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
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
  { id: "operating", label: "🏪 현재 운영 중" },
  { id: "preparing", label: "🚀 창업 준비 중" },
  { id: "considering", label: "💭 창업 고려 중" },
];

function SignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: 계정정보, 2: 매장정보
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 - 계정정보
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Step 2 - 매장정보
  const [businessStatus, setBusinessStatus] = useState("operating");
  const [storeName, setStoreName] = useState("");
  const [industry, setIndustry] = useState("restaurant");
  const [seats, setSeats] = useState("");
  const [address, setAddress] = useState("");

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
          seats: Number(seats) || 0,
          address: address.trim(),
          plan: "free",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // 가입 완료 후 자동 로그인 시도
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      // 이메일 인증 필요한 경우
      router.push("/?signup=success");
    } else {
      router.push("/");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="font-serif text-3xl font-bold text-slate-900">VELA</span>
            <span className="font-serif text-3xl font-bold text-blue-500">.</span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">외식업 경영 분석 플랫폼</p>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center gap-2 mb-8">
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

        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-8">

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">계정 정보</h2>
                <p className="text-sm text-slate-400">VELA 계정을 만들어보세요</p>
              </div>

              {/* 소셜 로그인 */}
              <div className="space-y-2">
                {[
                  { provider: "kakao", label: "카카오로 시작하기", bg: "#FEE500", color: "#191919", emoji: "💛" },
                  { provider: "naver", label: "네이버로 시작하기", bg: "#03C75A", color: "#fff", emoji: "N" },
                ].map(({ provider, label, bg, color, emoji }) => (
                  <button key={provider}
                    onClick={async () => {
                      const supabase = createSupabaseBrowserClient();
                      await supabase.auth.signInWithOAuth({
                        provider: provider as "kakao",
                        options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
                      });
                    }}
                    className="w-full flex items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:brightness-95"
                    style={{ background: bg, color }}
                  >
                    <span className="font-black">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">또는 이메일로</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">이름</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">이메일</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">비밀번호</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">비밀번호 확인</label>
                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="다시 입력"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white transition" />
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

              <button onClick={() => { if (validateStep1()) setStep(2); }}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-700 transition">
                다음 →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">매장 정보</h2>
                <p className="text-sm text-slate-400">맞춤 분석을 위해 알려주세요 (나중에 수정 가능)</p>
              </div>

              {/* 운영 상태 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">현재 상황</label>
                <div className="grid grid-cols-3 gap-2">
                  {BUSINESS_STATUS.map(opt => (
                    <button key={opt.id} onClick={() => setBusinessStatus(opt.id)}
                      className={`rounded-xl py-2.5 text-xs font-semibold transition text-center ${businessStatus === opt.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
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
                    <button key={opt.id} onClick={() => setIndustry(opt.id)}
                      className={`rounded-xl py-2.5 text-xs font-semibold transition text-center ${industry === opt.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white transition" />
              </div>

              {/* 좌석수 & 주소 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    좌석 수 <span className="text-slate-300 normal-case font-normal">(선택)</span>
                  </label>
                  <div className="relative">
                    <input type="number" value={seats} onChange={e => setSeats(e.target.value)} placeholder="20"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-right pr-8 outline-none focus:border-slate-400 focus:bg-white transition" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">석</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    지역 <span className="text-slate-300 normal-case font-normal">(선택)</span>
                  </label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="예) 서울 마포구"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white transition" />
                </div>
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-shrink-0 rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  ← 이전
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50">
                  {loading ? "가입 중..." : "✅ 가입 완료"}
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
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </main>
    }>
      <SignUpForm />
    </Suspense>
  );
}
