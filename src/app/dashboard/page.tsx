import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Clock,
  TrendingUp,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { RecoveryChart } from "@/components/ui/recovery-chart";
import type { DataPoint } from "@/components/ui/recovery-chart";
import { StageBadge } from "@/components/ui/stage-badge";
import { TimeBadge } from "@/components/ui/time-badge";
import { hasPhone, pickBestContact } from "@/lib/contact";
import { formatCurrency } from "@/lib/format";
import { recommendedNextAction, scorePriority } from "@/lib/stage";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type { FollowUpContact } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recuperacao | PagRecovery",
};

export default async function DashboardPage() {
  await requireAuthenticatedSession(["admin"]);
  const service = getPaymentRecoveryService();
  const [analytics, contacts] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
  ]);

  const activeContacts = contacts.filter(
    (c) => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST",
  );
  const recoveredContacts = contacts.filter(
    (c) => c.lead_status === "RECOVERED",
  );
  const waitingContacts = activeContacts.filter(
    (c) => c.lead_status === "WAITING_CUSTOMER",
  );
  const actionableContacts = activeContacts.filter(
    (c) => c.lead_status === "NEW_RECOVERY" || c.lead_status === "CONTACTING",
  );

  const prioritizedContacts = [...activeContacts]
    .sort((a, b) => scorePriority(b) - scorePriority(a))
    .slice(0, 5);

  const whatsappCount = contacts.filter((c) => hasPhone(c.phone)).length;
  const emailCount = contacts.filter(
    (c) => c.email && c.email.includes("@"),
  ).length;
  const reachableCount = activeContacts.filter(
    (c) => hasPhone(c.phone) || (c.email && c.email.includes("@")),
  ).length;

  const revenueAtRisk = activeContacts.reduce(
    (sum, c) => sum + c.payment_value,
    0,
  );

  const chartData = buildChartData(contacts);

  return (
    <PlatformAppPage
      currentPath="/dashboard"
      action={
        <Link
          href="/leads"
          className="glass-button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
        >
          Abrir CRM
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={CreditCard}
          label="em recuperacao"
          value={activeContacts.length.toString()}
          subtitle={`${actionableContacts.length} para agir agora`}
        />
        <PlatformMetricCard
          icon={CheckCircle2}
          label="recuperados"
          value={recoveredContacts.length.toString()}
          subtitle={formatCurrency(analytics.recovered_revenue)}
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="taxa de recuperacao"
          value={`${analytics.recovery_rate.toFixed(1)}%`}
          subtitle={`${waitingContacts.length} aguardando cliente`}
        />
        <PlatformMetricCard
          icon={Clock}
          label="tempo medio"
          value={formatAverageRecoveryTime(analytics.average_recovery_time_hours)}
          subtitle="ate fechar recuperacao"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Chart */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="ambient-divider flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                Evolucao mensal
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-white">
                Recuperadas vs. abertas
              </h3>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <LegendPill color="bg-[#1ED760]">recuperadas</LegendPill>
                <LegendPill color="bg-white/50">abertas</LegendPill>
              </div>
            </div>
            <div className="mt-4">
              <RecoveryChart data={chartData} />
            </div>
          </PlatformSurface>

          {/* Priority leads */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="ambient-divider flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                  Prioridades
                </p>
                <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-white">
                  Casos que abrem o dia
                </h3>
              </div>
              <Link
                href="/leads"
                className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[#72f2a2]"
              >
                Ver todos
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {prioritizedContacts.length === 0 ? (
                <PlatformInset className="p-6 text-center">
                  <p className="text-sm text-[rgba(255,255,255,0.54)]">
                    Nenhum caso ativo na carteira.
                  </p>
                </PlatformInset>
              ) : (
                prioritizedContacts.map((contact) => (
                  <PriorityLeadRow key={contact.lead_id} contact={contact} />
                ))
              )}
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          {/* Portfolio health */}
          <PlatformSurface className="p-5">
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Saude da carteira
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Receita em risco" value={formatCurrency(revenueAtRisk)} highlight />
              <MetricLine label="Para agir" value={actionableContacts.length.toString()} />
              <MetricLine label="Aguardando cliente" value={waitingContacts.length.toString()} />
              <MetricLine
                label="Sem responsavel"
                value={activeContacts.filter((c) => !c.assigned_agent).length.toString()}
              />
              <MetricLine label="Alcancaveis" value={`${reachableCount} de ${activeContacts.length}`} />
            </div>
          </PlatformSurface>

          {/* Channel coverage */}
          <PlatformSurface className="p-5">
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Canais disponiveis
            </p>
            <div className="mt-4 space-y-3.5">
              <ChannelBar label="WhatsApp" count={whatsappCount} total={contacts.length} color="bg-[#1ED760]" />
              <ChannelBar label="Email" count={emailCount} total={contacts.length} color="bg-[#0FA47A]" />
            </div>
            {contacts.length > 0 ? (
              <p className="mt-4 text-xs text-[rgba(255,255,255,0.42)]">
                {contacts.length} contatos no total
              </p>
            ) : null}
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
    <span className="muted-pill inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.72rem] font-medium uppercase tracking-[0.12em]">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {children}
    </span>
  );
}

function ChannelBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[rgba(255,255,255,0.82)]">{label}</span>
        <span className="text-sm tabular-nums text-[rgba(255,255,255,0.64)]">
          {count} <span className="text-[rgba(255,255,255,0.38)]">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/6">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
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
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-[rgba(255,255,255,0.6)]">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${highlight ? "text-[var(--accent)]" : "text-white"}`}
      >
        {value}
      </span>
      </div>
    </div>
  );
}

function PriorityLeadRow({ contact }: { contact: FollowUpContact }) {
  return (
    <Link
      href={`/leads/${contact.lead_id}`}
      className="glass-inset glass-hover group block rounded-[1.1rem] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">
              {contact.customer_name}
            </p>
            <StageBadge stage={contact.lead_status} />
            <TimeBadge updatedAt={contact.updated_at} />
          </div>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.42)]">
            {contact.product || "Produto nao informado"} · {pickBestContact(contact.phone, contact.email)}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--accent)]">
          {formatCurrency(contact.payment_value)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <DetailPill label="Responsavel" value={contact.assigned_agent || "Sem dono"} />
        <DetailPill label="Canal" value={hasPhone(contact.phone) ? "WhatsApp" : "Email"} />
        <DetailPill label="Acao" value={recommendedNextAction(contact)} />
      </div>
    </Link>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="muted-pill inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs">
      <span className="text-[rgba(255,255,255,0.42)]">{label}:</span>
      <span className="font-medium text-[rgba(255,255,255,0.8)]">{value}</span>
    </span>
  );
}

/* ── Helpers ── */

function formatAverageRecoveryTime(hours: number) {
  if (Number.isNaN(hours) || hours < 0) return "n/d";
  if (hours === 0) return "< 1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function buildChartData(
  contacts: { lead_status: string; created_at?: string; updated_at: string }[],
): DataPoint[] {
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  const now = new Date();
  const currentMonth = now.getMonth();
  const labels: string[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    labels.push(months[(currentMonth - offset + 12) % 12]);
  }

  const activeByMonth = new Map<string, number>();
  const recoveredByMonth = new Map<string, number>();

  for (const contact of contacts) {
    const refDate = contact.updated_at || contact.created_at;
    if (!refDate) continue;
    const label = months[new Date(refDate).getMonth()];

    if (contact.lead_status === "RECOVERED") {
      recoveredByMonth.set(label, (recoveredByMonth.get(label) || 0) + 1);
    } else {
      activeByMonth.set(label, (activeByMonth.get(label) || 0) + 1);
    }
  }

  return labels.map((label) => ({
    label,
    lost: activeByMonth.get(label) || 0,
    recovered: recoveredByMonth.get(label) || 0,
  }));
}
