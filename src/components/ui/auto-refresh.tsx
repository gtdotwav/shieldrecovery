"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

const MAX_INTERVAL_MS = 60_000;

export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  const baseInterval = useRef(intervalMs);
  const currentInterval = useRef(intervalMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(!document.hidden);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleTick = useCallback(() => {
    clearTimer();

    if (!visibleRef.current) return;

    timerRef.current = setTimeout(() => {
      router.refresh();

      // Exponential backoff: double interval on each tick, capped at MAX
      currentInterval.current = Math.min(
        currentInterval.current * 2,
        MAX_INTERVAL_MS,
      );

      scheduleTick();
    }, currentInterval.current);
  }, [router, clearTimer]);

  const resetBackoff = useCallback(() => {
    currentInterval.current = baseInterval.current;
  }, []);

  useEffect(() => {
    baseInterval.current = intervalMs;
    currentInterval.current = intervalMs;
  }, [intervalMs]);

  // Start polling on mount
  useEffect(() => {
    scheduleTick();
    return clearTimer;
  }, [scheduleTick, clearTimer]);

  // Pause when tab is hidden, resume when visible
  useEffect(() => {
    function handleVisibility() {
      visibleRef.current = !document.hidden;

      if (visibleRef.current) {
        // Tab became visible: reset backoff and restart polling
        resetBackoff();
        scheduleTick();
      } else {
        clearTimer();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [scheduleTick, clearTimer, resetBackoff]);

  // Reset backoff on window focus (user interaction signal)
  useEffect(() => {
    function handleFocus() {
      resetBackoff();
      scheduleTick();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [resetBackoff, scheduleTick]);

  return null;
}
