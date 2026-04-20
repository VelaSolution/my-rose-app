"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { captureError } from "@/lib/sentry";

const COUNTDOWN_SECONDS = 5;

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [autoRetryDone, setAutoRetryDone] = useState(false);

  useEffect(() => { captureError(error); }, [error]);

  // Auto-retry countdown
  useEffect(() => {
    if (autoRetryDone) return;
    if (countdown <= 0) {
      setAutoRetryDone(true);
      reset();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, autoRetryDone, reset]);

  const handleRetry = useCallback(() => {
    setAutoRetryDone(true);
    reset();
  }, [reset]);

  const contactSubject = encodeURIComponent(`[VELA 오류 신고] ${error.digest || "알 수 없는 오류"}`);
  const contactBody = encodeURIComponent(
    `안녕하세요, VELA 사용 중 오류가 발생했습니다.\n\n` +
    `오류 코드: ${error.digest || "없음"}\n` +
    `오류 메시지: ${error.message || "없음"}\n` +
    `발생 시각: ${new Date().toLocaleString("ko-KR")}\n` +
    `페이지: ${typeof window !== "undefined" ? window.location.href : "알 수 없음"}\n\n` +
    `추가 설명:\n`
  );

  return (
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 flex items-center justify-center">
      <style>{`
        @keyframes gentle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }
        .error-icon-bounce { animation: gentle-bounce 3s ease-in-out infinite; }
        .error-fade-in { animation: fade-in-up 0.4s ease-out forwards; }
      `}</style>

      <div className="mx-auto max-w-md text-center error-fade-in">
        {/* Animated icon */}
        <div className="error-icon-bounce w-20 h-20 bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-red-100">
          <svg className="w-9 h-9 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 3h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">잠시 문제가 생겼어요</h2>
        <p className="text-sm text-slate-500 mb-2 leading-relaxed">
          걱정 마세요, 일시적인 오류일 수 있어요.<br />
          잠시 후 자동으로 다시 시도합니다.
        </p>

        {error.digest && (
          <p className="text-xs text-slate-400 mb-4 font-mono bg-slate-100 rounded-lg px-3 py-1.5 inline-block">
            오류 코드: {error.digest}
          </p>
        )}

        {/* Auto-retry countdown */}
        {!autoRetryDone && (
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {countdown}초 후 자동 재시도
            </div>
            <div className="mt-3 mx-auto max-w-[200px] h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  animation: `progress-shrink ${COUNTDOWN_SECONDS}s linear forwards`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <button onClick={handleRetry}
            className="rounded-xl bg-slate-900 text-white font-semibold px-6 py-3.5 text-sm hover:bg-slate-800 active:scale-[0.98] transition flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            다시 시도
          </button>
          <Link href="/"
            className="rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 font-semibold px-6 py-3.5 text-sm hover:bg-slate-50 active:scale-[0.98] transition">
            홈으로 돌아가기
          </Link>
        </div>

        {/* Contact button */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <a
            href={`mailto:mnhyuk@velaanalytics.com?subject=${contactSubject}&body=${contactBody}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            문의하기
          </a>
          <p className="text-xs text-slate-400 mt-1.5">
            오류 정보가 자동으로 포함됩니다
          </p>
        </div>
      </div>
    </main>
  );
}
