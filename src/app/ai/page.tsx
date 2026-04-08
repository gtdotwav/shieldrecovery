import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Layers,
  MessageCircle,
  Play,
  Send,
  Shield,
  Target,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { StageBadge } from "@/components/ui/stage-badge";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { platformBrand } from "@/lib/platform";
import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getAIOrchestrator } from "@/server/recovery/ai/orchestrator";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type {
  AIDashboardData,
  AIActivityEntry,
  AIActivityType,
  RecoveryClassification,
  RecoveryProbability,
  RecoveryStrategy,
  StrategyPerformance,
  StrategyStep,
} from "@/server/recovery/ai/types";
import type { FollowUpContact } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Automações",
};

export default async function AIPage() {
  const session = await requireAuthenticatedSession(["admin", "seller", "market"]);
  const recoveryService = getPaymentRecoveryService();
  const sellerIdentity =
    session.role === "seller"
      ? await getSellerIdentityByEmail(session.email)
      : null;
  const sellerControl =
    session.role === "seller"
      ? await recoveryService.getSellerAdminControlForName(sellerIdentity?.agentName)
      : undefined;

  if (session.role === "seller" && sellerControl && !sellerControl.automationsEnabled) {
    return (
      <PlatformAppPage currentPath="/ai">
        <PlatformSurface className="p-6 sm:p-7">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Automações bloqueadas pelo admin
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Esta área foi pausada para este seller.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            O admin desativou o acesso a automações para esta carteira. O CRM
            continua disponível, mas regras, IA e automações ficam sob controle
            central até nova liberação.
          </p>
        </PlatformSurface>
      </PlatformAppPage>
    );
  }

  const orchestrator = getAIOrchestrator();
  const data = await orchestrator.getDashboardData();
  const visibleClassifications =
    session.role === "seller"
      ? data.classifications.filter((item) =>
          canRoleAccessAgent(
            session.role,
            item.assigned_agent,
            sellerIdentity?.agentName,
          ),
        )
      : data.classifications;
  const visibleLeadIds = new Set(visibleClassifications.map((item) => item.lead_id));
  const visibleActivity =
    session.role === "seller"
      ? data.activity.filter((entry) => visibleLeadIds.has(entry.leadId))
      : data.activity;

  const highCount = visibleClassifications.filter(
    (c) => c.classification.probability === "high",
  ).length;
  const mediumCount = visibleClassifications.filter(
    (c) => c.classification.probability === "medium",
  ).length;
  const lowCount = visibleClassifications.filter(
    (c) => c.classification.probability === "low",
  ).length;
  const manualCount = visibleClassifications.filter(
    (c) => c.classification.probability === "manual",
  ).length;

  return (
    <PlatformAppPage
      currentPath="/ai"
      action={
        session.role === "seller" ? (
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            Abrir CRM
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <PlatformPill>motor ativo</PlatformPill>
        )
      }
    >
      {session.role === "seller" ? (
        <SellerAutomationWorkspace
          data={data}
          classifications={visibleClassifications}
          activity={visibleActivity}
        />
      ) : (
        <>
          {/* ─── AI Overview Metrics ─── */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PlatformMetricCard
              icon={Target}
              label="Taxa de recuperação"
              value={`${data.metrics.recoveryRate.toFixed(1)}%`}
            />
            <PlatformMetricCard
              icon={TrendingUp}
              label="Valor recuperado"
              value={formatCurrency(data.metrics.totalValueRecovered)}
            />
            <PlatformMetricCard
              icon={Layers}
              label="Estratégias ativas"
              value={String(data.metrics.strategiesRunning)}
            />
            <PlatformMetricCard
              icon={Send}
              label="Mensagens (24h)"
              value={String(data.metrics.messagesGeneratedToday)}
            />
          </section>

          {/* ─── Main grid ─── */}
          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_20rem]">
            {/* Left column */}
            <div className="space-y-5">
              {/* ─── AI Activity Feed ─── */}
              <PlatformSurface className="p-4 sm:p-5">
                <div className="flex items-center justify-between pb-3">
                  <SectionHeader eyebrow="Fluxo recente" title="Atividade recente" compact />
                  <span className="text-xs text-[var(--muted)]">
                    Últimas {visibleActivity.length} ações
                  </span>
                </div>

                <div className="max-h-[22rem] space-y-1.5 overflow-y-auto">
                  {visibleActivity.slice(0, 15).map((entry) => (
                    <ActivityRow key={entry.id} entry={entry} />
                  ))}
                  {visibleActivity.length === 0 && (
                    <PlatformInset className="p-5 text-center">
                      <Bot className="mx-auto h-5 w-5 text-[var(--muted)]" />
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Nenhuma atividade da IA ainda.
                      </p>
                    </PlatformInset>
                  )}
                </div>
              </PlatformSurface>

              {/* ─── Recovery Intelligence Panel ─── */}
              <PlatformSurface className="p-4 sm:p-5">
                <div className="flex items-center justify-between pb-3">
                  <SectionHeader
                    eyebrow="Leitura de recuperação"
                    title="Casos priorizados pela IA"
                    compact
                  />
                  <div className="flex gap-2 text-[0.6rem]">
                    <ProbabilityPill probability="high" count={highCount} />
                    <ProbabilityPill probability="medium" count={mediumCount} />
                    <ProbabilityPill probability="low" count={lowCount} />
                    <ProbabilityPill probability="manual" count={manualCount} />
                  </div>
                </div>

                <div className="space-y-2">
                  {visibleClassifications.length === 0 ? (
                    <PlatformInset className="p-5 text-center">
                      <Brain className="mx-auto h-5 w-5 text-[var(--muted)]" />
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Nenhum lead classificado ainda.
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        A classificação aparece assim que os casos entram.
                      </p>
                    </PlatformInset>
                  ) : (
                    visibleClassifications.slice(0, 8).map((item) => (
                      <ClassifiedLeadRow
                        key={item.lead_id}
                        contact={item}
                        classification={item.classification}
                      />
                    ))
                  )}
                </div>
              </PlatformSurface>

              {/* ─── AI Strategy Engine ─── */}
              <PlatformSurface className="p-4 sm:p-5">
                <div className="flex items-center justify-between pb-3">
                  <SectionHeader eyebrow="Estratégias ativas" title="Sequências em uso agora" compact />
                  <span className="text-xs text-[var(--muted)]">
                    {data.strategies.filter((s) => s.enabled).length} estratégias ativas
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {data.strategies.map((strategy) => (
                    <StrategyCard key={strategy.id} strategy={strategy} />
                  ))}
                </div>
              </PlatformSurface>

              {/* ─── AI Learning System ─── */}
              <PlatformSurface className="p-4 sm:p-5">
                <div className="pb-3">
                  <SectionHeader
                    eyebrow="Performance e aprendizado"
                    title="O que está funcionando melhor"
                    compact
                  />
                </div>

                <div className="space-y-2.5">
                  {data.strategyPerformance.length === 0 ? (
                    <PlatformInset className="p-5 text-center">
                      <TrendingUp className="mx-auto h-5 w-5 text-[var(--muted)]" />
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Dados de performance aparecem após primeiros ciclos de recuperação.
                      </p>
                    </PlatformInset>
                  ) : (
                    data.strategyPerformance.map((perf) => (
                      <PerformanceRow key={perf.strategyId} perf={perf} />
                    ))
                  )}
                </div>
              </PlatformSurface>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4 2xl:sticky 2xl:top-20 2xl:self-start">
              {/* ─── AI Engine Status ─── */}
              <PlatformSurface className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[var(--accent)]" />
                  <SectionHeader eyebrow="Estado da IA" title="Motor da automação" compact />
                </div>

                <div className="mt-3 space-y-2.5">
                  <StatusLine label="Orchestrator" status="running" />
                  <StatusLine label="Classifier" status="running" />
                  <StatusLine label="Message Generator" status="running" />
                  <StatusLine label="Strategy Engine" status="running" />
                  <StatusLine label="LLM Integration" status="pending" detail="OpenAI API não configurada" />
                </div>
                {visibleClassifications[0] ? (
                  <MessagePreview contact={visibleClassifications[0]} />
                ) : (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Ainda não há lead para gerar prévia.
                  </p>
                )}
              </PlatformSurface>

              {/* ─── Human Override Panel ─── */}
              <PlatformSurface className="p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[var(--accent)]" />
                  <SectionHeader eyebrow="Leitura operacional" title="Quando o humano entra" compact />
                </div>

                <div className="mt-3 space-y-2">
                  <OverrideOption
                    label="Pausar AI para lead"
                    description="Pausa toda automação para um caso específico"
                  />
                  <OverrideOption
                    label="Assumir conversa"
                    description="Agente toma controle do chat"
                  />
                  <OverrideOption
                    label="Mudar estratégia"
                    description="Trocar a estratégia de recuperação"
                  />
                  <OverrideOption
                    label="Escalar prioridade"
                    description="Mover lead para atenção imediata"
                  />
                </div>

                <Link
                  href="/leads"
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground-secondary)] transition-colors hover:bg-[#eeeef0]"
                >
                  Abrir CRM
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <div className="mt-4 space-y-2.5 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
                  <CRMRule trigger="Webhook recebido" action='Criar lead em "Entrada"' />
                  <CRMRule trigger="Cliente respondeu" action='Mover para "Em contato"' />
                  <CRMRule trigger="Aguardando pagamento" action='Mover para "Esperando retorno"' />
                  <CRMRule trigger="Pagamento confirmado" action="Fechar lead como recuperado" />
                  <CRMRule trigger="Takeover manual" action="Atribuir responsável humano" />
                </div>
              </PlatformSurface>
            </div>
          </section>
        </>
      )}
    </PlatformAppPage>
  );
}

function SellerAutomationWorkspace({
  data,
  classifications,
  activity,
}: {
  data: AIDashboardData;
  classifications: Array<
    FollowUpContact & { classification: RecoveryClassification }
  >;
  activity: AIActivityEntry[];
}) {
  const activeStrategies = data.strategies.filter((strategy) => strategy.enabled);
  const sellerQueue = classifications
    .filter(
      (item) =>
        item.lead_status !== "RECOVERED" &&
        item.lead_status !== "LOST",
    )
    .slice(0, 6);
  const manualCount = classifications.filter(
    (item) => item.classification.probability === "manual",
  ).length;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={Bot}
          label="fluxos ativos"
          value={String(activeStrategies.length)}
          subtitle="automações em execução"
        />
        <PlatformMetricCard
          icon={Send}
          label="mensagens hoje"
          value={String(
            activity.filter((entry) => entry.actionType === "message_sent").length,
          )}
          subtitle="abordagens da IA nas últimas 24h"
        />
        <PlatformMetricCard
          icon={Eye}
          label="pedem revisão"
          value={String(manualCount)}
          subtitle="casos para acompanhamento humano"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_19rem]">
        <div className="space-y-5">
          <PlatformSurface className="p-5 sm:p-6">
            <div className="grid gap-5 border-b border-[var(--border)] pb-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:items-end">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                  Automações de seller
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.95rem]">
                  O que a IA já está fazendo e onde você entra.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Esta visão existe para acompanhar os follow-ups ativos, entender
                  o que a IA está conduzindo e identificar onde vale revisão humana.
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {sellerQueue.length} casos priorizados,{" "}
                  {activity.filter((entry) => entry.actionType === "response_detected").length} respostas recentes e{" "}
                  {classifications.filter((item) => item.payment_status === "succeeded").length} recuperados.
                </p>
              </div>

              <div className="rounded-[1.1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                Use esta área para acompanhar prioridade, respostas e ritmo da IA.
                Quando precisar intervir, abra o CRM.
              </div>
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <SectionHeader eyebrow="Fila sugerida" title="Casos priorizados pela automação." />
              <Link
                href="/leads"
                className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
              >
                Ver CRM
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {sellerQueue.length === 0 ? (
                <PlatformInset className="p-6 text-center">
                  <Bot className="mx-auto h-6 w-6 text-gray-300 dark:text-gray-600" />
                  <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                    Nenhum caso classificado ainda.
                  </p>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Quando a carteira entrar, a prioridade aparece aqui.
                  </p>
                  <Link
                    href="/leads"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Verificar CRM
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </PlatformInset>
              ) : (
                sellerQueue.map((item) => (
                  <SellerLeadRow key={item.lead_id} item={item} />
                ))
              )}
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <SectionHeader eyebrow="Fluxos ativos" title="Sequências em uso agora." />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {activeStrategies.slice(0, 4).map((strategy) => (
                <div
                  key={strategy.id}
                  className="rounded-[1.1rem] border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[var(--accent)]" />
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {strategy.name}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--muted)]">
                      ativo
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {strategy.triggerCondition}
                  </p>
                  <div className="mt-4 space-y-2">
                    {strategy.steps.slice(0, 3).map((step) => (
                      <div key={step.order} className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[0.65rem] font-semibold text-[var(--muted)]">
                          {step.order}
                        </span>
                        <span className="truncate">{step.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PlatformSurface>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="O que a IA faz sozinha" title="Escopo da automação." compact />
            <div className="mt-4 space-y-2.5 text-sm leading-6 text-[var(--foreground-secondary)]">
              <PlatformInset className="px-3 py-3">
                Classifica o caso por chance de recuperação e prioridade.
              </PlatformInset>
              <PlatformInset className="px-3 py-3">
                Escolhe a estratégia de abordagem e a sequência inicial.
              </PlatformInset>
              <PlatformInset className="px-3 py-3">
                Gera a copy do follow-up e acompanha o contexto da thread.
              </PlatformInset>
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Últimas leituras" title="Sinais recentes." compact />
            <div className="mt-4 space-y-2">
              {activity.slice(0, 5).map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </div>
          </PlatformSurface>
        </div>
      </section>
    </>
  );
}

/* ══════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════ */

function ActivityRow({ entry }: { entry: AIActivityEntry }) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--surface-strong)]">
      <ActivityIcon type={entry.actionType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs text-[var(--foreground)] truncate">{entry.outcome}</p>
          {entry.channel && (
            <span className="text-[0.6rem] uppercase tracking-wider text-[var(--muted)]">
              {entry.channel}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[0.6rem] text-[var(--muted)]">
          <Link
            href={`/leads/${entry.leadId}`}
            className="text-[var(--accent)] hover:underline"
          >
            {entry.customerName}
          </Link>
          <span>{formatRelativeTime(entry.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: AIActivityType }) {
  const iconMap: Record<AIActivityType, { icon: typeof Bot; color: string }> = {
    sequence_started: { icon: Play, color: "text-blue-500" },
    message_sent: { icon: Send, color: "text-[var(--accent)]" },
    payment_intent_detected: { icon: CreditCard, color: "text-amber-500" },
    escalated_to_human: { icon: User, color: "text-red-500" },
    recovery_closed: { icon: CheckCircle2, color: "text-[var(--accent)]" },
    strategy_selected: { icon: Zap, color: "text-purple-500" },
    lead_classified: { icon: Brain, color: "text-cyan-500" },
    follow_up_scheduled: { icon: Clock, color: "text-[var(--accent)]" },
    response_detected: { icon: MessageCircle, color: "text-[var(--accent)]" },
  };

  const config = iconMap[type] ?? { icon: Bot, color: "text-[var(--muted)]" };
  const Icon = config.icon;

  return (
    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--background)]">
      <Icon className={`h-3 w-3 ${config.color}`} />
    </div>
  );
}

function ProbabilityPill({
  probability,
  count,
}: {
  probability: RecoveryProbability;
  count: number;
}) {
  const styles: Record<RecoveryProbability, string> = {
    high: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
    medium: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
    low: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
    manual: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
  };

  const labels: Record<RecoveryProbability, string> = {
    high: "Alta",
    medium: "Media",
    low: "Baixa",
    manual: "Manual",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${styles[probability]}`}
    >
      {labels[probability]}
      <span className="font-semibold">{count}</span>
    </span>
  );
}

function ClassifiedLeadRow({
  contact,
  classification,
}: {
  contact: FollowUpContact;
  classification: RecoveryClassification;
}) {
  const probColors: Record<RecoveryProbability, string> = {
    high: "bg-[var(--accent)]",
    medium: "bg-amber-500",
    low: "bg-[var(--accent)]",
    manual: "bg-red-500",
  };

  return (
    <PlatformInset className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`h-2 w-2 rounded-full shrink-0 ${probColors[classification.probability]}`}
          />
          <Link
            href={`/leads/${contact.lead_id}`}
            className="text-sm font-medium text-[var(--foreground)] truncate hover:text-[var(--accent)] transition-colors"
          >
            {contact.customer_name}
          </Link>
          <StageBadge stage={contact.lead_status} />
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-semibold text-[var(--foreground)]">
            {classification.score}
          </span>
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {formatCurrency(contact.payment_value)}
          </span>
        </div>
      </div>

      <p className="mt-1.5 text-[0.65rem] text-[var(--muted)] line-clamp-1">
        {classification.reasoning}
      </p>
      <p className="mt-0.5 text-[0.6rem] text-[var(--muted)]">
        {classification.suggestedStrategy}
      </p>
    </PlatformInset>
  );
}

function SellerLeadRow({
  item,
}: {
  item: FollowUpContact & { classification: RecoveryClassification };
}) {
  return (
    <Link
      href={`/leads/${item.lead_id}`}
      className="block rounded-[1.1rem] border border-[var(--border)] bg-[var(--surface-strong)] p-4 transition-colors hover:bg-[var(--surface)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {item.customer_name}
            </p>
            <StageBadge stage={item.lead_status} />
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {item.classification.reasoning}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {formatCurrency(item.payment_value)}
          </p>
          <p className="mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            score {item.classification.score}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <PlatformInset className="px-3 py-2.5">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Estratégia
          </p>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            {item.classification.suggestedStrategy}
          </p>
        </PlatformInset>
        <PlatformInset className="px-3 py-2.5">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Último sinal
          </p>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            {formatRelativeTime(item.updated_at)}
          </p>
        </PlatformInset>
      </div>
    </Link>
  );
}

function StrategyCard({ strategy }: { strategy: RecoveryStrategy }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
          <h4 className="text-xs font-medium text-[var(--foreground)]">{strategy.name}</h4>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${
            strategy.enabled
              ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
          }`}
        >
          {strategy.enabled ? "Ativo" : "Inativo"}
        </span>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {strategy.steps.map((step) => (
          <StrategyStepRow key={step.order} step={step} />
        ))}
      </div>
    </div>
  );
}

function StrategyStepRow({ step }: { step: StrategyStep }) {
  const channelLabel =
    step.channel === "system"
      ? "Sistema"
      : step.channel === "whatsapp"
        ? "WhatsApp"
        : step.channel === "email"
          ? "E-mail"
          : "SMS";

  const delay =
    step.delayMinutes === 0
      ? "Imediato"
      : step.delayMinutes < 60
        ? `${step.delayMinutes}min`
        : step.delayMinutes < 1440
          ? `${Math.floor(step.delayMinutes / 60)}h`
          : `${Math.floor(step.delayMinutes / 1440)}d`;

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[0.55rem] font-semibold text-[var(--muted)]">
        {step.order}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] text-[var(--foreground-secondary)] line-clamp-1">
          {step.action}
        </p>
        <div className="flex items-center gap-1.5 text-[0.55rem] text-[var(--muted)]">
          <span>{channelLabel}</span>
          <span>·</span>
          <span>{delay}</span>
          {step.condition && (
            <>
              <span>·</span>
              <span className="text-[var(--muted)]">se: {step.condition}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PerformanceRow({ perf }: { perf: StrategyPerformance }) {
  return (
    <PlatformInset className="p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-[var(--foreground)]">{perf.strategyName}</h4>
        <span className="text-xs font-semibold text-[var(--accent)]">
          {perf.successRate.toFixed(0)}% sucesso
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[0.55rem] uppercase text-[var(--muted)]">Usos</p>
          <p className="text-xs font-medium text-[var(--foreground-secondary)]">{perf.timesUsed}</p>
        </div>
        <div>
          <p className="text-[0.55rem] uppercase text-[var(--muted)]">Tempo médio</p>
          <p className="text-xs font-medium text-[var(--foreground-secondary)]">{perf.averageRecoveryTimeHours}h</p>
        </div>
        <div>
          <p className="text-[0.55rem] uppercase text-[var(--muted)]">Resposta</p>
          <p className="text-xs font-medium text-[var(--foreground-secondary)]">{perf.responseRate}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 w-full rounded-full bg-[var(--surface-strong)]">
        <div
          className="h-1 rounded-full bg-[var(--accent)]"
          style={{ width: `${Math.min(perf.successRate, 100)}%` }}
        />
      </div>
    </PlatformInset>
  );
}

function MessagePreview({
  contact,
}: {
  contact: FollowUpContact & { classification: RecoveryClassification };
}) {
  const name = contact.customer_name.split(" ")[0] ?? contact.customer_name;
  const value = formatCurrency(contact.payment_value);
  const product = contact.product ? ` de ${contact.product}` : "";

  const preview = `Oi ${name}! Notamos que houve um problema no pagamento${product} de ${value}. Queremos te ajudar a finalizar sua compra. Aqui está um novo link seguro: [link de pagamento]`;

  return (
    <div className="mt-3">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageCircle className="h-3 w-3 text-[var(--muted)]" />
          <span className="text-[0.6rem] uppercase tracking-wider text-[var(--muted)]">
            Prévia da mensagem
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--foreground-secondary)]">{preview}</p>
      </div>

      <div className="mt-2 flex items-center justify-between text-[0.6rem] text-[var(--muted)]">
        <span>Para: {contact.customer_name}</span>
        <span>Score: {contact.classification.score}</span>
      </div>
    </div>
  );
}

function StatusLine({
  label,
  status,
  detail,
}: {
  label: string;
  status: "running" | "pending" | "error";
  detail?: string;
}) {
  const styles = {
    running: { dot: "bg-[var(--accent)]", text: "text-[var(--accent)]", label: "Online" },
    pending: { dot: "bg-amber-500", text: "text-amber-600", label: "Pendente" },
    error: { dot: "bg-red-500", text: "text-red-600", label: "Erro" },
  };

  const s = styles[status];

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          <span className={`text-[0.6rem] font-medium ${s.text}`}>
            {s.label}
          </span>
        </div>
      </div>
      {detail && (
        <p className="mt-0.5 text-[0.55rem] text-[var(--muted)]">{detail}</p>
      )}
    </div>
  );
}

function OverrideOption({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2">
      <div>
        <p className="text-xs font-medium text-[var(--foreground-secondary)]">{label}</p>
        <p className="text-[0.6rem] text-[var(--muted)]">{description}</p>
      </div>
      <Eye className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
    </div>
  );
}

function CRMRule({ trigger, action }: { trigger: string; action: string }) {
  return (
    <div className="flex items-start gap-2">
      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent)]" />
      <div>
        <p className="text-[var(--foreground-secondary)]">{trigger}</p>
        <p className="text-[var(--muted)]">{action}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  compact?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
        {eyebrow}
      </p>
      <h3
        className={
          compact
            ? "mt-1.5 text-sm font-semibold text-[var(--foreground)]"
            : "mt-2 text-lg font-semibold text-[var(--foreground)]"
        }
      >
        {title}
      </h3>
    </div>
  );
}
