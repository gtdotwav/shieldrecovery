import {
  Banknote,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  DollarSign,
  ArrowRight,
  Calendar,
  PiggyBank,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getAnticipationService } from "@/server/recovery/services/anticipation-service";

export const metadata = { title: "Antecipação" };
export const revalidate = 30;

export default async function AnticipationPage() {
  await requireAuthenticatedSession(["admin"]);

  let analytics = { totalRequests: 0, totalDisbursed: 0, totalSpreadCollected: 0, avgSpreadRate: 0, pendingRequests: 0, approvedNotDisbursed: 0, avgDaysToSettlement: 0 };
  let receivables = { totalReceivable: 0, settledCount: 0, pendingCount: 0, avgDaysToSettlement: 15, maxAnticipationAmount: 0, estimatedSpreadRate: 0, sellerKey: "" };
  let requests: Awaited<ReturnType<typeof import("@/server/recovery/services/anticipation-service").AnticipationService.prototype.listRequests>> = [];
  try {
    const service = getAnticipationService();
    [analytics, requests] = await Promise.all([
      service.getAnticipationAnalytics(),
      service.listRequests(),
    ]);
  } catch { /* tables may not exist yet */ }

  return (
    <PlatformAppPage currentPath="/anticipation">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={Banknote}
          label="disponível"
          value={`R$ ${analytics.totalDisbursed > 0 ? analytics.totalDisbursed.toFixed(2) : "0"}`}
          subtitle="para antecipação"
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="antecipado"
          value={`R$ ${analytics.totalDisbursed.toFixed(2)}`}
          subtitle="total antecipado"
        />
        <PlatformMetricCard
          icon={Percent}
          label="spread médio"
          value={`${(analytics.avgSpreadRate * 100).toFixed(1)}%`}
          subtitle="taxa de antecipação"
        />
        <PlatformMetricCard
          icon={CheckCircle2}
          label="liquidado"
          value={`R$ ${analytics.totalSpreadCollected.toFixed(2)}`}
          subtitle="recebíveis já quitados"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Requests */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <PlatformSectionIntro
                eyebrow="Solicitações"
                title="Solicitações de antecipação"
                description="Histórico de antecipações de recebíveis."
              />
              <button
                disabled
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white opacity-50 cursor-not-allowed"
              >
                <Banknote className="h-3.5 w-3.5" />
                Solicitar antecipação
              </button>
            </div>
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <Banknote className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma antecipação solicitada ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Solicite antecipação de recebíveis quando houver saldo disponível.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Receivables schedule */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Agenda"
              title="Agenda de recebíveis"
              description="Visão dos recebíveis futuros disponíveis para antecipação."
            />
            <div className="mt-4 space-y-2.5">
              <ReceivablePeriod label="Próximos 7 dias" amount="R$ 0" count={0} />
              <ReceivablePeriod label="8 a 15 dias" amount="R$ 0" count={0} />
              <ReceivablePeriod label="16 a 30 dias" amount="R$ 0" count={0} />
              <ReceivablePeriod label="31 a 60 dias" amount="R$ 0" count={0} />
              <ReceivablePeriod label="61 a 90 dias" amount="R$ 0" count={0} />
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Simulador
            </p>
            <div className="mt-4">
              <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500 mb-1.5">
                Valor a antecipar
              </label>
              <input
                type="text"
                disabled
                placeholder="R$ 0,00"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="mt-3 space-y-2">
                <SimulatorLine label="Valor bruto" value="R$ 0" />
                <SimulatorLine label="Taxa" value="R$ 0" />
                <SimulatorLine label="Valor líquido" value="R$ 0" highlight />
              </div>
              <button
                disabled
                className="mt-3 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
              >
                Simular
              </button>
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Condições
            </p>
            <div className="mt-4 space-y-2.5">
              <ConditionLine icon={Percent} label="Taxa mensal" value="—" />
              <ConditionLine icon={DollarSign} label="Mínimo" value="—" />
              <ConditionLine icon={Clock} label="Prazo liquidação" value="—" />
              <ConditionLine icon={PiggyBank} label="Limite disponível" value="R$ 0" />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function ReceivablePeriod({ label, amount, count }: { label: string; amount: string; count: number }) {
  return (
    <div className="glass-inset rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-[var(--accent)]" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{count} transações</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{amount}</span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
        </div>
      </div>
    </div>
  );
}

function SimulatorLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${highlight ? "text-[var(--accent)]" : "text-gray-900 dark:text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function ConditionLine({ icon: Icon, label, value }: { icon: typeof Percent; label: string; value: string }) {
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
}
