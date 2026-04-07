"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

/**
 * 범용 클라우드 동기화 훅
 *
 * - localStorage + Supabase 자동 동기화
 * - 로그인 시 클라우드 우선, 비로그인 시 로컬만
 * - debounce 자동 저장 (기본 2초)
 * - 동기화 상태 표시 (idle / saving / saved / offline / error)
 *
 * 사용법:
 *   const { data, update, status, userId } = useCloudSync<MyType>("vela-my-tool", defaultData);
 *   update({ ...data, field: newValue }); // 자동 저장됨
 */

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "error";

const TABLE = "tool_saves";

interface UseCloudSyncOptions {
  debounceMs?: number;
}

export function useCloudSync<T>(
  toolKey: string,
  defaultData: T,
  options?: UseCloudSyncOptions,
) {
  const { debounceMs = 2000 } = options ?? {};

  const [data, setData] = useState<T>(defaultData);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const userRef = useRef<string | null>(null);
  const cloudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lsKey = toolKey;

  /* ── 초기 로드: 로컬 → 클라우드 병합 ── */
  useEffect(() => {
    // 1) 로컬 먼저 로드
    let local = defaultData;
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) local = JSON.parse(raw);
    } catch { /* noop */ }
    setData(local);

    // 2) 로그인 확인 → 클라우드 로드
    (async () => {
      try {
        const sb = createSupabaseBrowserClient();
        if (!sb) { setLoaded(true); return; }
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setLoaded(true); return; }

        userRef.current = user.id;
        setUserId(user.id);

        const { data: rows } = await sb
          .from(TABLE)
          .select("data")
          .eq("user_id", user.id)
          .eq("tool_key", toolKey)
          .limit(1);

        if (rows && rows.length > 0 && rows[0].data) {
          // 클라우드 데이터가 있으면 우선 사용
          const cloud = typeof rows[0].data === "string"
            ? JSON.parse(rows[0].data)
            : rows[0].data;
          setData(cloud);
          localStorage.setItem(lsKey, JSON.stringify(cloud));
        } else {
          // 클라우드 없고 로컬 있으면 → 클라우드에 업로드
          const hasLocal = JSON.stringify(local) !== JSON.stringify(defaultData);
          if (hasLocal) {
            await sb.from(TABLE).insert({
              user_id: user.id,
              tool_key: toolKey,
              data: local,
            });
          }
        }
      } catch {
        setStatus("offline");
      } finally {
        setLoaded(true);
      }
    })();

    return () => {
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 저장 함수 ── */
  const saveToCloud = useCallback(async (next: T) => {
    if (!userRef.current) return;

    setStatus("saving");
    try {
      const sb = createSupabaseBrowserClient();
      if (!sb) { setStatus("offline"); return; }

      const payload = { data: next, updated_at: new Date().toISOString() };

      const { data: existing } = await sb
        .from(TABLE)
        .select("id")
        .eq("user_id", userRef.current)
        .eq("tool_key", toolKey)
        .limit(1);

      if (existing && existing.length > 0) {
        await sb.from(TABLE).update(payload).eq("user_id", userRef.current).eq("tool_key", toolKey);
      } else {
        await sb.from(TABLE).insert({
          user_id: userRef.current,
          tool_key: toolKey,
          ...payload,
        });
      }

      setStatus("saved");
      if (statusTimer.current) clearTimeout(statusTimer.current);
      statusTimer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      if (statusTimer.current) clearTimeout(statusTimer.current);
      statusTimer.current = setTimeout(() => setStatus("idle"), 3000);
    }
  }, [toolKey]);

  /* ── update: 로컬 즉시 저장 + 클라우드 debounce ── */
  const update = useCallback((next: T) => {
    setData(next);
    localStorage.setItem(lsKey, JSON.stringify(next));

    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(() => saveToCloud(next), debounceMs);
  }, [lsKey, debounceMs, saveToCloud]);

  /* ── 수동 즉시 저장 ── */
  const saveNow = useCallback(async () => {
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    await saveToCloud(data);
  }, [data, saveToCloud]);

  /* ── 클라우드 데이터 삭제 ── */
  const deleteCloud = useCallback(async () => {
    if (!userRef.current) return;
    try {
      const sb = createSupabaseBrowserClient();
      if (!sb) return;
      await sb.from(TABLE).delete().eq("user_id", userRef.current).eq("tool_key", toolKey);
    } catch { /* noop */ }
  }, [toolKey]);

  return { data, update, status, userId, loaded, saveNow, deleteCloud };
}
