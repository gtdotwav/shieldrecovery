import {
  PhoneOutgoing,
  Users,
  ShoppingBag,
  DollarSign,
  Play,
  Pause,
  Target,
  BarChart3,
  Clock,
  Megaphone,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";

export const metadata = { title: "Outbound Sales" };
export const revalidate = 30;

export default async function OutboundSalesPage() {
  await requireAuthenticatedSession(["admin", "seller"]);

  // TODO: fetch from outbound service when available
  return (
    <PlatformAppPage currentPath="/outbound-sales">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={Megaphone}
          label="campanhas ativas"
          value="0"
          subtitle="em execução agora"
        />
        <PlatformMetricCard
          icon={Users}
          label="contatos feitos"
          value="0"
          subtitle="abordagens realizadas"
        />
        <PlatformMetricCard
          icon={ShoppingBag}
          label="vendas"
          value="0"
          subtitle="conversões de outbound"
        />
        <PlatformMetricCard
          icon={DollarSign}
          label="receita"
          value="R$ 0"
          subtitle="gerada por outbound"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Campaigns list */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <PlatformSectionIntro
                eyebrow="Campanhas"
                title="Campanhas de outbound"
                description="Campanhas de venda ativa por IA via WhatsApp e voz."
              />
              <button
                disabled
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white opacity-50 cursor-not-allowed"
              >
                <Play className="h-3.5 w-3.5" />
                Criar campanha
              </button>
            </div>
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <PhoneOutgoing className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma campanha de outbound criada ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Crie uma campanha para abordar leads ativamente por WhatsApp ou voz.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Campaign templates */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Templates"
              title="Modelos de campanha"
              description="Templates prontos para diferentes cenários de outbound."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TemplateCard
                icon={Target}
                title="Prospecção fria"
                description="Abordagem inicial para leads novos sem histórico."
                channels="WhatsApp + Voz"
              />
              <TemplateCard
                icon={ShoppingBag}
                title="Lançamento"
                description="Campanha para divulgar novo produto à base."
                channels="WhatsApp"
              />
              <TemplateCard
                icon={DollarSign}
                title="Oferta relâmpago"
                description="Promoção com tempo limitado para gerar urgência."
                channels="WhatsApp + SMS"
              />
              <TemplateCard
                icon={Users}
                title="Indicação"
                description="Solicitar indicações de clientes satisfeitos."
                channels="WhatsApp"
              />
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Métricas de outbound
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Taxa de resposta" value="0%" />
              <MetricLine label="Taxa de conversão" value="0%" />
              <MetricLine label="Custo por lead" value="R$ 0" />
              <MetricLine label="ROI" value="0x" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Status dos canais
            </p>
            <div className="mt-4 space-y-2.5">
              <ChannelLine icon={Play} label="WhatsApp" status="disponível" />
              <ChannelLine icon={PhoneOutgoing} label="Voz IA" status="disponível" />
              <ChannelLine icon={Pause} label="SMS" status="não configurado" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Limites diários
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="WhatsApp" value="0 / 1.000" />
              <MetricLine label="Chamadas" value="0 / 200" />
              <MetricLine label="SMS" value="0 / 500" />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function TemplateCard({
  icon: Icon,
  title,
  description,
  channels,
}: {
  icon: typeof Target;
  title: string;
  description: string;
  channels: string;
}) {
  return (
    <div className="glass-inset rounded-xl px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          <p className="mt-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-[var(--accent)]">
            {channels}
          </p>
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

function ChannelLine({
  icon: Icon,
  label,
  status,
}: {
  icon: typeof Play;
  label: string;
  status: string;
}) {
  const isAvailable = status === "disponível";
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
          <span className={`text-xs ${isAvailable ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
