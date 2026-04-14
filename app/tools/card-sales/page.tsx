"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";
import { useCloudSync } from "@/lib/useCloudSync";
import CloudSyncBadge from "@/components/CloudSyncBadge";

type CardSalesData = {
  bizNo: string;
  notifyEmail: string;
  submitted: boolean;
};

const KEY = "vela-card-sales";
const defaultData: CardSalesData = { bizNo: "", notifyEmail: "", submitted: false };

export default function CardSalesPage() {
  const [bizNo, setBizNo] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: cloudData, update: cloudUpdate, status: syncStatus, userId: syncUserId } = useCloudSync<CardSalesData>(KEY, defaultData);

  useEffect(() => {
    if (cloudData) {
      setBizNo(cloudData.bizNo);
      setEmail(cloudData.notifyEmail);
      setSubmitted(cloudData.submitted);
    }
  }, [cloudData]);

  const handleSubmit = () => {
    if (email.trim()) {
      setSubmitted(true);
      cloudUpdate({ bizNo, notifyEmail: email, submitted: true });
    }
  };

  return (
    <>
      <ToolNav />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 pb-16 px-4 md:pl-60">
        <div className="mx-auto max-w-3xl text-center py-16">
          <p className="text-5xl mb-6">🚀</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">카드매출 자동 수집</h1>
          <p className="text-sm text-slate-500 mb-2">사업자등록번호만 입력하면 여신금융협회를 통해 카드사별 매출을 자동으로 조회합니다. 곧 출시됩니다!</p>
          <div className="mb-8">
            <CloudSyncBadge status={syncStatus} userId={syncUserId} />
          </div>

          <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">출시되면 알려드릴까요?</p>
            {submitted ? (
              <p className="text-sm text-emerald-600 font-semibold">알림 신청 완료!</p>
            ) : (
              <div className="space-y-2">
                <input
                  value={bizNo}
                  onChange={(e) => { setBizNo(e.target.value); cloudUpdate({ ...cloudData, bizNo: e.target.value }); }}
                  placeholder="사업자등록번호 (선택)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); cloudUpdate({ ...cloudData, notifyEmail: e.target.value }); }}
                    placeholder="이메일 주소"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSubmit}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    알림 받기
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-600 transition">
            ← 도구 목록으로 돌아가기
          </Link>
        </div>
      </main>
    </>
  );
}
