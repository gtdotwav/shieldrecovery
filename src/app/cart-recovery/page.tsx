import {
  ShoppingCart,
  Package,
  TrendingUp,
  DollarSign,
  Clock,
  User,
  CreditCard,
  Eye,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";

export const metadata = { title: "Carrinho Abandonado" };
export const revalidate = 30;

export default async function CartRecoveryPage() {
  await requireAuthenticatedSession(["admin", "seller"]);

  // TODO: fetch from cart recovery service when available
  return (
    <PlatformAppPage currentPath="/cart-recovery">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={ShoppingCart}
          label="carrinhos detectados"
          value="0"
          subtitle="nos últimos 30 dias"
        />
        <PlatformMetricCard
          icon={Package}
          label="recuperados"
          value="0"
          subtitle="R$ 0,00 em receita"
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="taxa de recuperação"
          value="0%"
          subtitle="média do período"
        />
        <PlatformMetricCard
          icon={DollarSign}
          label="receita recuperada"
          value="R$ 0"
          subtitle="valor total convertido"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Abandoned carts table */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Carrinhos abandonados"
              title="Abandonos recentes"
              description="Carrinhos detectados aguardando ação de recuperação."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <ShoppingCart className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhum carrinho abandonado detectado ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Os abandonos aparecerão aqui quando a integração de carrinho estiver ativa.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Recovery flow */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Fluxo de recuperação"
              title="Régua de abordagem"
              description="Sequência automática de mensagens para carrinhos abandonados."
            />
            <div className="mt-4 space-y-2.5">
              <FlowStep step={1} label="1ª mensagem WhatsApp" delay="30 min após abandono" />
              <FlowStep step={2} label="E-mail com carrinho salvo" delay="2h após abandono" />
              <FlowStep step={3} label="2ª mensagem + desconto" delay="24h após abandono" />
              <FlowStep step={4} label="Última chance" delay="48h após abandono" />
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Resumo por canal
            </p>
            <div className="mt-4 space-y-2.5">
              <SidebarMetric icon={Eye} label="Visualizaram checkout" value="0" />
              <SidebarMetric icon={CreditCard} label="Iniciaram pagamento" value="0" />
              <SidebarMetric icon={Clock} label="Abandonaram" value="0" />
              <SidebarMetric icon={User} label="Contatáveis" value="0" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Top produtos abandonados
            </p>
            <div className="mt-4">
              <PlatformInset className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sem dados ainda.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function FlowStep({ step, label, delay }: { step: number; label: string; delay: string }) {
  return (
    <div className="glass-inset rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)]">
          {step}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{delay}</p>
        </div>
      </div>
    </div>
  );
}

function SidebarMetric({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
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
