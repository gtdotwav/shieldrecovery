"use client";

import { useCallback, useEffect, useState } from "react";

type CountdownState = {
  minutes: number;
  seconds: number;
  total: number;
  expired: boolean;
  formatted: string;
};

export function useCountdown(expiresAt: string | undefined): CountdownState {
  const calculate = useCallback((): CountdownState => {
    if (!expiresAt) return { minutes: 0, seconds: 0, total: 0, expired: false, formatted: "--:--" };

    const diff = new Date(expiresAt).getTime() - Date.now();

    if (diff <= 0) return { minutes: 0, seconds: 0, total: 0, expired: true, formatted: "00:00" };

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    return { minutes, seconds, total: diff, expired: false, formatted };
  }, [expiresAt]);

  const [state, setState] = useState(calculate);

  useEffect(() => {
    setState(calculate());
    const id = setInterval(() => setState(calculate()), 1000);
    return () => clearInterval(id);
  }, [calculate]);

  return state;
}
