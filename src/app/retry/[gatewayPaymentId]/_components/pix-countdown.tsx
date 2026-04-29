"use client";

import { useEffect, useState } from "react";

type PixCountdownProps = {
  expiresAt: string;
  onExpire?: () => void;
};

export function PixCountdown({ expiresAt, onExpire }: PixCountdownProps) {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const target = new Date(expiresAt).getTime();
    return Math.max(0, target - Date.now());
  });

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const next = Math.max(0, target - Date.now());
      setRemainingMs(next);
      if (next <= 0 && onExpire) onExpire();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  if (Number.isNaN(new Date(expiresAt).getTime())) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const expired = remainingMs <= 0;
  const warning = !expired && totalSeconds < 120;

  const label = expired
    ? "QR Code expirado"
    : `Válido por ${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-[0.7rem] font-medium ${
        expired
          ? "bg-rose-50 text-rose-700"
          : warning
            ? "bg-amber-50 text-amber-700"
            : "bg-[var(--accent)]/10 text-[var(--accent)]"
      }`}
      role="status"
      aria-live={warning || expired ? "polite" : "off"}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          expired
            ? "bg-rose-500"
            : warning
              ? "bg-amber-500"
              : "bg-[var(--accent)] animate-pulse"
        }`}
        aria-hidden
      />
      {label}
    </div>
  );
}
