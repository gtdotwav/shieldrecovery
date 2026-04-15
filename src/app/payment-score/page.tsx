import {
  Gauge,
  Users,
  ShieldCheck,
  AlertTriangle,
  Search,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentScoreService } from "@/server/recovery/services/payment-score-service";

export const metadata = { title: "Payment Score" };
export const revalidate = 30;

export default async function PaymentScorePage() {
  await requireAuthenticatedSession(["admin"]);

  let distribution = { veryLow: 0, low: 0, medium: 0, high: 0, veryHigh: 0, averageScore: 0, totalScored: 0 };
  try {
    const service = getPaymentScoreService();
    distribution = await service.getScoreDistribution();
  } catch { /* tables may not exist yet */ }
  const total = distribution.totalScored || 1;

  return (
    <PlatformAppPage currentPath="/payment-score">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={Users}
          label="scores calculados"
          value={String(distribution.totalScored)}
          subtitle="clientes na base"
        />
        <PlatformMetricCard
          icon={Gauge}
          label="score médio"
          value={distribution.averageScore > 0 ? String(distribution.averageScore) : "—"}
          subtitle="da base ativa"
        />
        <PlatformMetricCard
          icon={ShieldCheck}
          label="baixo risco"
          value={String(distribution.veryLow)}
          subtitle="score acima de 800"
        />
        <PlatformMetricCard
          icon={AlertTriangle}
          label="alto risco"
          value={String(distribution.high + distribution.veryHigh)}
          subtitle="score abaixo de 400"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Score distribution */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Distribuição"
              title="Distribuição de scores"
              description="Visão geral da saúde de pagamento da base de clientes."
            />
            <div className="mt-4 space-y-2.5">
              <ScoreBand label="Excelente" range="900 - 1000" count={distribution.veryLow} color="bg-emerald-500" percentage={Math.round((distribution.veryLow / total) * 100)} />
              <ScoreBand label="Bom" range="700 - 899" count={distribution.low} color="bg-green-500" percentage={Math.round((distribution.low / total) * 100)} />
              <ScoreBand label="Regular" range="500 - 699" count={distribution.medium} color="bg-amber-500" percentage={Math.round((distribution.medium / total) * 100)} />
              <ScoreBand label="Baixo" range="300 - 499" count={distribution.high} color="bg-orange-500" percentage={Math.round((distribution.high / total) * 100)} />
              <ScoreBand label="Crítico" range="0 - 299" count={distribution.veryHigh} color="bg-red-500" percentage={Math.round((distribution.veryHigh / total) * 100)} />
            </div>
          </PlatformSurface>

          {/* Search */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Consulta"
              title="Consultar score de cliente"
              description="Busque o score de pagamento de um cliente específico."
            />
            <div className="mt-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    disabled
                    placeholder="E-mail, telefone ou nome do cliente..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  disabled
                  className="shrink-0 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
                >
                  Buscar
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                A consulta estará disponível quando o motor de score estiver ativo.
              </p>
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Motor de score
            </p>
            <div className="mt-4 space-y-2.5">
              <StatusLine label="Score Engine" status={distribution.totalScored > 0 ? "ativo" : "pendente"} />
              <StatusLine label="Modelo ML" status="pendente" />
              <StatusLine label="Dados históricos" status={distribution.totalScored > 0 ? "ativo" : "pendente"} />
              <StatusLine label="API de consulta" status="pendente" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Fatores do score
            </p>
            <div className="mt-4 space-y-2.5">
              <FactorLine icon={Activity} label="Histórico de pagamentos" weight="35%" />
              <FactorLine icon={TrendingUp} label="Frequência de compras" weight="25%" />
              <FactorLine icon={BarChart3} label="Valor médio" weight="20%" />
              <FactorLine icon={Gauge} label="Tempo de relacionamento" weight="20%" />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function ScoreBand({
  label,
  range,
  count,
  color,
  percentage,
}: {
  label: string;
  range: string;
  count: number;
  color: string;
  percentage: number;
}) {
  return (
    <div className="glass-inset rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${color}`} />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{range}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{count}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{percentage}%</p>
        </div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-1 rounded-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function StatusLine({ label, status }: { label: string; status: string }) {
  const isActive = status === "ativo";
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-amber-500"}`} />
          <span className={`text-xs font-medium ${isActive ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function FactorLine({ icon: Icon, label, weight }: { icon: typeof Activity; label: string; weight: string }) {
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-semibold text-[var(--accent)]">{weight}</span>
      </div>
    </div>
  );
}
