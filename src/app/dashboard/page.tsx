import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Clock,
  Download,
  PhoneCall,
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
import { platformBrand } from "@/lib/platform";
import { recommendedNextAction, scorePriority } from "@/lib/stage";
import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type { FollowUpContact } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recuperação",
};

export default async function DashboardPage() {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const callStorage = getStorageService();
  const sellerIdentity =
    session.role === "seller"
      ? await getSellerIdentityByEmail(session.email)
      : null;

  const [analytics, allContacts, callAnalytics] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
    callStorage.getCallAnalytics(),
  ]);

  // Filter contacts by seller when applicable
  const contacts = allContacts.filter((c) =>
    canRoleAccessAgent(session.role, c.assigned_agent, sellerIdentity?.agentName),
  );

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

  // Seller-specific analytics override
  const sellerAnalytics =
    session.role === "seller"
      ? {
          total_failed_payments: contacts.length,
          recovered_payments: recoveredContacts.length,
          recovery_rate:
            contacts.length > 0
              ? (recoveredContacts.length / contacts.length) * 100
              : 0,
          recovered_revenue: recoveredContacts.reduce(
            (sum, c) => sum + c.payment_value,
            0,
          ),
          average_recovery_time_hours: analytics.average_recovery_time_hours,
          active_recoveries: activeContacts.length,
        }
      : analytics;

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
        <div className="flex flex-wrap items-center gap-2">
          {session.role === "admin" ? (
            <a
              href="/api/export/contacts"
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </a>
          ) : null}
          <Link
            href="/leads"
            className="glass-button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold"
          >
            Abrir CRM
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
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
          subtitle={formatCurrency(sellerAnalytics.recovered_revenue)}
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="taxa de recuperacao"
          value={`${sellerAnalytics.recovery_rate.toFixed(1)}%`}
          subtitle={`${waitingContacts.length} aguardando cliente`}
        />
        <PlatformMetricCard
          icon={Clock}
          label="tempo medio"
          value={formatAverageRecoveryTime(sellerAnalytics.average_recovery_time_hours)}
          subtitle="ate fechar recuperacao"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Chart */}
          <PlatformSurface className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  Evolucao mensal
                </p>
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
              <RecoveryChart data={chartData} />
            </div>
          </PlatformSurface>

          {/* Priority leads */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                  Prioridades
                </p>
                <h3 className="mt-1 text-[0.95rem] font-semibold tracking-[-0.01em] text-gray-900 dark:text-white">
                  Casos que abrem o dia
                </h3>
              </div>
              <Link
                href="/leads"
                className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent)]"
              >
                Ver todos
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {prioritizedContacts.length === 0 ? (
                <PlatformInset className="p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
              Saude da carteira
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Receita em risco" value={formatCurrency(revenueAtRisk)} highlight />
              <MetricLine label="Para agir" value={actionableContacts.length.toString()} />
              <MetricLine label="Aguardando cliente" value={waitingContacts.length.toString()} />
              {session.role === "admin" ? (
                <MetricLine
                  label="Sem responsavel"
                  value={activeContacts.filter((c) => !c.assigned_agent).length.toString()}
                />
              ) : null}
              <MetricLine label="Alcancaveis" value={`${reachableCount} de ${activeContacts.length}`} />
            </div>
          </PlatformSurface>

          {/* Channel coverage */}
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
              Canais disponiveis
            </p>
            <div className="mt-4 space-y-3.5">
              <ChannelBar label="WhatsApp" count={whatsappCount} total={contacts.length} color="bg-[var(--accent)]" />
              <ChannelBar label="Email" count={emailCount} total={contacts.length} color="bg-[var(--accent-strong)]" />
              {callAnalytics.totalCalls > 0 ? (
                <ChannelBar label="Voz (CallCenter)" count={callAnalytics.completedCalls} total={callAnalytics.totalCalls} color="bg-blue-500" />
              ) : null}
            </div>
            {contacts.length > 0 ? (
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
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
    <span className="muted-pill inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.06em]">
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
          {count} <span className="text-gray-400 dark:text-gray-500">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
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

function PriorityLeadRow({ contact }: { contact: FollowUpContact }) {
  return (
    <Link
      href={`/leads/${contact.lead_id}`}
      className="glass-inset glass-hover group block rounded-xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {contact.customer_name}
            </p>
            <StageBadge stage={contact.lead_status} />
            <TimeBadge updatedAt={contact.updated_at} />
          </div>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
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
    <span className="muted-pill inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs">
      <span className="text-gray-400 dark:text-gray-500">{label}:</span>
      <span className="font-medium text-gray-700 dark:text-gray-200">{value}</span>
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
