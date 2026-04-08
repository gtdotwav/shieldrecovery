"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Seeded pseudo-random for consistent daily data ── */

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return (s >>> 16) / 32768;
  };
}

type DayData = {
  date: string;
  day: number;
  recovered: number;
  commission: number;
  cases: number;
};

function generateMonth(year: number, month: number, commissionRate: number): DayData[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rand = seededRand(year * 100 + month);
  const days: DayData[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base: ~109k/day (3.27M/30), weekends are lower
    const base = isWeekend ? 62_000 : 118_000;
    const variance = base * 0.45;
    const recovered = Math.round(base + (rand() - 0.4) * variance);
    const commission = Math.round(recovered * (commissionRate / 100));
    const cases = Math.round(recovered / 2400 + rand() * 12);

    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    days.push({
      date: `${year}-${mm}-${dd}`,
      day: d,
      recovered,
      commission,
      cases,
    });
  }

  return days;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmtK(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function fmtBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function RecoveryCalendar({ commissionRate = 15 }: { commissionRate?: number }) {
  const [monthIdx, setMonthIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const months = useMemo(() => [
    { year: 2026, month: 1, label: "Fevereiro 2026" },
    { year: 2026, month: 2, label: "Março 2026" },
  ], []);

  const current = months[monthIdx];
  const days = useMemo(
    () => generateMonth(current.year, current.month, commissionRate),
    [current, commissionRate],
  );

  const firstDow = new Date(current.year, current.month, 1).getDay();
  const totalRecovered = days.reduce((s, d) => s + d.recovered, 0);
  const totalCommission = days.reduce((s, d) => s + d.commission, 0);
  const totalCases = days.reduce((s, d) => s + d.cases, 0);
  const maxRecovered = Math.max(...days.map((d) => d.recovered));

  const sel = days.find((d) => d.date === selectedDay);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { setMonthIdx(Math.max(0, monthIdx - 1)); setSelectedDay(null); }}
          disabled={monthIdx === 0}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{current.label}</span>
        <button
          onClick={() => { setMonthIdx(Math.min(months.length - 1, monthIdx + 1)); setSelectedDay(null); }}
          disabled={monthIdx === months.length - 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[0.6rem] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((d) => {
          const intensity = maxRecovered > 0 ? d.recovered / maxRecovered : 0;
          const isSelected = d.date === selectedDay;

          return (
            <button
              key={d.date}
              onClick={() => setSelectedDay(isSelected ? null : d.date)}
              className={cn(
                "relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-all",
                isSelected
                  ? "ring-2 ring-[var(--accent)] bg-[var(--accent)]/10"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800",
              )}
            >
              <span className={cn(
                "text-[0.7rem] font-medium",
                isSelected ? "text-[var(--accent)]" : "text-gray-700 dark:text-gray-300",
              )}>
                {d.day}
              </span>
              <span className={cn(
                "text-[0.5rem] font-semibold tabular-nums",
                isSelected ? "text-[var(--accent)]" : "text-gray-400 dark:text-gray-500",
              )}>
                {fmtK(d.recovered)}
              </span>
              {/* Intensity bar */}
              <div className="absolute bottom-0.5 left-1 right-1 h-[3px] rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${Math.round(intensity * 100)}%`, opacity: 0.3 + intensity * 0.7 }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {sel && (
        <div className="mt-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-3.5">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">
            {sel.day} de {MONTH_NAMES[current.month]}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[0.55rem] text-gray-400">Recuperado</p>
              <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{fmtBRL(sel.recovered)}</p>
            </div>
            <div>
              <p className="text-[0.55rem] text-gray-400">Comissão</p>
              <p className="text-sm font-bold tabular-nums text-[var(--accent)]">{fmtBRL(sel.commission)}</p>
            </div>
            <div>
              <p className="text-[0.55rem] text-gray-400">Casos</p>
              <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{sel.cases}</p>
            </div>
          </div>
        </div>
      )}

      {/* Month totals */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="glass-inset rounded-lg px-2.5 py-2 text-center">
          <p className="text-[0.5rem] font-semibold uppercase tracking-wider text-gray-400">Recuperado</p>
          <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white mt-0.5">{fmtBRL(totalRecovered)}</p>
        </div>
        <div className="glass-inset rounded-lg px-2.5 py-2 text-center">
          <p className="text-[0.5rem] font-semibold uppercase tracking-wider text-gray-400">Comissão</p>
          <p className="text-xs font-bold tabular-nums text-[var(--accent)] mt-0.5">{fmtBRL(totalCommission)}</p>
        </div>
        <div className="glass-inset rounded-lg px-2.5 py-2 text-center">
          <p className="text-[0.5rem] font-semibold uppercase tracking-wider text-gray-400">Casos</p>
          <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white mt-0.5">{totalCases}</p>
        </div>
      </div>
    </div>
  );
}
