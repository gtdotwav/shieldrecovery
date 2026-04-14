import {
  RefreshCcw,
  Users,
  UserCheck,
  DollarSign,
  Clock,
  Send,
  TrendingUp,
  Target,
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

export const metadata = { title: "Reativação" };
export const revalidate = 30;

export default async function ReactivationPage() {
  await requireAuthenticatedSession(["admin", "seller"]);

  // TODO: fetch from reactivation service when available
  return (
    <PlatformAppPage currentPath="/reactivation">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={Megaphone}
          label="campanhas"
          value="0"
          subtitle="de reativação ativas"
        />
        <PlatformMetricCard
          icon={Users}
          label="contatos inativos"
          value="0"
          subtitle="elegíveis para reativação"
        />
        <PlatformMetricCard
          icon={UserCheck}
          label="reativados"
          value="0"
          subtitle="clientes que voltaram"
        />
        <PlatformMetricCard
          icon={DollarSign}
          label="receita"
          value="R$ 0"
          subtitle="de clientes reativados"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Campaigns */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Campanhas de reativação"
              title="Campanhas ativas"
              description="Campanhas automatizadas para trazer clientes inativos de volta."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <RefreshCcw className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma campanha de reativação ativa.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Crie uma campanha para reengajar clientes que pararam de comprar.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Segmentation */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Segmentação"
              title="Segmentos de inativos"
              description="Grupos de clientes inativos por tempo e comportamento."
            />
            <div className="mt-4 space-y-2.5">
              <SegmentCard
                label="Inativos 30-60 dias"
                count={0}
                description="Clientes recentes que pararam de comprar."
                priority="alta"
              />
              <SegmentCard
                label="Inativos 60-90 dias"
                count={0}
                description="Clientes com risco moderado de churn definitivo."
                priority="média"
              />
              <SegmentCard
                label="Inativos 90+ dias"
                count={0}
                description="Clientes com baixa chance de retorno espontâneo."
                priority="baixa"
              />
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Métricas de reativação
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine icon={TrendingUp} label="Taxa de reativação" value="0%" />
              <MetricLine icon={Send} label="Mensagens enviadas" value="0" />
              <MetricLine icon={Clock} label="Tempo médio até retorno" value="—" />
              <MetricLine icon={Target} label="Melhor canal" value="—" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Abordagem recomendada
            </p>
            <div className="mt-4 space-y-2.5">
              <PlatformInset className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                Oferta exclusiva para retorno com desconto progressivo.
              </PlatformInset>
              <PlatformInset className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                Lembrete de benefícios que o cliente está perdendo.
              </PlatformInset>
              <PlatformInset className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                Contato pessoal por voz para clientes de alto valor.
              </PlatformInset>
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function SegmentCard({
  label,
  count,
  description,
  priority,
}: {
  label: string;
  count: number;
  description: string;
  priority: "alta" | "média" | "baixa";
}) {
  const priorityStyles = {
    alta: "border-[var(--accent)]/20 bg-[var(--accent)]/5 text-[var(--accent)]",
    média: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
    baixa: "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="glass-inset rounded-xl px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold ${priorityStyles[priority]}`}>
              {priority}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <span className="shrink-0 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{count}</span>
      </div>
    </div>
  );
}

function MetricLine({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
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
