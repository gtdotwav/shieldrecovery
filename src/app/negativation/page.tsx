import {
  AlertTriangle,
  CheckCircle2,
  Send,
  FileWarning,
  Scale,
  Clock,
  DollarSign,
  Shield,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getNegativationService } from "@/server/recovery/services/negativation-service";

export const metadata = { title: "Negativação" };
export const revalidate = 30;

export default async function NegativationPage() {
  await requireAuthenticatedSession(["admin"]);

  let analytics = { total: 0, pendingNotice: 0, noticeSent: 0, waitingPeriod: 0, registered: 0, removed: 0, cancelled: 0, totalDebtAmount: 0, recoveredAfterNegativation: 0 };
  try {
    const service = getNegativationService();
    analytics = await service.getNegativationAnalytics();
  } catch { /* tables may not exist */ }

  return (
    <PlatformAppPage currentPath="/negativation">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={AlertTriangle}
          label="registradas"
          value={String(analytics.registered)}
          subtitle="negativações ativas"
        />
        <PlatformMetricCard
          icon={CheckCircle2}
          label="recuperadas pós-negativação"
          value={String(analytics.removed)}
          subtitle="pagas após registro"
        />
        <PlatformMetricCard
          icon={Send}
          label="notificações enviadas"
          value={String(analytics.noticeSent + analytics.waitingPeriod)}
          subtitle="avisos de negativação"
        />
        <PlatformMetricCard
          icon={Scale}
          label="em protesto"
          value="0"
          subtitle="enviadas a cartório"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Negativations list */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Registros"
              title="Negativações ativas"
              description="Registros de inadimplência nos birôs de crédito."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <AlertTriangle className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma negativação registrada ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  As negativações aparecerão aqui quando o serviço estiver integrado aos birôs.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Protest list */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Protestos"
              title="Registros em cartório"
              description="Títulos enviados para protesto em cartório."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <Scale className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhum protesto em andamento.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Protestos são gerados automaticamente para inadimplências acima do limite configurado.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Resumo de cobrança
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine icon={DollarSign} label="Valor total inadimplido" value={`R$ ${analytics.totalDebtAmount.toFixed(2)}`} highlight />
              <MetricLine icon={Clock} label="Média dias em atraso" value="—" />
              <MetricLine icon={CheckCircle2} label="Recuperado pós-registro" value="R$ 0" />
              <MetricLine icon={Shield} label="Taxa de recuperação" value={analytics.total > 0 ? `${Math.round((analytics.removed / analytics.total) * 100)}%` : "0%"} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Fluxo de negativação
            </p>
            <div className="mt-4 space-y-2.5">
              <FlowStep step={1} label="Notificação prévia" description="Aviso ao devedor por WhatsApp e e-mail." />
              <FlowStep step={2} label="Prazo de 10 dias" description="Período legal para quitação." />
              <FlowStep step={3} label="Registro no birô" description="Inclusão em Serasa/SPC." />
              <FlowStep step={4} label="Protesto (opcional)" description="Envio ao cartório se acima do limite." />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Integrações
            </p>
            <div className="mt-4 space-y-2.5">
              <IntegrationLine label="Serasa Experian" connected={false} />
              <IntegrationLine label="SPC Brasil" connected={false} />
              <IntegrationLine label="Cartório digital" connected={false} />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function MetricLine({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${highlight ? "text-[var(--accent)]" : "text-gray-900 dark:text-white"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function FlowStep({ step, label, description }: { step: number; label: string; description: string }) {
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[0.6rem] font-semibold text-[var(--accent)]">
          {step}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function IntegrationLine({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
          <span className={`text-xs font-medium ${connected ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
            {connected ? "conectado" : "não conectado"}
          </span>
        </div>
      </div>
    </div>
  );
}
