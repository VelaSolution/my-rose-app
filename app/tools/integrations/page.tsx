"use client";

import { useState } from "react";
import Link from "next/link";
import ToolNav from "@/components/ToolNav";

const INTEGRATIONS = [
  {
    id: "toss-pos",
    name: "토스 POS",
    desc: "토스 POS 매출 데이터 자동 연동",
    status: "coming" as const,
    icon: "🔵",
    color: "bg-blue-50 ring-blue-200",
  },
  {
    id: "baemin",
    name: "배달의민족",
    desc: "배민 주문·정산 데이터 자동 수집",
    status: "coming" as const,
    icon: "🟦",
    color: "bg-sky-50 ring-sky-200",
  },
  {
    id: "coupang",
    name: "쿠팡이츠",
    desc: "쿠팡이츠 매출·수수료 자동 연동",
    status: "coming" as const,
    icon: "🟩",
    color: "bg-green-50 ring-green-200",
  },
  {
    id: "yogiyo",
    name: "요기요",
    desc: "요기요 정산 데이터 자동 수집",
    status: "coming" as const,
    icon: "🟥",
    color: "bg-red-50 ring-red-200",
  },
  {
    id: "card-sales",
    name: "카드매출 (여신금융협회)",
    desc: "사업자번호로 카드사별 매출 자동 조회",
    status: "active" as const,
    icon: "💳",
    color: "bg-indigo-50 ring-indigo-200",
    href: "/tools/card-sales",
  },
  {
    id: "excel",
    name: "POS 엑셀 업로드",
    desc: "POS 데이터 엑셀 파일 AI 분석",
    status: "active" as const,
    icon: "📊",
    color: "bg-emerald-50 ring-emerald-200",
    href: "/simulator",
  },
];

export default function IntegrationsPage() {
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notified, setNotified] = useState<Set<string>>(new Set());

  const handleNotify = (id: string) => {
    setNotified((prev) => new Set(prev).add(id));
  };

  return (
    <>
    <ToolNav />
    <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 md:pl-60">
      <div className="mx-auto max-w-2xl">
        <Link href="/tools" className="text-sm text-slate-400 hover:text-slate-700 transition">← 도구 목록</Link>

        <div className="mt-6 mb-8">
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <span>🔗</span> 연동 관리
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">외부 서비스 연동</h1>
          <p className="text-slate-500 text-sm">POS, 배달앱, 카드매출을 연동하여 매출 데이터를 자동으로 가져옵니다.</p>
        </div>

        <div className="space-y-3">
          {INTEGRATIONS.map((item) => (
            <div key={item.id} className={`rounded-2xl bg-white p-5 ring-1 ring-slate-200 flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-xl ${item.color} ring-1 flex items-center justify-center text-2xl flex-shrink-0`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                  {item.status === "coming" ? (
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">출시 예정</span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">사용 가능</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <div className="flex-shrink-0">
                {item.status === "active" && item.href ? (
                  <Link href={item.href} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                    연동하기
                  </Link>
                ) : notified.has(item.id) ? (
                  <span className="text-xs text-emerald-500 font-semibold">알림 신청 완료</span>
                ) : (
                  <button
                    onClick={() => handleNotify(item.id)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    출시 알림
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-slate-900 p-6 text-center">
          <p className="text-sm text-slate-400 mb-2">연동 서비스가 출시되면 알려드릴까요?</p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="이메일 주소"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
              알림 받기
            </button>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
