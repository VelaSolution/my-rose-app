"use client";

import { useState, useEffect } from "react";

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("vela-theme", next ? "dark" : "light");
  };

  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">🌙 다크 모드</h3>
          <p className="text-xs text-slate-400 mt-0.5">화면 테마를 변경합니다</p>
        </div>
        <button
          onClick={toggle}
          className={`relative w-14 h-7 rounded-full transition-colors ${isDark ? "bg-blue-600" : "bg-slate-200"}`}
          aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-7" : "translate-x-1"}`}
          />
        </button>
      </div>
    </div>
  );
}
