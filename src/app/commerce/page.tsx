import {
  Store,
  MessageSquare,
  ShoppingBag,
  DollarSign,
  Bot,
  Clock,
  Package,
  Users,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getCommerceAIService } from "@/server/recovery/services/commerce-ai-service";
import { getSellerIdentityByEmail } from "@/server/auth/identities";

export const metadata = { title: "Vendas IA" };
export const revalidate = 30;

export default async function CommercePage() {
  const session = await requireAuthenticatedSession(["admin", "seller"]);

  const sellerIdentity = session.role === "seller" ? await getSellerIdentityByEmail(session.email) : null;
  const sellerKey = session.role === "seller" ? sellerIdentity?.agentName : undefined;

  let analytics = { totalSessions: 0, activeSessions: 0, completedSessions: 0, abandonedSessions: 0, conversionRate: 0, totalRevenue: 0 };
  try {
    const service = getCommerceAIService();
    analytics = await service.getCommerceAnalytics(sellerKey);
  } catch { /* tables may not exist */ }

  return (
    <PlatformAppPage currentPath="/commerce">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={MessageSquare}
          label="sessões"
          value={String(analytics.totalSessions)}
          subtitle="conversas de venda"
        />
        <PlatformMetricCard
          icon={Bot}
          label="em andamento"
          value={String(analytics.activeSessions)}
          subtitle="negociações ativas agora"
        />
        <PlatformMetricCard
          icon={ShoppingBag}
          label="vendas fechadas"
          value={String(analytics.completedSessions)}
          subtitle="conversões por conversa"
        />
        <PlatformMetricCard
          icon={DollarSign}
          label="receita"
          value={`R$ ${(analytics.totalRevenue / 100).toFixed(2)}`}
          subtitle="gerada por vendas IA"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Recent sessions */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Sessões de venda"
              title="Conversas recentes"
              description="Sessões de venda conduzidas por IA via WhatsApp e voz."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <Store className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma sessão de venda registrada ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Configure o catálogo e ative o agente de vendas por conversa.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Catalog management */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Catálogo"
              title="Gestão de produtos"
              description="Produtos disponíveis para venda via conversa."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <Package className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhum produto no catálogo.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Adicione produtos ao catálogo para que a IA possa vendê-los.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Desempenho do agente
            </p>
            <div className="mt-4 space-y-2.5">
              <SidebarMetric icon={Clock} label="Tempo médio de sessão" value="0m" />
              <SidebarMetric icon={MessageSquare} label="Mensagens por sessão" value="0" />
              <SidebarMetric icon={ShoppingBag} label="Taxa de conversão" value={`${(analytics.conversionRate * 100).toFixed(0)}%`} />
              <SidebarMetric icon={Users} label="Clientes únicos" value="0" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Canais ativos
            </p>
            <div className="mt-4 space-y-2.5">
              <ChannelStatus label="WhatsApp" active={false} />
              <ChannelStatus label="Voz (VAPI)" active={false} />
              <ChannelStatus label="Chat no site" active={false} />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function SidebarMetric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
}

function ChannelStatus({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
          <span className={`text-xs font-medium ${active ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
            {active ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>
    </div>
  );
}
