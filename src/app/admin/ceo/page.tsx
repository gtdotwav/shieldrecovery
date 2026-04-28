import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  Globe,
  Layers,
  MessageCircle,
  Phone,
  QrCode,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { platformBrand } from "@/lib/platform";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";
import { getStorageService } from "@/server/recovery/services/storage";
import {
  getSplitConfig,
  getPlatformFinancials,
  listPayouts,
} from "@/server/checkout-admin";
import type {
  AdminSellerSnapshot,
  PartnerProfileRecord,
  PartnerTenantStats,
  PartnerDashboardSnapshot,
} from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CEO Dashboard",
};

export default async function CeoDashboardPage() {
  await requireAuthenticatedSession(["admin"]);

  const service = getPaymentRecoveryService();
  const storage = getStorageService();

  // Load all data in parallel
  const [snapshot, analytics] = await Promise.all([
    service.getAdminPanelSnapshot(),
    service.getRecoveryAnalytics(),
  ]);

  // Partner data
  let partnerSnapshots: PartnerDashboardSnapshot[] = [];
  let partnerProfiles: PartnerProfileRecord[] = [];
  try {
    const partnerStorage = getPartnerStorageService();
    partnerProfiles = await partnerStorage.listProfiles();
    const dashboards = await Promise.all(
      partnerProfiles.map((p) => partnerStorage.getDashboardSnapshot(p.id)),
    );
    partnerSnapshots = dashboards.filter(
      (d): d is PartnerDashboardSnapshot => d !== null,
    );
  } catch {
    // Partner system not configured
  }

  // Financial data
  let platformRevenue = 0;
  let platformPending = 0;
  let totalPayouts = 0;
  let pendingPayoutsCount = 0;
  try {
    const [financials, payoutsResult] = await Promise.all([
      getPlatformFinancials(),
      listPayouts(),
    ]);
    if (financials) {
      platformRevenue = financials.totalFees ?? 0;
      platformPending = financials.totalPendingBalance ?? 0;
    }
    if (payoutsResult?.payouts) {
      totalPayouts = payoutsResult.payouts.length;
      pendingPayoutsCount = payoutsResult.payouts.filter(
        (p) => p.status === "requested",
      ).length;
    }
  } catch {
    // Checkout not configured
  }

  // WhatsApp per-seller stats
  const sellerControls = await storage.getSellerAdminControls();
  const connectedWhatsApps = sellerControls.filter(
    (c) => c.whatsappInstanceStatus === "connected",
  ).length;
  const pendingQrSellers = sellerControls.filter(
    (c) => c.whatsappInstanceStatus === "pending_qr",
  ).length;

  // Derived metrics
  const totalPartners = partnerProfiles.length;
  const activePartners = partnerProfiles.filter((p) => p.active).length;
  const totalTenants = partnerSnapshots.reduce(
    (sum, ps) => sum + ps.totals.tenants,
    0,
  );
  const totalPartnerWebhooks = partnerSnapshots.reduce(
    (sum, ps) => sum + ps.totals.totalWebhooks,
    0,
  );
  const totalPartnerRecovered = partnerSnapshots.reduce(
    (sum, ps) => sum + ps.totals.recoveredRevenue,
    0,
  );
  const avgRecoveryRate =
    partnerSnapshots.length > 0
      ? partnerSnapshots.reduce(
          (sum, ps) => sum + ps.totals.recoveryRate,
          0,
        ) / partnerSnapshots.length
      : analytics.recovery_rate ?? 0;

  const topSellers = [...snapshot.sellers]
    .sort((a, b) => b.recoveredRevenue - a.recoveredRevenue)
    .slice(0, 8);

  const inactiveSellers = snapshot.sellers.filter(
    (s) => !s.control.active || s.activeLeads === 0,
  );
  const overloadedSellers = snapshot.sellers.filter(
    (s) => s.activeLeads > s.control.maxAssignedLeads,
  );

  return (
    <PlatformAppPage
      currentPath="/admin"
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            Recuperação
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
    >
      {/* Header */}
      <PlatformSurface className="p-5 sm:p-6">
        <div className="grid gap-5 border-b border-[var(--border)] pb-5 lg:grid-cols-[minmax(0,1.4fr)_18rem] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              <Crown className="mr-1 inline h-3 w-3" />
              CEO Dashboard
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.95rem]">
              Visão executiva da plataforma.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--foreground-secondary)]">
              Receita, partners, sellers, infraestrutura e WhatsApp em tempo real.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-6 text-[var(--foreground-secondary)]">
            <span className="font-semibold text-[var(--foreground)]">
              {platformBrand.name}
            </span>{" "}
            operando com{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {totalPartners}
            </span>{" "}
            {totalPartners === 1 ? "partner" : "partners"},{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {snapshot.totalSellers}
            </span>{" "}
            sellers e{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {connectedWhatsApps}
            </span>{" "}
            WhatsApps conectados.
          </div>
        </div>
      </PlatformSurface>

      {/* KPIs — Receita */}
      <div className="mt-5">
        <SectionLabel icon={DollarSign} label="Receita" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PlatformMetricCard
            icon={TrendingUp}
            label="Receita recuperada"
            value={formatCurrency(analytics.recovered_revenue ?? 0)}
            subtitle="valor bruto total recuperado"
          />
          <PlatformMetricCard
            icon={Wallet}
            label="Fees da plataforma"
            value={formatCurrency(platformRevenue)}
            subtitle="receita líquida (split)"
          />
          <PlatformMetricCard
            icon={Clock}
            label="Fees pendentes"
            value={formatCurrency(platformPending)}
            subtitle="em período de hold"
          />
          <PlatformMetricCard
            icon={CheckCircle2}
            label="Taxa de recuperação"
            value={`${(avgRecoveryRate * 100).toFixed(1)}%`}
            subtitle="leads recuperados / total"
          />
        </div>
      </div>

      {/* KPIs — Operação */}
      <div className="mt-5">
        <SectionLabel icon={Activity} label="Operação" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <PlatformMetricCard
            icon={Users}
            label="Sellers ativos"
            value={`${snapshot.activeSellers}/${snapshot.totalSellers}`}
            subtitle={`${inactiveSellers.length} inativos`}
          />
          <PlatformMetricCard
            icon={BarChart3}
            label="Leads ativos"
            value={snapshot.totalActiveLeads.toString()}
            subtitle={`${snapshot.unassignedLeads} sem dono`}
          />
          <PlatformMetricCard
            icon={MessageCircle}
            label="Conversas pendentes"
            value={snapshot.totalUnreadConversations.toString()}
            subtitle="não lidas"
          />
          <PlatformMetricCard
            icon={Zap}
            label="Worker"
            value={
              snapshot.worker.queueLagMinutes > 5
                ? `${snapshot.worker.queueLagMinutes}min lag`
                : "OK"
            }
            subtitle={`${snapshot.worker.processing} processando, ${snapshot.worker.failed} falhas`}
          />
          <PlatformMetricCard
            icon={QrCode}
            label="WhatsApp sellers"
            value={`${connectedWhatsApps} conectados`}
            subtitle={
              pendingQrSellers > 0
                ? `${pendingQrSellers} aguardando QR`
                : "todos conectados"
            }
          />
        </div>
      </div>

      {/* Partners */}
      <div className="mt-5">
        <SectionLabel icon={Globe} label="Partners" />
        {partnerSnapshots.length === 0 ? (
          <PlatformSurface className="mt-3 p-5">
            <p className="text-sm text-[var(--foreground-secondary)]">
              Nenhum partner configurado ainda.
            </p>
          </PlatformSurface>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {partnerSnapshots.map((ps) => (
              <PartnerCard key={ps.partner.id} snapshot={ps} />
            ))}
          </div>
        )}
      </div>

      {/* Top Sellers */}
      <div className="mt-5">
        <SectionLabel icon={TrendingUp} label="Top Sellers (receita)" />
        <PlatformSurface className="mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3 text-right">Recuperado</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Conversas</th>
                  <th className="px-4 py-3 text-center">WhatsApp</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map((seller, i) => {
                  const control = sellerControls.find(
                    (c) =>
                      c.sellerKey === seller.sellerKey ||
                      c.sellerName === seller.sellerKey,
                  );
                  const waStatus = control?.whatsappInstanceStatus ?? "disconnected";
                  return (
                    <tr
                      key={seller.sellerKey}
                      className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-strong)]"
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--muted)]">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[var(--foreground)]">
                          {seller.sellerKey}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">
                        {formatCurrency(seller.recoveredRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--foreground-secondary)]">
                        {seller.activeLeads} ativos
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--foreground-secondary)]">
                        {seller.openConversations} ({seller.unreadConversations}{" "}
                        não lidas)
                      </td>
                      <td className="px-4 py-3 text-center">
                        <WhatsAppStatusIcon status={waStatus} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge
                          variant={seller.control.active ? "success" : "neutral"}
                          label={seller.control.active ? "ativo" : "inativo"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PlatformSurface>
      </div>

      {/* Alertas */}
      {(overloadedSellers.length > 0 ||
        snapshot.worker.failed > 0 ||
        snapshot.unassignedLeads > 0) && (
        <div className="mt-5">
          <SectionLabel icon={ShieldCheck} label="Alertas" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overloadedSellers.length > 0 && (
              <AlertCard
                title="Sellers sobrecarregados"
                value={overloadedSellers.length.toString()}
                description={overloadedSellers
                  .map(
                    (s) =>
                      `${s.sellerKey} (${s.activeLeads}/${s.control.maxAssignedLeads})`,
                  )
                  .join(", ")}
                variant="warning"
              />
            )}
            {snapshot.worker.failed > 0 && (
              <AlertCard
                title="Jobs com falha"
                value={snapshot.worker.failed.toString()}
                description={`${snapshot.worker.processing} processando, lag: ${snapshot.worker.queueLagMinutes}min`}
                variant="danger"
              />
            )}
            {snapshot.unassignedLeads > 0 && (
              <AlertCard
                title="Leads sem seller"
                value={snapshot.unassignedLeads.toString()}
                description="Leads aguardando atribuição"
                variant="warning"
              />
            )}
          </div>
        </div>
      )}

      {/* Infra */}
      <div className="mt-5 mb-8">
        <SectionLabel icon={Server} label="Infraestrutura" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PlatformMetricCard
            icon={Server}
            label="Evolution API"
            value="Online"
            subtitle="177.7.42.173:8080"
          />
          <PlatformMetricCard
            icon={Layers}
            label="Deployments"
            value="3"
            subtitle="PagRecovery + Shield + Checkout"
          />
          <PlatformMetricCard
            icon={Zap}
            label="Worker queue"
            value={`${snapshot.worker.scheduled + snapshot.worker.processing} jobs`}
            subtitle={`${snapshot.worker.processed} processados total`}
          />
          <PlatformMetricCard
            icon={Globe}
            label="Partners ativos"
            value={`${activePartners}/${totalPartners}`}
            subtitle={`${totalTenants} tenants, ${totalPartnerWebhooks} webhooks`}
          />
        </div>
      </div>
    </PlatformAppPage>
  );
}

// ── Helper Components ──

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: typeof Activity;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[var(--accent)]" />
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
        {label}
      </span>
    </div>
  );
}

function WhatsAppStatusIcon({ status }: { status: string }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
        <Wifi className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (status === "pending_qr") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
        <QrCode className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
      <WifiOff className="h-3.5 w-3.5" />
    </span>
  );
}

function PartnerCard({ snapshot: ps }: { snapshot: PartnerDashboardSnapshot }) {
  return (
    <PlatformSurface className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {ps.partner.name}
            </h3>
            <StatusBadge
              variant={ps.partner.active ? "success" : "neutral"}
              label={ps.partner.active ? "ativo" : "inativo"}
            />
          </div>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            {ps.partner.contactEmail}
            {ps.partner.slug ? ` · ${ps.partner.slug}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-xl font-semibold text-[var(--foreground)]">
              {formatCurrency(ps.totals.recoveredRevenue)}
            </p>
            <p className="text-xs text-[var(--foreground-secondary)]">
              recuperado
            </p>
          </div>
          <div>
            <p className="text-xl font-semibold text-[var(--foreground)]">
              {(ps.totals.recoveryRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--foreground-secondary)]">
              taxa de recuperação
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MiniMetric
          label="Tenants"
          value={`${ps.totals.activeTenants}/${ps.totals.tenants}`}
        />
        <MiniMetric
          label="Webhooks"
          value={ps.totals.totalWebhooks.toLocaleString("pt-BR")}
        />
        <MiniMetric
          label="Pagamentos"
          value={ps.totals.totalPayments.toLocaleString("pt-BR")}
        />
        <MiniMetric
          label="Leads ativos"
          value={ps.totals.activeLeads.toString()}
        />
        <MiniMetric
          label="Recuperados"
          value={ps.totals.recoveredPayments.toString()}
        />
      </div>

      {ps.tenants.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-strong)] text-left font-semibold uppercase tracking-wider text-[var(--muted)]">
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2 text-right">Webhooks</th>
                <th className="px-3 py-2 text-right">Pagamentos</th>
                <th className="px-3 py-2 text-right">Recuperados</th>
                <th className="px-3 py-2 text-right">Taxa</th>
                <th className="px-3 py-2 text-right">Receita</th>
                <th className="px-3 py-2 text-right">Último webhook</th>
              </tr>
            </thead>
            <tbody>
              {ps.tenants.map((t) => (
                <tr
                  key={t.tenantKey}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-3 py-2">
                    <span className="font-semibold text-[var(--foreground)]">
                      {t.tenantName || t.tenantKey}
                    </span>
                    {!t.active && (
                      <StatusBadge variant="neutral" label="inativo" className="ml-2" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--foreground-secondary)]">
                    {t.totalWebhooks.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--foreground-secondary)]">
                    {t.totalPayments.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--foreground-secondary)]">
                    {t.recoveredPayments}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-[var(--foreground)]">
                    {(t.recoveryRate * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-[var(--foreground)]">
                    {formatCurrency(t.recoveredRevenue)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--foreground-secondary)]">
                    {t.lastWebhookAt
                      ? formatRelativeTime(t.lastWebhookAt)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PlatformSurface>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2">
      <p className="text-xs text-[var(--foreground-secondary)]">{label}</p>
      <p className="text-lg font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function AlertCard({
  title,
  value,
  description,
  variant,
}: {
  title: string;
  value: string;
  description: string;
  variant: "warning" | "danger";
}) {
  const colors =
    variant === "danger"
      ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20"
      : "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20";
  const textColor =
    variant === "danger"
      ? "text-red-700 dark:text-red-400"
      : "text-amber-700 dark:text-amber-400";

  return (
    <div className={`rounded-xl border px-4 py-4 ${colors}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>
        {title}
      </p>
      <p className={`mt-1 text-2xl font-bold ${textColor}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
        {description}
      </p>
    </div>
  );
}
