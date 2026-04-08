"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
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

    const base = isWeekend ? 62_000 : 118_000;
    const variance = base * 0.45;
    const recovered = Math.round(base + (rand() - 0.4) * variance);
    const commission = Math.round(recovered * (commissionRate / 100));
    const cases = Math.round(recovered / 2400 + rand() * 12);

    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    days.push({ date: `${year}-${mm}-${dd}`, day: d, recovered, commission, cases });
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
  const [open, setOpen] = useState(false);
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] px-4 py-3 transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02] group"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Calendário</p>
            <p className="text-[0.65rem] text-gray-400 dark:text-gray-500">Fev–Mar · recuperação diária</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-4 transition-colors">
      {/* Header with close */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-[var(--accent)]/60" />
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Calendário de recuperação</p>
        </div>
        <button
          onClick={() => { setOpen(false); setSelectedDay(null); }}
          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { setMonthIdx(Math.max(0, monthIdx - 1)); setSelectedDay(null); }}
          disabled={monthIdx === 0}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-gray-900 dark:text-white">{current.label}</span>
        <button
          onClick={() => { setMonthIdx(Math.min(months.length - 1, monthIdx + 1)); setSelectedDay(null); }}
          disabled={monthIdx === months.length - 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[0.55rem] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 py-0.5">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
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
                "relative aspect-square rounded-md flex flex-col items-center justify-center gap-0 text-xs transition-all",
                isSelected
                  ? "ring-1.5 ring-[var(--accent)] bg-[var(--accent)]/10"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800",
              )}
            >
              <span className={cn(
                "text-[0.65rem] font-medium leading-none",
                isSelected ? "text-[var(--accent)]" : "text-gray-700 dark:text-gray-300",
              )}>
                {d.day}
              </span>
              <span className={cn(
                "text-[0.45rem] font-semibold tabular-nums leading-none mt-0.5",
                isSelected ? "text-[var(--accent)]" : "text-gray-400 dark:text-gray-500",
              )}>
                {fmtK(d.recovered)}
              </span>
              <div className="absolute bottom-0 left-0.5 right-0.5 h-[2px] rounded-full bg-gray-100 dark:bg-gray-800">
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
        <div className="mt-2.5 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-3">
          <p className="text-[0.55rem] font-semibold uppercase tracking-wider text-[var(--accent)] mb-1.5">
            {sel.day} de {MONTH_NAMES[current.month]}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <p className="text-[0.5rem] text-gray-400">Recuperado</p>
              <p className="text-[0.75rem] font-bold tabular-nums text-gray-900 dark:text-white">{fmtBRL(sel.recovered)}</p>
            </div>
            <div>
              <p className="text-[0.5rem] text-gray-400">Comissão</p>
              <p className="text-[0.75rem] font-bold tabular-nums text-[var(--accent)]">{fmtBRL(sel.commission)}</p>
            </div>
            <div>
              <p className="text-[0.5rem] text-gray-400">Casos</p>
              <p className="text-[0.75rem] font-bold tabular-nums text-gray-900 dark:text-white">{sel.cases}</p>
            </div>
          </div>
        </div>
      )}

      {/* Month totals */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <div className="glass-inset rounded-md px-2 py-1.5 text-center">
          <p className="text-[0.45rem] font-semibold uppercase tracking-wider text-gray-400">Recuperado</p>
          <p className="text-[0.7rem] font-bold tabular-nums text-gray-900 dark:text-white mt-0.5">{fmtBRL(totalRecovered)}</p>
        </div>
        <div className="glass-inset rounded-md px-2 py-1.5 text-center">
          <p className="text-[0.45rem] font-semibold uppercase tracking-wider text-gray-400">Comissão</p>
          <p className="text-[0.7rem] font-bold tabular-nums text-[var(--accent)] mt-0.5">{fmtBRL(totalCommission)}</p>
        </div>
        <div className="glass-inset rounded-md px-2 py-1.5 text-center">
          <p className="text-[0.45rem] font-semibold uppercase tracking-wider text-gray-400">Casos</p>
          <p className="text-[0.7rem] font-bold tabular-nums text-gray-900 dark:text-white mt-0.5">{totalCases}</p>
        </div>
      </div>
    </div>
  );
}
