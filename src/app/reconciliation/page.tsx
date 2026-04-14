import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Download,
  Calendar,
  ArrowUpDown,
  Search,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";

export const metadata = { title: "Conciliação" };
export const revalidate = 30;

export default async function ReconciliationPage() {
  await requireAuthenticatedSession(["admin"]);

  // TODO: fetch from reconciliation service when available
  return (
    <PlatformAppPage currentPath="/reconciliation">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={FileSpreadsheet}
          label="relatórios"
          value="0"
          subtitle="gerados no período"
        />
        <PlatformMetricCard
          icon={CheckCircle2}
          label="conciliados"
          value="0"
          subtitle="transações batidas"
        />
        <PlatformMetricCard
          icon={AlertTriangle}
          label="discrepâncias"
          value="0"
          subtitle="pendentes de resolução"
        />
        <PlatformMetricCard
          icon={DollarSign}
          label="valor líquido"
          value="R$ 0"
          subtitle="conciliado no período"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Reports */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <PlatformSectionIntro
                eyebrow="Relatórios"
                title="Relatórios de conciliação"
                description="Histórico de conciliações financeiras realizadas."
              />
              <button
                disabled
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white opacity-50 cursor-not-allowed"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Gerar relatório
              </button>
            </div>
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <FileSpreadsheet className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhum relatório de conciliação gerado ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Gere um relatório para conciliar transações entre gateways e a plataforma.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>

          {/* Discrepancies */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Discrepâncias"
              title="Divergências encontradas"
              description="Transações com valores ou status divergentes entre gateway e plataforma."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <CheckCircle2 className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma discrepância detectada.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  As divergências aparecerão aqui após a primeira conciliação.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Resumo financeiro
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Total transacionado" value="R$ 0" highlight />
              <MetricLine label="Taxas de gateway" value="R$ 0" />
              <MetricLine label="Estornos" value="R$ 0" />
              <MetricLine label="Líquido recebido" value="R$ 0" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Fontes de dados
            </p>
            <div className="mt-4 space-y-2.5">
              <SourceLine label="PagouAi" status="conectado" />
              <SourceLine label="Stripe" status="não conectado" />
              <SourceLine label="Mercado Pago" status="não conectado" />
              <SourceLine label="Banco" status="não conectado" />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Ações rápidas
            </p>
            <div className="mt-4 space-y-2">
              <ActionLine icon={Download} label="Exportar CSV" />
              <ActionLine icon={Calendar} label="Conciliar período" />
              <ActionLine icon={ArrowUpDown} label="Comparar gateways" />
              <ActionLine icon={Search} label="Buscar transação" />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function MetricLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${highlight ? "text-[var(--accent)]" : "text-gray-900 dark:text-white"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function SourceLine({ label, status }: { label: string; status: string }) {
  const isConnected = status === "conectado";
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
          <span className={`text-xs font-medium ${isConnected ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function ActionLine({ icon: Icon, label }: { icon: typeof Download; label: string }) {
  return (
    <button
      disabled
      className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-2.5 text-left text-sm text-gray-500 transition-colors hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400"
    >
      <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
      {label}
    </button>
  );
}
