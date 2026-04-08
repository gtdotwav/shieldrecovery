import {
  CheckCircle2,
  Clock,
  CreditCard,
  MessageSquare,
  Phone,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { RecoveryChart } from "@/components/ui/recovery-chart";
import type { DataPoint } from "@/components/ui/recovery-chart";
import { requireAuthenticatedSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketing | PagRecovery",
};

/* ── Showcase numbers ── */

const RECOVERY_RATE = 19;
const MONTHLY_RECOVERED = 304_871.42;
const DAILY_COMMISSION = 10_162.38;
const MONTHLY_COMMISSION = DAILY_COMMISSION * 30;
const TOTAL_FAILED = Math.round(MONTHLY_RECOVERED / (RECOVERY_RATE / 100));
const AVG_RECOVERY_HOURS = 4.2;
const ACTIVE_CASES = 243;
const ACTIONABLE_NOW = 85;

const CHART_DATA: DataPoint[] = [
  { label: "Nov", recovered: 18, lost: 282 },
  { label: "Dez", recovered: 25, lost: 275 },
  { label: "Jan", recovered: 33, lost: 267 },
  { label: "Fev", recovered: 40, lost: 260 },
  { label: "Mar", recovered: 48, lost: 252 },
  { label: "Abr", recovered: 57, lost: 243 },
];

const CHANNELS = { whatsapp: 72, email: 21, voice: 7 };

function fmtBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtBRLFull(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/* ── Page ── */

export default async function MarketingPage() {
  await requireAuthenticatedSession(["admin", "market"]);

  const recoveredCount = CHART_DATA.reduce((s, d) => s + d.recovered, 0);

  return (
    <PlatformAppPage currentPath="/marketing">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={CreditCard}
          label="em recuperação"
          value={ACTIVE_CASES.toString()}
          subtitle={`${ACTIONABLE_NOW} para agir agora`}
        />
        <PlatformMetricCard
          icon={CheckCircle2}
          label="recuperados"
          value={recoveredCount.toString()}
          subtitle={fmtBRL(MONTHLY_RECOVERED)}
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="taxa de recuperação"
          value={`${RECOVERY_RATE}%`}
          subtitle={`de ${fmtBRL(TOTAL_FAILED)} em falha`}
        />
        <PlatformMetricCard
          icon={Clock}
          label="tempo médio"
          value={`${AVG_RECOVERY_HOURS}h`}
          subtitle="até fechar recuperação"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Chart */}
          <PlatformSurface className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow text-[var(--muted)]">Evolução mensal</p>
                <h3 className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  Recuperadas vs. abertas
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <LegendPill color="bg-[var(--accent)]">recuperadas</LegendPill>
                <LegendPill color="bg-[var(--muted)] opacity-50">abertas</LegendPill>
              </div>
            </div>
            <div className="mt-5 -mx-1">
              <RecoveryChart data={CHART_DATA} />
            </div>
          </PlatformSurface>

          {/* Financial results — Gross vs Commission */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="border-b border-[var(--border)] pb-4">
              <p className="eyebrow text-gray-400 dark:text-gray-500">
                Resultados financeiros
              </p>
              <h3 className="mt-1 text-[0.95rem] font-semibold tracking-[-0.01em] text-gray-900 dark:text-white">
                Bruto recuperado vs. Comissão PagRecovery
              </h3>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {/* Gross */}
              <div className="glass-inset rounded-xl p-5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Bruto recuperado
                </p>
                <p className="mt-3 text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white tabular-nums">
                  {fmtBRL(MONTHLY_RECOVERED)}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  /mês · devolvido aos clientes
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    +{RECOVERY_RATE}%
                  </span>
                  <span className="text-[0.65rem] text-gray-400">taxa de recuperação</span>
                </div>
              </div>

              {/* Commission */}
              <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent)]">
                  Comissão PagRecovery
                </p>
                <p className="mt-3 text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--accent)] tabular-nums">
                  {fmtBRL(DAILY_COMMISSION)}
                  <span className="text-base font-semibold opacity-70">/dia</span>
                </p>
                <p className="mt-1 text-xs text-[var(--accent)]/60">
                  ≈ {fmtBRLFull(MONTHLY_COMMISSION)}/mês
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--accent)]">
                    <CheckCircle2 className="h-3 w-3" />
                    Recorrente
                  </span>
                  <span className="text-[0.65rem] text-[var(--accent)]/50">comissão sobre recuperado</span>
                </div>
              </div>
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          {/* Operation health */}
          <PlatformSurface className="p-5">
            <p className="eyebrow text-gray-400 dark:text-gray-500">
              Saúde da operação
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Volume em falha" value={fmtBRL(TOTAL_FAILED)} highlight />
              <MetricLine label="Recuperado (bruto)" value={fmtBRL(MONTHLY_RECOVERED)} />
              <MetricLine label="Comissão/dia" value={fmtBRL(DAILY_COMMISSION)} highlight />
              <MetricLine label="Casos ativos" value={ACTIVE_CASES.toString()} />
              <MetricLine label="Para agir agora" value={ACTIONABLE_NOW.toString()} />
              <MetricLine label="Tempo médio" value={`${AVG_RECOVERY_HOURS}h`} />
            </div>
          </PlatformSurface>

          {/* Channel coverage */}
          <PlatformSurface className="p-5">
            <p className="eyebrow text-gray-400 dark:text-gray-500">
              Canais de recuperação
            </p>
            <div className="mt-4 space-y-3.5">
              <ChannelBar
                label="WhatsApp"
                icon={MessageSquare}
                count={CHANNELS.whatsapp}
                total={100}
                color="bg-[var(--accent)]"
              />
              <ChannelBar
                label="Email"
                icon={Zap}
                count={CHANNELS.email}
                total={100}
                color="bg-blue-500"
              />
              <ChannelBar
                label="Voz (IA)"
                icon={Phone}
                count={CHANNELS.voice}
                total={100}
                color="bg-purple-500"
              />
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Distribuição por canal de primeiro contato
            </p>
          </PlatformSurface>

          {/* Revenue summary */}
          <PlatformSurface className="p-5">
            <p className="eyebrow text-gray-400 dark:text-gray-500">
              Resumo de receita
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Receita diária" value={fmtBRL(DAILY_COMMISSION)} highlight />
              <MetricLine label="Receita mensal" value={fmtBRL(MONTHLY_COMMISSION)} highlight />
              <MetricLine label="Taxa de recuperação" value={`${RECOVERY_RATE}%`} />
              <MetricLine label="Recuperação/mês" value={fmtBRL(MONTHLY_RECOVERED)} />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

/* ── Helper components ── */

function LegendPill({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="muted-pill inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.06em]">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {children}
    </span>
  );
}

function ChannelBar({
  label,
  icon: Icon,
  count,
  total,
  color,
}: {
  label: string;
  icon: React.ElementType;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {label}
          </span>
        </div>
        <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
          {count}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MetricLine({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span
          className={`text-sm font-semibold tabular-nums ${highlight ? "text-[var(--accent)]" : "text-gray-900 dark:text-white"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
