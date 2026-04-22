import {
  Activity,
  Building2,
  ChevronRight,
  DollarSign,
  LogOut,
  Percent,
  RefreshCcw,
  ShieldCheck,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/auth-actions";
import {
  PlatformMetricCard,
  PlatformSurface,
  PlatformInset,
  PlatformSectionIntro,
} from "@/components/platform/platform-shell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { platformBrand } from "@/lib/platform";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";
import type { PartnerTenantStats } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Portal do Parceiro | ${platformBrand.name}`,
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function timeAgo(isoDate?: string): string {
  if (!isoDate) return "Nunca";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export default async function PartnerDashboardPage() {
  const session = await getAuthenticatedSession();

  if (!session || session.role !== "partner" || !session.partnerId) {
    redirect("/partner/login");
  }

  const snapshot = await getPartnerStorageService().getDashboardSnapshot(
    session.partnerId,
  );

  if (!snapshot) {
    redirect("/partner/login");
  }

  const { partner, totals, tenants, recentWebhooks } = snapshot;

  return (
    <div className="flex h-screen bg-[#f5f5f7] dark:bg-[#0d0d0d] overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className="hidden md:flex w-16 bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 flex-col items-center py-4 justify-between shrink-0 h-screen sticky top-0 transition-colors duration-300">
        <nav className="flex flex-col items-center gap-1">
          <div className="mb-6 w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[var(--accent)]" />
          </div>

          <SidebarLink
            href="/partner"
            icon={Activity}
            label="Dashboard"
            description="Visão geral"
            active
          />
          <SidebarLink
            href="/partner/integration"
            icon={Webhook}
            label="Integração"
            description="API e webhooks"
          />
        </nav>

        <div className="flex flex-col items-center gap-1">
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Sair"
              className="relative group/tip w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-max rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-2 opacity-0 scale-95 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50 shadow-lg">
                <span className="block text-xs font-semibold text-white dark:text-gray-900">
                  Sair
                </span>
              </span>
            </button>
          </form>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-1 py-2 safe-bottom transition-colors duration-300">
        <Link
          href="/partner"
          className="flex flex-col items-center gap-0.5 min-w-[3.25rem] min-h-[2.75rem] justify-center px-1 rounded-lg text-[var(--accent)]"
          aria-current="page"
        >
          <Activity className="w-5 h-5 shrink-0" />
          <span className="text-[0.55rem] leading-tight">Dashboard</span>
        </Link>
        <Link
          href="/partner/integration"
          className="flex flex-col items-center gap-0.5 min-w-[3.25rem] min-h-[2.75rem] justify-center px-1 rounded-lg text-gray-400 dark:text-gray-500"
        >
          <Webhook className="w-5 h-5 shrink-0" />
          <span className="text-[0.55rem] leading-tight">Integração</span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex flex-col items-center gap-0.5 min-w-[3.25rem] min-h-[2.75rem] justify-center px-1 rounded-lg text-gray-400 dark:text-gray-500"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-[0.55rem] leading-tight">Sair</span>
          </button>
        </form>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-transparent px-4 md:px-6 h-12 md:h-14 flex items-center justify-between shrink-0 transition-colors duration-300">
          <nav className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 dark:text-gray-500">
            <span className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
              Parceiro
            </span>
            <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="text-gray-900 dark:text-white">Dashboard</span>
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
              {partner.name}
            </span>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs md:text-sm font-semibold">
              {partner.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 pb-16 md:pb-6 space-y-6">
          {/* Intro */}
          <PlatformSectionIntro
            eyebrow="Portal do Parceiro"
            title={partner.name}
            description={`Integração ativa com ${platformBrand.name} — ${totals.activeTenants} tenant${totals.activeTenants !== 1 ? "s" : ""} ativo${totals.activeTenants !== 1 ? "s" : ""}`}
          />

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PlatformMetricCard
              icon={DollarSign}
              label="Recuperado"
              value={formatCurrency(totals.recoveredRevenue)}
              subtitle={`${formatNumber(totals.recoveredPayments)} pagamentos`}
            />
            <PlatformMetricCard
              icon={Percent}
              label="Taxa de Recuperação"
              value={`${totals.recoveryRate}%`}
              subtitle={`${formatNumber(totals.failedPayments)} falhos`}
            />
            <PlatformMetricCard
              icon={Users}
              label="Leads Ativos"
              value={formatNumber(totals.activeLeads)}
              subtitle="Em processo de recuperação"
            />
            <PlatformMetricCard
              icon={Building2}
              label="Tenants"
              value={formatNumber(totals.tenants)}
              subtitle={`${totals.activeTenants} ativos`}
            />
          </div>

          {/* Tenants table */}
          <PlatformSurface className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Tenants
                </h2>
              </div>
              <span className="text-xs text-gray-400">{tenants.length} total</span>
            </div>

            {tenants.length === 0 ? (
              <PlatformInset className="m-4 p-6 text-center">
                <Zap className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-sm text-gray-500">
                  Nenhum tenant cadastrado. Crie o primeiro via API ou peça ao
                  admin.
                </p>
              </PlatformInset>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 text-left text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Tenant
                      </th>
                      <th className="px-4 py-3 text-right text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Webhooks
                      </th>
                      <th className="px-4 py-3 text-right text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Falhos
                      </th>
                      <th className="px-4 py-3 text-right text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Recuperados
                      </th>
                      <th className="px-4 py-3 text-right text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Taxa
                      </th>
                      <th className="px-4 py-3 text-right text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Receita
                      </th>
                      <th className="px-4 py-3 text-right text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400 hidden lg:table-cell">
                        Último Webhook
                      </th>
                      <th className="px-4 py-3 text-center text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant) => (
                      <TenantRow key={tenant.tenantKey} tenant={tenant} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PlatformSurface>

          {/* Recent webhooks */}
          <PlatformSurface className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Webhooks Recentes
                </h2>
              </div>
              <span className="text-xs text-gray-400">
                {recentWebhooks.length} últimos
              </span>
            </div>

            {recentWebhooks.length === 0 ? (
              <PlatformInset className="m-4 p-6 text-center">
                <Webhook className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-sm text-gray-500">
                  Nenhum webhook recebido ainda. Envie dados via{" "}
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    POST /api/partner/ingest
                  </code>
                </p>
              </PlatformInset>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 text-left text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Evento
                      </th>
                      <th className="px-4 py-3 text-center text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Processado
                      </th>
                      <th className="px-4 py-3 text-right text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400">
                        Recebido
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentWebhooks.map((wh) => (
                      <tr
                        key={wh.id}
                        className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 max-w-[14rem] truncate">
                          {wh.webhookId}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            {wh.eventType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {wh.processed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                              <ShieldCheck className="h-3 w-3" />
                              Sim
                            </span>
                          ) : wh.error ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                              Erro
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                              <RefreshCcw className="h-3 w-3" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">
                          {timeAgo(wh.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PlatformSurface>

          {/* Integration quickstart */}
          <PlatformSurface className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[var(--accent)] rounded-full" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Integração Rápida
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PlatformInset className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400 mb-2">
                  Endpoint
                </p>
                <code className="text-sm text-[var(--accent)] break-all">
                  POST /api/partner/ingest
                </code>
                <p className="mt-2 text-xs text-gray-500">
                  Envie eventos de pagamento com sua API key no header
                  Authorization.
                </p>
              </PlatformInset>

              <PlatformInset className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400 mb-2">
                  Autenticação
                </p>
                <code className="text-sm text-[var(--accent)]">
                  Authorization: Bearer sk_live_...
                </code>
                <p className="mt-2 text-xs text-gray-500">
                  Cada tenant deve usar sua própria API key para escopo
                  correto.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  description,
  active,
}: {
  href: string;
  icon: typeof Activity;
  label: string;
  description: string;
  active?: boolean;
}) {
  const cls = active
    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
    : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800";

  return (
    <Link
      href={href}
      className={`relative group/tip w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${cls}`}
      {...(active ? { "aria-current": "page" as const } : {})}
    >
      <Icon className="w-5 h-5" />
      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-max max-w-[12rem] rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-2 opacity-0 scale-95 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50 shadow-lg">
        <span className="block text-xs font-semibold text-white dark:text-gray-900">
          {label}
        </span>
        <span className="block text-[0.65rem] leading-snug text-gray-300 dark:text-gray-500 mt-0.5">
          {description}
        </span>
      </span>
    </Link>
  );
}

function TenantRow({ tenant }: { tenant: PartnerTenantStats }) {
  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <td className="px-5 py-3">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {tenant.tenantName}
          </p>
          <p className="text-xs text-gray-400 font-mono">{tenant.tenantKey}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">
        {formatNumber(tenant.totalWebhooks)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">
        {formatNumber(tenant.failedPayments)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400">
        {formatNumber(tenant.recoveredPayments)}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`font-semibold ${
            tenant.recoveryRate >= 15
              ? "text-green-600 dark:text-green-400"
              : tenant.recoveryRate > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-400"
          }`}
        >
          {tenant.recoveryRate}%
        </span>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
        {formatCurrency(tenant.recoveredRevenue)}
      </td>
      <td className="px-4 py-3 text-right text-xs text-gray-400 hidden lg:table-cell">
        {timeAgo(tenant.lastWebhookAt)}
      </td>
      <td className="px-4 py-3 text-center">
        {tenant.active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500">
            Inativo
          </span>
        )}
      </td>
    </tr>
  );
}
