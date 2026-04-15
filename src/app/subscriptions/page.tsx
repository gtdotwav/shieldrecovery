import {
  Repeat,
  DollarSign,
  TrendingDown,
  AlertCircle,
  Users,
  Calendar,
  CreditCard,
  Clock,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getRecurringBillingService } from "@/server/recovery/services/recurring-billing-service";

export const metadata = { title: "Recorrência" };
export const revalidate = 30;

export default async function SubscriptionsPage() {
  const session = await requireAuthenticatedSession(["admin", "seller"]);

  const sellerIdentity =
    session.role === "seller"
      ? await getSellerIdentityByEmail(session.email)
      : null;
  const sellerKey =
    session.role === "seller" ? sellerIdentity?.agentName : undefined;

  let analytics = {
    totalActive: 0,
    totalPaused: 0,
    totalCanceled: 0,
    mrr: 0,
    churnRate: 0,
    dunningSuccessRate: 0,
    openInvoices: 0,
    failedInvoices: 0,
  };
  try {
    const service = getRecurringBillingService();
    analytics = await service.getSubscriptionAnalytics(sellerKey);
  } catch {
    /* tables may not exist */
  }

  return (
    <PlatformAppPage currentPath="/subscriptions">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={Users}
          label="assinaturas ativas"
          value={String(analytics.totalActive)}
          subtitle="base atual"
        />
        <PlatformMetricCard
          icon={DollarSign}
          label="MRR"
          value={`R$ ${(analytics.mrr / 100).toFixed(2)}`}
          subtitle="receita recorrente mensal"
        />
        <PlatformMetricCard
          icon={TrendingDown}
          label="churn rate"
          value={`${(analytics.churnRate * 100).toFixed(1)}%`}
          subtitle="cancelamentos no mês"
        />
        <PlatformMetricCard
          icon={AlertCircle}
          label="dunning em andamento"
          value={String(analytics.failedInvoices)}
          subtitle="cobranças com falha ativa"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Active subscriptions */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Base de assinantes"
              title="Assinaturas ativas"
              description="Todas as assinaturas recorrentes da sua base."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <Repeat className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma assinatura cadastrada ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  As assinaturas aparecerão aqui quando a integração estiver conectada.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Dunning rules */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Gestão de inadimplência"
              title="Régua de dunning"
              description="Sequência automática de retentativa e comunicação para cobranças falhas."
            />
            <div className="mt-4 space-y-2.5">
              <DunningStep step={1} label="Retentativa automática" delay="Imediata" description="Tenta cobrar novamente no mesmo cartão." />
              <DunningStep step={2} label="Notificação WhatsApp" delay="1h após falha" description="Avisa o cliente sobre o problema no pagamento." />
              <DunningStep step={3} label="E-mail com link de atualização" delay="24h" description="Envia link para atualizar dados do cartão." />
              <DunningStep step={4} label="Última tentativa + oferta" delay="72h" description="Última retentativa com desconto para reter." />
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Saúde da recorrência
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Ticket médio" value="R$ 0" />
              <MetricLine label="Lifetime médio" value="0 meses" />
              <MetricLine label="Renovações próximas" value={String(analytics.openInvoices)} />
              <MetricLine label="Em grace period" value={String(analytics.totalPaused)} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Próximas cobranças
            </p>
            <div className="mt-4 space-y-2.5">
              <UpcomingLine icon={Calendar} label="Hoje" count={0} />
              <UpcomingLine icon={Clock} label="Próximos 7 dias" count={0} />
              <UpcomingLine icon={CreditCard} label="Próximos 30 dias" count={0} />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function DunningStep({
  step,
  label,
  delay,
  description,
}: {
  step: number;
  label: string;
  delay: string;
  description: string;
}) {
  return (
    <div className="glass-inset rounded-xl px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)]">
          {step}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            <span className="text-xs text-gray-400 dark:text-gray-500">{delay}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
}

function UpcomingLine({ icon: Icon, label, count }: { icon: typeof Calendar; label: string; count: number }) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{count}</span>
      </div>
    </div>
  );
}
