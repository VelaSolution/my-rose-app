"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

/* ── 체크리스트 항목 ── */
const OPEN_ITEMS = [
  "냉장/냉동고 온도 확인",
  "가스 밸브 확인",
  "식재료 상태 확인 (유통기한, 변질)",
  "홀 청소 및 테이블 세팅",
  "화장실 점검",
  "POS/카드 단말기 작동 확인",
  "배달앱 영업 시작",
  "오늘 예약 현황 확인",
] as const;

const CLOSE_ITEMS = [
  "POS 일일 매출 정산",
  "카드/현금 매출 대조",
  "주방 청소 및 소독",
  "가스 밸브 잠금",
  "냉장/냉동고 정리",
  "쓰레기 분리수거",
  "문단속 및 시건장치",
] as const;

const ALL_ITEMS = [...OPEN_ITEMS, ...CLOSE_ITEMS];

function storageKey(date: string) {
  return `vela-daily-checklist-${date}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type CheckedMap = Record<string, boolean>;

export default function ChecklistPage() {
  const [date, setDate] = useState(todayStr);
  const [checked, setChecked] = useState<CheckedMap>({});
  const [celebrate, setCelebrate] = useState(false);

  const userRef = useRef<string | null>(null);

  /* 초기 사용자 확인 */
  useEffect(() => {
    (async () => {
      const sb = createSupabaseBrowserClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) userRef.current = user.id;
    })();
  }, []);

  /* localStorage + 클라우드 로드 */
  useEffect(() => {
    const raw = localStorage.getItem(storageKey(date));
    if (raw) {
      try { setChecked(JSON.parse(raw)); } catch { setChecked({}); }
    } else {
      setChecked({});
    }
    setCelebrate(false);

    if (userRef.current) {
      (async () => {
        const sb = createSupabaseBrowserClient();
        const { data } = await sb.from("user_checklists").select("data").eq("user_id", userRef.current!).eq("date", date).limit(1);
        if (data && data.length > 0) {
          try {
            const parsed = JSON.parse(data[0].data);
            setChecked(parsed);
            localStorage.setItem(storageKey(date), JSON.stringify(parsed));
          } catch { /* use local */ }
        }
      })();
    }
  }, [date]);

  /* localStorage + 클라우드 저장 */
  const cloudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const persist = useCallback((next: CheckedMap) => {
    localStorage.setItem(storageKey(date), JSON.stringify(next));

    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(async () => {
      if (!userRef.current) return;
      const sb = createSupabaseBrowserClient();
      const payload = { user_id: userRef.current, date, data: JSON.stringify(next) };
      const { data: existing } = await sb.from("user_checklists").select("id").eq("user_id", userRef.current).eq("date", date).limit(1);
      if (existing && existing.length > 0) {
        await sb.from("user_checklists").update(payload).eq("user_id", userRef.current).eq("date", date);
      } else {
        await sb.from("user_checklists").insert(payload);
      }
    }, 1500);
  }, [date]);

  const toggle = (item: string) => {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      persist(next);
      // 전체 완료 체크
      const totalDone = ALL_ITEMS.filter((i) => next[i]).length;
      if (totalDone === ALL_ITEMS.length) setCelebrate(true);
      else setCelebrate(false);
      return next;
    });
  };

  const totalChecked = ALL_ITEMS.filter((i) => checked[i]).length;
  const totalItems = ALL_ITEMS.length;
  const pct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  const openChecked = OPEN_ITEMS.filter((i) => checked[i]).length;
  const closeChecked = CLOSE_ITEMS.filter((i) => checked[i]).length;

  return (
    <>
      <style>{`
        @keyframes confetti{0%{transform:scale(0.8) rotate(0deg);opacity:0}50%{transform:scale(1.1) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0deg);opacity:1}}
        .celebrate-enter{animation:confetti 0.5s ease-out}
      `}</style>

      <main className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="mx-auto max-w-2xl">
          {/* 뒤로가기 */}
          <Link
            href="/tools"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition mb-4"
          >
            ← 도구 목록
          </Link>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              ✅ 일일 체크리스트
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
              매장 일일 체크리스트
            </h1>
            <p className="text-slate-500 text-sm">
              매일 오픈/마감 시 확인해야 할 항목을 체크하세요.
            </p>
          </div>

          {/* 날짜 선택 */}
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 mb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="text-sm font-semibold text-slate-700">날짜 선택</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 진행률 */}
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">진행률</span>
              <span className="text-sm font-bold text-slate-900">{totalChecked}/{totalItems} ({pct}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? "#10B981" : pct >= 50 ? "#3182F6" : "#94A3B8",
                }}
              />
            </div>
          </div>

          {/* 전체 완료 축하 */}
          {celebrate && (
            <div className="celebrate-enter rounded-3xl bg-emerald-50 ring-1 ring-emerald-200 p-6 mb-4 text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-lg font-bold text-emerald-800">전체 완료!</p>
              <p className="text-sm text-emerald-600 mt-1">오늘도 수고하셨습니다. 완벽한 매장 운영이에요!</p>
            </div>
          )}

          {/* 오픈 체크리스트 */}
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                🌅 오픈 체크리스트
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {openChecked}/{OPEN_ITEMS.length}
              </span>
            </div>
            <ul className="space-y-2">
              {OPEN_ITEMS.map((item) => (
                <li key={item}>
                  <button
                    onClick={() => toggle(item)}
                    className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                      checked[item]
                        ? "bg-emerald-50 ring-1 ring-emerald-200"
                        : "bg-slate-50 ring-1 ring-slate-100 hover:ring-slate-300"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                        checked[item]
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked[item] && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-sm font-medium transition-all duration-200 ${
                        checked[item] ? "text-emerald-700 line-through" : "text-slate-700"
                      }`}
                    >
                      {item}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 마감 체크리스트 */}
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                🌙 마감 체크리스트
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {closeChecked}/{CLOSE_ITEMS.length}
              </span>
            </div>
            <ul className="space-y-2">
              {CLOSE_ITEMS.map((item) => (
                <li key={item}>
                  <button
                    onClick={() => toggle(item)}
                    className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                      checked[item]
                        ? "bg-emerald-50 ring-1 ring-emerald-200"
                        : "bg-slate-50 ring-1 ring-slate-100 hover:ring-slate-300"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                        checked[item]
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked[item] && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-sm font-medium transition-all duration-200 ${
                        checked[item] ? "text-emerald-700 line-through" : "text-slate-700"
                      }`}
                    >
                      {item}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 하단 안내 */}
          <p className="text-center text-xs text-slate-400 mt-6">
            체크 상태는 날짜별로 자동 저장됩니다.
          </p>
        </div>
      </main>
    </>
  );
}
