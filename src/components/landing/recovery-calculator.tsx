"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowRight, Calculator, TrendingUp } from "lucide-react";
import Link from "next/link";

/* ───────── constants ───────── */

const RECOVERY_RATE = 0.38;
const PRESETS = [
  { label: "Pequeno", revenue: 50_000, ticket: 97 },
  { label: "Médio", revenue: 250_000, ticket: 247 },
  { label: "Grande", revenue: 1_000_000, ticket: 497 },
];

/* ───────── helpers ───────── */

function parseBRL(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) / 100 : 0;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatBRLInput(cents: number): string {
  if (cents === 0) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ───────── component ───────── */

export function RecoveryCalculator() {
  const [revenueCents, setRevenueCents] = useState(250_000_00); // R$ 250.000
  const [failureRate, setFailureRate] = useState(12); // 12%
  const [ticketCents, setTicketCents] = useState(247_00); // R$ 247

  const results = useMemo(() => {
    const monthlyFailed = revenueCents * (failureRate / 100);
    const monthlyRecovered = monthlyFailed * RECOVERY_RATE;
    const annualRecovered = monthlyRecovered * 12;
    const transactionsRecovered = ticketCents > 0
      ? Math.round(monthlyRecovered / ticketCents)
      : 0;

    return {
      monthlyFailed: Math.round(monthlyFailed),
      monthlyRecovered: Math.round(monthlyRecovered),
      annualRecovered: Math.round(annualRecovered),
      transactionsRecovered,
    };
  }, [revenueCents, failureRate, ticketCents]);

  const handleRevenueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseBRL(e.target.value);
    if (val <= 999_999_999_00) setRevenueCents(val);
  }, []);

  const handleTicketChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseBRL(e.target.value);
    if (val <= 999_999_00) setTicketCents(val);
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setRevenueCents(preset.revenue * 100);
    setTicketCents(preset.ticket * 100);
  }, []);

  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
      <div className="text-center">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]/70">
          Simulador
        </p>
        <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-white sm:text-[2.2rem]">
          Quanto você pode recuperar?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-white/40">
          Insira os dados do seu negócio e veja a projeção de receita
          recuperável com a PagRecovery.
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-[62rem]">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[rgba(6,20,15,0.5)] shadow-[0_32px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            {/* ─── Inputs ─── */}
            <div className="border-b border-white/[0.04] p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(30,215,96,0.06)]">
                  <Calculator className="h-4 w-4 text-[var(--accent)]/60" />
                </div>
                <h3 className="text-[0.88rem] font-semibold text-white/80">
                  Dados do negócio
                </h3>
              </div>

              {/* Presets */}
              <div className="mt-5 flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[0.68rem] font-medium text-white/40 transition-colors hover:border-[rgba(30,215,96,0.15)] hover:bg-[rgba(30,215,96,0.04)] hover:text-white/65"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-5">
                {/* Revenue */}
                <InputField
                  label="Faturamento mensal"
                  prefix="R$"
                  value={formatBRLInput(revenueCents)}
                  onChange={handleRevenueChange}
                  hint="Receita total processada por mês"
                />

                {/* Failure rate */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[0.72rem] font-medium text-white/50">
                      Taxa de falha
                    </label>
                    <span className="text-[0.72rem] font-semibold tabular-nums text-white/70">
                      {failureRate}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    value={failureRate}
                    onChange={(e) => setFailureRate(Number(e.target.value))}
                    className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.06] accent-[var(--accent)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--accent)] [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(30,215,96,0.3)]"
                  />
                  <div className="mt-1.5 flex justify-between text-[0.55rem] text-white/20">
                    <span>1%</span>
                    <span>Média do mercado: 8–15%</span>
                    <span>40%</span>
                  </div>
                </div>

                {/* Ticket */}
                <InputField
                  label="Ticket médio"
                  prefix="R$"
                  value={formatBRLInput(ticketCents)}
                  onChange={handleTicketChange}
                  hint="Valor médio por transação"
                />
              </div>

              <p className="mt-6 text-[0.6rem] leading-4 text-white/20">
                * Projeção baseada em taxa de recuperação de {(RECOVERY_RATE * 100).toFixed(0)}%,
                média observada em operações ativas da PagRecovery.
              </p>
            </div>

            {/* ─── Results ─── */}
            <div className="relative flex flex-col justify-center p-6 sm:p-8">
              {/* Subtle background glow */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,215,96,0.03),transparent_70%)]" />

              <div className="relative space-y-6">
                <div>
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-white/30">
                    Perda mensal estimada
                  </p>
                  <p className="mt-1.5 text-[1.6rem] font-bold tracking-tight text-[#ff7a74]/80 sm:text-[1.85rem]">
                    -{formatBRL(results.monthlyFailed)}
                  </p>
                </div>

                <div className="h-px bg-white/[0.05]" />

                <div>
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--accent)]/50">
                    Recuperação mensal projetada
                  </p>
                  <p className="mt-1.5 text-[2rem] font-bold tracking-tight text-[var(--accent)] sm:text-[2.4rem]">
                    +{formatBRL(results.monthlyRecovered)}
                  </p>
                  <p className="mt-1 text-[0.72rem] text-white/30">
                    ~{results.transactionsRecovered} transações/mês
                  </p>
                </div>

                <div className="h-px bg-white/[0.05]" />

                <div className="rounded-xl border border-[rgba(30,215,96,0.08)] bg-[rgba(30,215,96,0.03)] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[var(--accent)]/50" />
                    <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--accent)]/50">
                      Projeção anual
                    </p>
                  </div>
                  <p className="mt-2 text-[2.2rem] font-bold tracking-tight text-white sm:text-[2.6rem]">
                    {formatBRL(results.annualRecovered)}
                  </p>
                  <p className="mt-1 text-[0.72rem] text-white/30">
                    em receita que seria perdida
                  </p>
                </div>

                <Link
                  href="/dashboard"
                  className="glass-button-primary group mt-2 inline-flex w-full items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold"
                >
                  Começar a recuperar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── sub-components ───────── */

function InputField({
  label,
  prefix,
  value,
  onChange,
  hint,
}: {
  label: string;
  prefix: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint: string;
}) {
  return (
    <div>
      <label className="text-[0.72rem] font-medium text-white/50">
        {label}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.78rem] font-medium text-white/25">
          {prefix}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={onChange}
          placeholder="0,00"
          className="w-full rounded-lg border border-white/[0.07] bg-white/[0.03] py-2.5 pl-10 pr-4 text-[0.88rem] font-semibold tabular-nums text-white/80 outline-none transition-colors placeholder:text-white/15 focus:border-[rgba(30,215,96,0.25)] focus:ring-1 focus:ring-[rgba(30,215,96,0.08)]"
        />
      </div>
      <p className="mt-1 text-[0.6rem] text-white/20">{hint}</p>
    </div>
  );
}
