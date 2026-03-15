import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { RecoveryChart } from "@/components/ui/recovery-chart";
import type { DataPoint } from "@/components/ui/recovery-chart";
import { StageBadge } from "@/components/ui/stage-badge";
import { TimeBadge } from "@/components/ui/time-badge";
import { hasPhone, pickBestContact } from "@/lib/contact";
import { formatCurrency } from "@/lib/format";
import { recommendedNextAction, scorePriority } from "@/lib/stage";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type { FollowUpContact } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recuperação | Shield Recovery",
};

export default async function DashboardPage() {
  await requireAuthenticatedSession();
  const service = getPaymentRecoveryService();
  const [analytics, contacts] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
  ]);

  const activeContacts = contacts.filter(
    (contact) =>
      contact.lead_status !== "RECOVERED" && contact.lead_status !== "LOST",
  );
  const recoveredContacts = contacts.filter(
    (contact) => contact.lead_status === "RECOVERED",
  );
  const lostContacts = contacts.filter((contact) => contact.lead_status === "LOST");
  const waitingContacts = activeContacts.filter(
    (contact) => contact.lead_status === "WAITING_CUSTOMER",
  );
  const actionableContacts = activeContacts.filter(
    (contact) =>
      contact.lead_status === "NEW_RECOVERY" ||
      contact.lead_status === "CONTACTING",
  );

  const prioritizedContacts = [...activeContacts]
    .sort((left, right) => scorePriority(right) - scorePriority(left))
    .slice(0, 5);

  const whatsappCount = contacts.filter((contact) => hasPhone(contact.phone)).length;
  const emailCount = contacts.filter(
    (contact) => contact.email && contact.email.includes("@"),
  ).length;
  const smsCount = Math.max(0, contacts.length - whatsappCount - emailCount);
  const channelTotal = Math.max(whatsappCount + emailCount + smsCount, 1);

  const chartData = buildChartData(contacts);

  return (
    <PlatformAppPage
      currentPath="/dashboard"
      action={
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Abrir CRM
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={CreditCard}
          label="casos em recuperação"
          value={activeContacts.length.toString()}
          subtitle="carteira ativa agora"
        />
        <PlatformMetricCard
          icon={CheckCircle2}
          label="recuperados"
          value={recoveredContacts.length.toString()}
          subtitle="casos concluídos"
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="taxa de recuperação"
          value={`${analytics.recovery_rate.toFixed(1)}%`}
          subtitle="resultado da carteira"
        />
        <PlatformMetricCard
          icon={MessageCircle}
          label="valor recuperado"
          value={formatCurrency(analytics.recovered_revenue)}
          subtitle="receita trazida de volta"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-5">
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
                  Carteira agora
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-[2rem]">
                  Leitura rápida do que precisa de atenção.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  O painel aqui resume somente o que ajuda a decidir prioridade:
                  casos novos, carteira parada, follow-up aguardando resposta e
                  cobertura de canais.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <PlatformPill>{actionableContacts.length} para agir</PlatformPill>
                <PlatformPill>{waitingContacts.length} aguardando cliente</PlatformPill>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <CompactStat
                label="Novos ou em contato"
                value={actionableContacts.length.toString()}
                detail="casos que pedem ação do time"
              />
              <CompactStat
                label="Esperando cliente"
                value={waitingContacts.length.toString()}
                detail="já abordados, mas sem retorno"
              />
              <CompactStat
                label="Perdidos"
                value={lostContacts.length.toString()}
                detail="encerrados sem recuperação"
              />
              <CompactStat
                label="Tempo médio"
                value={formatAverageRecoveryTime(analytics.average_recovery_time_hours)}
                detail="até uma recuperação fechar"
              />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
                  Ritmo da operação
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#111827]">
                  Recuperadas versus carteira que ainda está aberta.
                </h3>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <LegendPill color="bg-[#9ca3af]">abertas</LegendPill>
                <LegendPill color="bg-orange-500">recuperadas</LegendPill>
              </div>
            </div>

            <div className="mt-5">
              <RecoveryChart data={chartData} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
                  Casos prioritários
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#111827]">
                  A carteira que deveria abrir o dia da operação.
                </h3>
              </div>
              <Link
                href="/leads"
                className="text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
              >
                Ver CRM completo
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {prioritizedContacts.length === 0 ? (
                <PlatformInset className="p-5 text-center">
                  <p className="text-sm text-[#6b7280]">
                    Nenhum caso ativo na carteira agora.
                  </p>
                </PlatformInset>
              ) : (
                prioritizedContacts.map((contact) => (
                  <PriorityLeadRow key={contact.lead_id} contact={contact} />
                ))
              )}
            </div>
          </PlatformSurface>
        </div>

        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
              Cobertura por canal
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#111827]">
              Onde a carteira já pode ser acionada.
            </h3>

            <div className="mt-5 space-y-4">
              <ChannelBar
                label="WhatsApp"
                count={whatsappCount}
                percentage={Math.round((whatsappCount / channelTotal) * 100)}
                color="bg-green-500"
              />
              <ChannelBar
                label="Email"
                count={emailCount}
                percentage={Math.round((emailCount / channelTotal) * 100)}
                color="bg-sky-500"
              />
              <ChannelBar
                label="SMS"
                count={smsCount}
                percentage={Math.max(
                  0,
                  100 -
                    Math.round((whatsappCount / channelTotal) * 100) -
                    Math.round((emailCount / channelTotal) * 100),
                )}
                color="bg-violet-500"
              />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
              Saúde da carteira
            </p>

            <div className="mt-4 space-y-3">
              <MetricLine
                label="Receita em recuperação"
                value={formatCurrency(
                  activeContacts.reduce(
                    (total, contact) => total + contact.payment_value,
                    0,
                  ),
                )}
              />
              <MetricLine
                label="Casos aguardando resposta"
                value={waitingContacts.length.toString()}
              />
              <MetricLine
                label="Sem responsável"
                value={activeContacts
                  .filter((contact) => !contact.assigned_agent)
                  .length.toString()}
              />
              <MetricLine
                label="Contatos alcançáveis"
                value={activeContacts
                  .filter(
                    (contact) =>
                      hasPhone(contact.phone) ||
                      (contact.email && contact.email.includes("@")),
                  )
                  .length.toString()}
              />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-orange-50 p-2 text-orange-500">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  O que acompanhar agora
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6b7280]">
                  <li>
                    Priorize primeiro os casos novos com maior valor e canal
                    disponível.
                  </li>
                  <li>
                    Use a inbox para dar sequência nos casos já em contato, sem
                    duplicar abordagem no CRM.
                  </li>
                  <li>
                    Quando o cliente responder, mova o caso no CRM e mantenha a
                    conversa na mesma thread.
                  </li>
                </ul>
              </div>
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function CompactStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-[#f9fafb] px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#9ca3af]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
        {value}
      </p>
      <p className="mt-1 text-sm leading-6 text-[#6b7280]">{detail}</p>
    </div>
  );
}

function LegendPill({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {children}
    </span>
  );
}

function ChannelBar({
  label,
  count,
  percentage,
  color,
}: {
  label: string;
  count: number;
  percentage: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <span className="text-sm font-medium text-[#111827]">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#9ca3af]">{count}</span>
          <span className="font-semibold text-[#111827]">{percentage}%</span>
        </div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#eef0f3]">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-black/[0.05] bg-[#f9fafb] px-3.5 py-3">
      <span className="text-sm text-[#6b7280]">{label}</span>
      <span className="text-sm font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function PriorityLeadRow({ contact }: { contact: FollowUpContact }) {
  return (
    <Link
      href={`/leads/${contact.lead_id}`}
      className="block rounded-2xl border border-black/[0.06] bg-[#fbfbfc] p-4 transition-all hover:border-orange-200 hover:shadow-[0_16px_40px_rgba(17,24,39,0.06)]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-[#111827]">
              {contact.customer_name}
            </p>
            <StageBadge stage={contact.lead_status} />
            <TimeBadge updatedAt={contact.updated_at} />
          </div>
          <p className="mt-1 text-sm text-[#6b7280]">
            {contact.product || "Produto não informado"}
          </p>
        </div>

        <div className="text-left lg:text-right">
          <p className="text-base font-semibold text-[#111827]">
            {formatCurrency(contact.payment_value)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#9ca3af]">
            {pickBestContact(contact.phone, contact.email)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <DetailBox label="Responsável" value={contact.assigned_agent || "Sem dono"} />
        <DetailBox label="Canal" value={hasPhone(contact.phone) ? "WhatsApp" : "Email"} />
        <DetailBox label="Próxima ação" value={recommendedNextAction(contact)} />
      </div>
    </Link>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-white px-3 py-2.5">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#9ca3af]">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-[#374151]">{value}</p>
    </div>
  );
}

function formatAverageRecoveryTime(hours: number) {
  if (!hours || Number.isNaN(hours) || hours <= 0) return "n/d";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function buildChartData(
  contacts: { lead_status: string; created_at?: string; updated_at: string }[],
): DataPoint[] {
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const now = new Date();
  const currentMonth = now.getMonth();
  const labels: string[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    labels.push(months[(currentMonth - offset + 12) % 12]);
  }

  const activeByMonth = new Map<string, number>();
  const recoveredByMonth = new Map<string, number>();

  for (const contact of contacts) {
    const referenceDate = contact.updated_at || contact.created_at;
    if (!referenceDate) continue;
    const label = months[new Date(referenceDate).getMonth()];

    if (contact.lead_status === "RECOVERED") {
      recoveredByMonth.set(label, (recoveredByMonth.get(label) || 0) + 1);
      continue;
    }

    activeByMonth.set(label, (activeByMonth.get(label) || 0) + 1);
  }

  return labels.map((label) => ({
    label,
    lost: activeByMonth.get(label) || 0,
    recovered: recoveredByMonth.get(label) || 0,
  }));
}
