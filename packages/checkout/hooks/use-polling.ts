"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Polls `callback` every `intervalMs` while `enabled` is true.
 * Callback should return `true` to stop polling.
 */
export function usePolling(
  callback: () => Promise<boolean>,
  intervalMs: number,
  enabled: boolean,
) {
  const savedCb = useRef(callback);
  savedCb.current = callback;
  const stopped = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    stopped.current = false;

    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (stopped.current) return;
      try {
        const done = await savedCb.current();
        if (done) {
          stopped.current = true;
          return;
        }
      } catch {
        // keep polling on transient errors
      }
      if (!stopped.current) {
        timer = setTimeout(poll, intervalMs);
      }
    };

    timer = setTimeout(poll, intervalMs);

    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [enabled, intervalMs]);

  return useCallback(() => {
    stopped.current = true;
  }, []);
}
