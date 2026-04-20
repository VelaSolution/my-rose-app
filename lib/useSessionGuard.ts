"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

/**
 * 중복 로그인 방지 훅
 *
 * 작동 방식:
 * 1. 로그인 시 고유 session_id를 생성해서 user_sessions 테이블에 저장
 * 2. 주기적으로(30초) 내 session_id가 최신인지 확인
 * 3. 다른 기기에서 로그인하면 기존 session_id가 교체됨
 * 4. 기존 기기에서 감지 → 알림 후 로그아웃
 */

const SESSION_KEY = "vela-session-id";
const CHECK_INTERVAL = 30_000; // 30초

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useSessionGuard() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const sb = createSupabaseBrowserClient();
        if (!sb) return;

        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        // 세션 ID 생성 및 등록
        const sessionId = generateSessionId();
        localStorage.setItem(SESSION_KEY, sessionId);

        await sb.from("user_sessions").upsert({
          user_id: user.id,
          session_id: sessionId,
          device: navigator.userAgent.slice(0, 200),
          last_active: new Date().toISOString(),
        }, { onConflict: "user_id" });

        // 주기적 확인
        intervalRef.current = setInterval(async () => {
          if (cancelled) return;
          try {
            const mySessionId = localStorage.getItem(SESSION_KEY);
            if (!mySessionId) return;

            const { data } = await sb
              .from("user_sessions")
              .select("session_id")
              .eq("user_id", user.id)
              .single();

            if (data && data.session_id !== mySessionId) {
              // 다른 기기에서 로그인됨
              clearInterval(intervalRef.current);
              localStorage.removeItem(SESSION_KEY);
              alert("다른 기기에서 로그인되었습니다.\n현재 세션이 종료됩니다.");
              await sb.auth.signOut();
              window.location.href = "/login";
            } else {
              // 활성 상태 갱신
              await sb.from("user_sessions").update({
                last_active: new Date().toISOString(),
              }).eq("user_id", user.id);
            }
          } catch {}
        }, CHECK_INTERVAL);

      } catch {}
    }

    init();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
