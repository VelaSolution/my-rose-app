"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "fail">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId    = params.get("orderId");
    const amount     = params.get("amount");

    if (!paymentKey || !orderId || !amount) {
      setStatus("fail");
      setMsg("결제 정보가 올바르지 않습니다.");
      return;
    }

    fetch("/api/payment/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStatus("success");
        } else {
          setStatus("fail");
          setMsg(d.error || "결제 승인 실패");
        }
      })
      .catch(() => { setStatus("fail"); setMsg("서버 오류"); });
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md w-full ring-1 ring-slate-200">
        {status === "loading" && (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto mb-6" />
            <p className="text-slate-600">결제 확인 중...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">결제 완료!</h1>
            <p className="text-slate-500 mb-8">VELA 프로 플랜이 활성화됐어요.</p>
            <Link href="/dashboard"
              className="block w-full rounded-2xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 transition">
              대시보드로 가기 →
            </Link>
          </>
        )}
        {status === "fail" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">결제 실패</h1>
            <p className="text-slate-500 mb-8">{msg}</p>
            <Link href="/pricing"
              className="block w-full rounded-2xl bg-slate-900 text-white font-semibold py-3 hover:bg-slate-700 transition">
              다시 시도하기
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  );
}
