import {
  CheckCircle2,
  Clock,
  CreditCard,
  MessageSquare,
  Phone,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { RecoveryChart } from "@/components/ui/recovery-chart";
import type { DataPoint } from "@/components/ui/recovery-chart";
import { LiveRecoveryFeed } from "@/components/marketing/live-recovery-feed";
import { RecoveryCalendar } from "@/components/marketing/recovery-calendar";
import { requireAuthenticatedSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Painel | PagRecovery",
};

/* ── Showcase numbers ── */

const RECOVERY_RATE = 19;
const COMMISSION_RATE = 15;
const MONTHLY_RECOVERED = 3_269_838.00;
const MONTHLY_COMMISSION = 490_475.70;
const DAILY_COMMISSION = 16_349.19;
const TOTAL_FAILED = Math.round(MONTHLY_RECOVERED / (RECOVERY_RATE / 100));
const AVG_RECOVERY_HOURS = 4.2;
const ACTIVE_CASES = 1_847;
const ACTIONABLE_NOW = 612;

/* Chart: non-linear growth with dips, dramatic acceleration, lines converging */
const CHART_DATA: DataPoint[] = [
  { label: "Out", recovered: 189, lost: 1580 },
  { label: "Nov", recovered: 312, lost: 1450 },
  { label: "Dez", recovered: 256, lost: 1520 },
  { label: "Jan", recovered: 487, lost: 1280 },
  { label: "Fev", recovered: 734, lost: 1040 },
  { label: "Mar", recovered: 1091, lost: 870 },
  { label: "Abr", recovered: 1247, lost: 847 },
];

const CHANNELS = { whatsapp: 72, email: 21, voice: 7 };

/* ── Demo CRM leads ── */

type DemoLead = {
  name: string;
  email: string;
  phone: string;
  product: string;
  value: number;
  status: "RECOVERED" | "CONTACTING" | "WAITING_CUSTOMER" | "NEW_RECOVERY";
  updatedAgo: string;
};

const DEMO_LEADS: DemoLead[] = [
  { name: "Mariana Costa Silva", email: "mariana.cs@outlook.com", phone: "(11) 98742-3156", product: "Plano Pro Anual", value: 2497_00, status: "RECOVERED", updatedAgo: "2h" },
  { name: "Rafael Oliveira", email: "rafael.oliv@gmail.com", phone: "(21) 99631-8204", product: "Setup Enterprise", value: 8900_00, status: "RECOVERED", updatedAgo: "3h" },
  { name: "Juliana Mendes", email: "ju.mendes@empresa.com.br", phone: "(31) 97455-6012", product: "Licença Semestral", value: 1450_00, status: "RECOVERED", updatedAgo: "5h" },
  { name: "Thiago Almeida", email: "thiago.alm@hotmail.com", phone: "(11) 96321-4578", product: "Consultoria Premium", value: 4200_00, status: "CONTACTING", updatedAgo: "1h" },
  { name: "Fernanda Lima", email: "fe.lima@yahoo.com.br", phone: "(41) 99887-2301", product: "Plano Business", value: 3150_00, status: "WAITING_CUSTOMER", updatedAgo: "4h" },
  { name: "Carlos Eduardo Santos", email: "carlos.e.santos@gmail.com", phone: "(19) 98234-7761", product: "Assinatura Anual", value: 1997_00, status: "CONTACTING", updatedAgo: "30min" },
  { name: "Beatriz Nogueira", email: "bia.nogueira@icloud.com", phone: "(51) 99102-3345", product: "Plano Pro Mensal", value: 299_00, status: "NEW_RECOVERY", updatedAgo: "15min" },
  { name: "Lucas Ferreira", email: "lucas.f@empresa.io", phone: "(85) 98765-4410", product: "Setup + Treinamento", value: 5600_00, status: "RECOVERED", updatedAgo: "6h" },
  { name: "Amanda Rocha", email: "amanda.rocha@outlook.com", phone: "(27) 99632-1185", product: "Plano Starter", value: 197_00, status: "WAITING_CUSTOMER", updatedAgo: "2h" },
  { name: "Pedro Henrique Dias", email: "pedro.hd@gmail.com", phone: "(62) 98544-3290", product: "Enterprise Anual", value: 12000_00, status: "RECOVERED", updatedAgo: "1d" },
];

/* ── Formatters ── */

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

function fmtBRLCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

const STATUS_LABELS: Record<DemoLead["status"], string> = {
  RECOVERED: "Recuperado",
  CONTACTING: "Em contato",
  WAITING_CUSTOMER: "Aguardando",
  NEW_RECOVERY: "Novo",
};

const STATUS_COLORS: Record<DemoLead["status"], string> = {
  RECOVERED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CONTACTING: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  WAITING_CUSTOMER: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  NEW_RECOVERY: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

/* ── Page ── */

export default async function MarketingPage() {
  await requireAuthenticatedSession(["admin", "market"]);

  const recoveredCount = CHART_DATA.reduce((s, d) => s + d.recovered, 0);
  const recoveredLeads = DEMO_LEADS.filter((l) => l.status === "RECOVERED");

  return (
    <PlatformAppPage currentPath="/marketing">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <PlatformMetricCard
          icon={Wallet}
          label="comissão recebida"
          value={fmtBRLFull(MONTHLY_COMMISSION)}
          subtitle={`${fmtBRLFull(DAILY_COMMISSION)}/dia · ${COMMISSION_RATE}% do recuperado`}
        />
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
              <p className="eyebrow text-gray-400 dark:text-gray-500">Resultados financeiros</p>
              <h3 className="mt-1 text-[0.95rem] font-semibold tracking-[-0.01em] text-gray-900 dark:text-white">
                Bruto recuperado vs. Comissão PagRecovery
              </h3>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="glass-inset rounded-xl p-5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Bruto recuperado</p>
                <p className="mt-3 text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white tabular-nums">{fmtBRL(MONTHLY_RECOVERED)}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">/mês · devolvido aos clientes</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-3 w-3" />+{RECOVERY_RATE}%
                  </span>
                  <span className="text-[0.65rem] text-gray-400">taxa de recuperação</span>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.04] p-5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent)]">Comissão PagRecovery ({COMMISSION_RATE}%)</p>
                <p className="mt-3 text-[1.75rem] font-bold tracking-[-0.03em] text-[var(--accent)] tabular-nums">
                  {fmtBRLFull(MONTHLY_COMMISSION)}<span className="text-base font-semibold opacity-70">/mês</span>
                </p>
                <p className="mt-1 text-xs text-[var(--accent)]/60">≈ {fmtBRLFull(DAILY_COMMISSION)}/dia</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--accent)]">
                    <CheckCircle2 className="h-3 w-3" />Recorrente
                  </span>
                  <span className="text-[0.65rem] text-[var(--accent)]/50">comissão sobre recuperado</span>
                </div>
              </div>
            </div>
          </PlatformSurface>

          {/* CRM — Leads table */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow text-gray-400 dark:text-gray-500">CRM de recuperação</p>
                <h3 className="mt-1 text-[0.95rem] font-semibold tracking-[-0.01em] text-gray-900 dark:text-white">
                  Leads em operação
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="muted-pill inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs">
                  <Users className="h-3 w-3 text-[var(--accent)]/60" />
                  {DEMO_LEADS.length} leads
                </span>
                <span className="muted-pill inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500/60" />
                  {recoveredLeads.length} recuperados
                </span>
              </div>
            </div>

            {/* Desktop table */}
            <div className="mt-4 hidden md:block">
              <div className="grid grid-cols-[1fr_1.2fr_0.7fr_0.6fr_0.5fr] gap-3 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                <span>Cliente</span>
                <span>Contato</span>
                <span>Produto</span>
                <span className="text-right">Valor</span>
                <span className="text-right">Status</span>
              </div>
              <div className="space-y-1">
                {DEMO_LEADS.map((lead, i) => (
                  <div key={i} className="glass-inset glass-hover grid grid-cols-[1fr_1.2fr_0.7fr_0.6fr_0.5fr] items-center gap-3 rounded-xl px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{lead.email}</p>
                      <p className="truncate text-xs text-gray-400 dark:text-gray-500">{lead.phone}</p>
                    </div>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{lead.product}</p>
                    <p className="text-right text-sm font-semibold tabular-nums text-[var(--accent)]">{fmtBRLCents(lead.value)}</p>
                    <div className="flex justify-end">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="mt-4 space-y-2 md:hidden">
              {DEMO_LEADS.map((lead, i) => (
                <div key={i} className="glass-inset rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                      <p className="truncate text-xs text-gray-400">{lead.email}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--accent)]">{fmtBRLCents(lead.value)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${STATUS_COLORS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                    <span className="text-[0.65rem] text-gray-400">{lead.product}</span>
                  </div>
                </div>
              ))}
            </div>
          </PlatformSurface>

          {/* Live recovery feed — replaces static chat */}
          <PlatformSurface className="overflow-hidden">
            <LiveRecoveryFeed />
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:scrollbar-thin">
          {/* Calendar */}
          <RecoveryCalendar commissionRate={COMMISSION_RATE} />

          {/* Operation health */}
          <PlatformSurface className="p-5">
            <p className="eyebrow text-gray-400 dark:text-gray-500">Saúde da operação</p>
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
            <p className="eyebrow text-gray-400 dark:text-gray-500">Canais de recuperação</p>
            <div className="mt-4 space-y-3.5">
              <ChannelBar label="WhatsApp" icon={MessageSquare} count={CHANNELS.whatsapp} total={100} color="bg-[var(--accent)]" />
              <ChannelBar label="Email" icon={Zap} count={CHANNELS.email} total={100} color="bg-blue-500" />
              <ChannelBar label="Voz (IA)" icon={Phone} count={CHANNELS.voice} total={100} color="bg-purple-500" />
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">Distribuição por canal de primeiro contato</p>
          </PlatformSurface>

          {/* Revenue summary */}
          <PlatformSurface className="p-5">
            <p className="eyebrow text-gray-400 dark:text-gray-500">Resumo de receita</p>
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

function LegendPill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="muted-pill inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.06em]">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {children}
    </span>
  );
}

function ChannelBar({ label, icon: Icon, count, total, color }: { label: string; icon: React.ElementType; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        </div>
        <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">{count}%</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-1.5 rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${highlight ? "text-[var(--accent)]" : "text-gray-900 dark:text-white"}`}>{value}</span>
      </div>
    </div>
  );
}
