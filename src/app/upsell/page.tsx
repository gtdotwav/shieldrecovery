import {
  Gift,
  Send,
  ThumbsUp,
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";

export const metadata = { title: "Upsell" };
export const revalidate = 30;

export default async function UpsellPage() {
  await requireAuthenticatedSession(["admin", "seller"]);

  // TODO: fetch from upsell service when available
  return (
    <PlatformAppPage currentPath="/upsell">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={Send}
          label="ofertas enviadas"
          value="0"
          subtitle="no período"
        />
        <PlatformMetricCard
          icon={ThumbsUp}
          label="aceitas"
          value="0"
          subtitle="conversões totais"
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="taxa de conversão"
          value="0%"
          subtitle="ofertas aceitas / enviadas"
        />
        <PlatformMetricCard
          icon={DollarSign}
          label="receita adicional"
          value="R$ 0"
          subtitle="gerada por upsell"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Recent offers */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Ofertas recentes"
              title="Últimas ofertas enviadas"
              description="Histórico de ofertas de upsell e cross-sell para clientes."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <Gift className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma oferta enviada ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Configure regras de upsell para começar a enviar ofertas automaticamente.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Active rules */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Regras ativas"
              title="Automações de upsell"
              description="Defina quando e como ofertas são disparadas após pagamento."
            />
            <div className="mt-4 space-y-2.5">
              <RuleCard
                icon={Zap}
                title="Order bump"
                description="Oferta complementar exibida na página de confirmação."
                status="inativo"
              />
              <RuleCard
                icon={Target}
                title="Cross-sell pós-pagamento"
                description="Mensagem WhatsApp com produto relacionado após compra."
                status="inativo"
              />
              <RuleCard
                icon={Gift}
                title="Upgrade de plano"
                description="Oferta de upgrade enviada após 7 dias de uso."
                status="inativo"
              />
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Performance
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Ticket médio s/ upsell" value="R$ 0" />
              <MetricLine label="Ticket médio c/ upsell" value="R$ 0" />
              <MetricLine label="Incremento médio" value="0%" />
              <MetricLine label="LTV impacto" value="R$ 0" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Top ofertas
            </p>
            <div className="mt-4">
              <PlatformInset className="p-4 text-center">
                <BarChart3 className="mx-auto h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Ranking disponível após primeiras conversões.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function RuleCard({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: typeof Zap;
  title: string;
  description: string;
  status: "ativo" | "inativo";
}) {
  return (
    <div className="glass-inset rounded-xl px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
            <Icon className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold ${
          status === "ativo"
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
            : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        }`}>
          {status}
        </span>
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
