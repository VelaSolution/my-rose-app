"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const REMINDER_KEY = "vela-monthly-reminder";

export default function MonthlyReminder() {
  const [show, setShow] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    const now = new Date();
    const day = now.getDate();
    const month = `${now.getFullYear()}-${now.getMonth() + 1}`;

    // 매월 1~7일에만 표시
    if (day > 7) return;

    // 이번 달 이미 닫았으면 안 보여줌
    const dismissed = localStorage.getItem(REMINDER_KEY);
    if (dismissed === month) return;

    setShow(true);

    // 브라우저 알림 권한 확인
    if ("Notification" in window) {
      setNotifGranted(Notification.permission === "granted");

      // 권한이 granted면 알림 보내기
      if (Notification.permission === "granted") {
        new Notification("VELA", {
          body: `${now.getMonth() + 1}월 매출을 아직 등록하지 않으셨어요. 등록하면 월별 추이를 확인할 수 있어요!`,
          icon: "/favicon.ico",
        });
      }
    }
  }, []);

  const dismiss = () => {
    const now = new Date();
    localStorage.setItem(REMINDER_KEY, `${now.getFullYear()}-${now.getMonth() + 1}`);
    setShow(false);
  };

  const requestNotif = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifGranted(true);
      new Notification("VELA 알림 설정 완료!", {
        body: "매월 초에 매출 등록 알림을 보내드릴게요.",
        icon: "/favicon.ico",
      });
    }
  };

  if (!show) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 flex items-center gap-4 flex-wrap">
      <span className="text-2xl">🔔</span>
      <div className="flex-1">
        <p className="text-white font-bold text-sm">이번 달 매출을 등록해주세요!</p>
        <p className="text-blue-200 text-xs mt-0.5">매월 매출을 등록하면 성장 추이와 순이익 변화를 한눈에 볼 수 있어요.</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {!notifGranted && "Notification" in (typeof window !== "undefined" ? window : {}) && (
          <button
            onClick={requestNotif}
            className="rounded-xl bg-white/20 text-white text-xs font-semibold px-3 py-2 hover:bg-white/30 transition"
          >
            알림 받기
          </button>
        )}
        <Link
          href="/monthly-input"
          onClick={dismiss}
          className="rounded-xl bg-white text-blue-600 text-xs font-bold px-4 py-2 hover:bg-blue-50 transition"
        >
          등록하기 →
        </Link>
        <button
          onClick={dismiss}
          className="text-white/60 hover:text-white text-lg leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
