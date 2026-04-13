"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ── Context ── */

type LiveState = {
  recovered: number;
  count: number;
  delta: number;
  showDelta: boolean;
};

const LiveCtx = createContext<LiveState>({
  recovered: 0,
  count: 0,
  delta: 0,
  showDelta: false,
});

export function useLiveRecovery() {
  return useContext(LiveCtx);
}

/* ── Tick amounts matching real product values ── */

const TICK_AMOUNTS = [
  197, 299, 497, 890, 1450, 1790, 1997, 2497, 2890, 3150, 3600, 4200, 4500,
  5600, 6800, 8900, 12000,
];

/* ── Provider ── */

export function LiveRecoveryProvider({
  baseRecovered,
  baseCount,
  children,
}: {
  baseRecovered: number;
  baseCount: number;
  children: ReactNode;
}) {
  const [state, setState] = useState<LiveState>({
    recovered: baseRecovered,
    count: baseCount,
    delta: 0,
    showDelta: false,
  });

  const tickRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function tick() {
      const amount =
        TICK_AMOUNTS[Math.floor(Math.random() * TICK_AMOUNTS.length)];

      setState((p) => ({
        recovered: p.recovered + amount,
        count: p.count + 1,
        delta: amount,
        showDelta: true,
      }));

      if (fadeRef.current) clearTimeout(fadeRef.current);
      fadeRef.current = setTimeout(
        () => setState((p) => ({ ...p, showDelta: false })),
        2800,
      );

      tickRef.current = setTimeout(tick, 3500 + Math.random() * 4500);
    }

    tickRef.current = setTimeout(tick, 1500 + Math.random() * 2500);
    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []);

  return <LiveCtx.Provider value={state}>{children}</LiveCtx.Provider>;
}

/* ── Formatters ── */

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function fmtBRLShort(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

/* ── Display components ── */

export function LiveAmount({
  commissionRate,
  format = "full",
  perDay,
}: {
  commissionRate?: number;
  format?: "full" | "short";
  perDay?: boolean;
}) {
  const { recovered } = useLiveRecovery();
  let value = commissionRate ? recovered * (commissionRate / 100) : recovered;
  if (perDay) value = value / 30;
  return (
    <span className="tabular-nums">
      {format === "short" ? fmtBRLShort(value) : fmtBRL(value)}
    </span>
  );
}

export function LiveCount() {
  const { count } = useLiveRecovery();
  return <span className="tabular-nums">{count}</span>;
}

export function LiveDelta({ commissionRate }: { commissionRate?: number }) {
  const { delta, showDelta } = useLiveRecovery();
  const value = commissionRate ? delta * (commissionRate / 100) : delta;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
        showDelta && delta > 0
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-1"
      }`}
    >
      +{fmtBRL(value)}
    </span>
  );
}

export function LivePulse() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}
