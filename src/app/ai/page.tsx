import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
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
  Sparkles,
  Target,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { StageBadge } from "@/components/ui/stage-badge";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { appEnv } from "@/server/recovery/config";
import { getAIOrchestrator } from "@/server/recovery/ai/orchestrator";
import type {
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
  title: "AI Engine | Shield Recovery",
};

export default async function AIPage() {
  if (!appEnv.experimentalPagesEnabled) {
    notFound();
  }

  const orchestrator = getAIOrchestrator();
  const data = await orchestrator.getDashboardData();

  const highCount = data.classifications.filter(
    (c) => c.classification.probability === "high",
  ).length;
  const mediumCount = data.classifications.filter(
    (c) => c.classification.probability === "medium",
  ).length;
  const lowCount = data.classifications.filter(
    (c) => c.classification.probability === "low",
  ).length;
  const manualCount = data.classifications.filter(
    (c) => c.classification.probability === "manual",
  ).length;

  return (
    <PlatformAppPage
      currentPath="/ai"
      action={
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[0.65rem] font-medium text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            AI Engine ativo
          </span>
        </div>
      }
    >
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
      <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_20rem]">
        {/* Left column */}
        <div className="space-y-5">
          {/* ─── AI Activity Feed ─── */}
          <PlatformSurface className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-orange-500" />
                <h3 className="text-sm font-semibold text-[#1a1a2e]">
                  AI Activity Feed
                </h3>
              </div>
              <span className="text-xs text-[#9ca3af]">
                Últimas {data.activity.length} ações
              </span>
            </div>

            <div className="max-h-[22rem] overflow-y-auto space-y-1.5">
              {data.activity.slice(0, 15).map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
              {data.activity.length === 0 && (
                <PlatformInset className="p-5 text-center">
                  <Bot className="mx-auto h-5 w-5 text-[#d1d5db]" />
                  <p className="mt-2 text-sm text-[#9ca3af]">
                    Nenhuma atividade da AI ainda.
                  </p>
                </PlatformInset>
              )}
            </div>
          </PlatformSurface>

          {/* ─── Recovery Intelligence Panel ─── */}
          <PlatformSurface className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-orange-500" />
                <h3 className="text-sm font-semibold text-[#1a1a2e]">
                  Recovery Intelligence
                </h3>
              </div>
              <div className="flex gap-2 text-[0.6rem]">
                <ProbabilityPill probability="high" count={highCount} />
                <ProbabilityPill probability="medium" count={mediumCount} />
                <ProbabilityPill probability="low" count={lowCount} />
                <ProbabilityPill probability="manual" count={manualCount} />
              </div>
            </div>

            <div className="space-y-2">
              {data.classifications.length === 0 ? (
                <PlatformInset className="p-5 text-center">
                  <Brain className="mx-auto h-5 w-5 text-[#d1d5db]" />
                  <p className="mt-2 text-sm text-[#9ca3af]">
                    Nenhum lead classificado ainda.
                  </p>
                  <p className="mt-1 text-xs text-[#d1d5db]">
                    Leads serão classificados automaticamente quando entrarem no sistema.
                  </p>
                </PlatformInset>
              ) : (
                data.classifications.slice(0, 8).map((item) => (
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
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-orange-500" />
                <h3 className="text-sm font-semibold text-[#1a1a2e]">
                  Strategy Engine
                </h3>
              </div>
              <span className="text-xs text-[#9ca3af]">
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
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-orange-500" />
                <h3 className="text-sm font-semibold text-[#1a1a2e]">
                  AI Learning & Performance
                </h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {data.strategyPerformance.length === 0 ? (
                <PlatformInset className="p-5 text-center">
                  <TrendingUp className="mx-auto h-5 w-5 text-[#d1d5db]" />
                  <p className="mt-2 text-sm text-[#9ca3af]">
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
              <Shield className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-medium text-[#717182]">
                AI Engine Status
              </h3>
            </div>

            <div className="mt-3 space-y-2.5">
              <StatusLine label="Orchestrator" status="running" />
              <StatusLine label="Classifier" status="running" />
              <StatusLine label="Message Generator" status="running" />
              <StatusLine label="Strategy Engine" status="running" />
              <StatusLine label="LLM Integration" status="pending" detail="OpenAI API não configurada" />
            </div>
          </PlatformSurface>

          {/* ─── Message Generation Preview ─── */}
          <PlatformSurface className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-medium text-[#717182]">
                Gerador de mensagens
              </h3>
            </div>

            {data.classifications[0] ? (
              <MessagePreview contact={data.classifications[0]} />
            ) : (
              <p className="mt-3 text-xs text-[#9ca3af]">
                Nenhum lead para gerar preview.
              </p>
            )}
          </PlatformSurface>

          {/* ─── Human Override Panel ─── */}
          <PlatformSurface className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-medium text-[#717182]">
                Override humano
              </h3>
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
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-[#f5f5f7] px-3 py-2 text-xs font-medium text-[#374151] transition-colors hover:bg-[#eeeef0]"
            >
              Abrir CRM
              <ArrowRight className="h-3 w-3" />
            </Link>
          </PlatformSurface>

          {/* ─── CRM Integration Rules ─── */}
          <PlatformSurface className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-medium text-[#717182]">
                Regras CRM
              </h3>
            </div>

            <div className="mt-3 space-y-2.5 text-xs text-[#717182]">
              <CRMRule trigger="Webhook recebido" action='Criar lead em "Entrada"' />
              <CRMRule trigger="Cliente respondeu" action='Mover para "Em contato"' />
              <CRMRule trigger="Aguardando pagamento" action='Mover para "Esperando retorno"' />
              <CRMRule trigger="Pagamento confirmado" action="Fechar lead como recuperado" />
              <CRMRule trigger="Takeover manual" action="Atribuir responsável humano" />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

/* ══════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════ */

function ActivityRow({ entry }: { entry: AIActivityEntry }) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#f5f5f7]">
      <ActivityIcon type={entry.actionType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs text-[#1a1a2e] truncate">{entry.outcome}</p>
          {entry.channel && (
            <span className="text-[0.6rem] uppercase tracking-wider text-[#9ca3af]">
              {entry.channel}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[0.6rem] text-[#d1d5db]">
          <Link
            href={`/leads/${entry.leadId}`}
            className="text-orange-500 hover:underline"
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
    message_sent: { icon: Send, color: "text-green-500" },
    payment_intent_detected: { icon: CreditCard, color: "text-amber-500" },
    escalated_to_human: { icon: User, color: "text-red-500" },
    recovery_closed: { icon: CheckCircle2, color: "text-green-500" },
    strategy_selected: { icon: Zap, color: "text-purple-500" },
    lead_classified: { icon: Brain, color: "text-cyan-500" },
    follow_up_scheduled: { icon: Clock, color: "text-orange-500" },
    response_detected: { icon: MessageCircle, color: "text-emerald-500" },
  };

  const config = iconMap[type] ?? { icon: Bot, color: "text-[#9ca3af]" };
  const Icon = config.icon;

  return (
    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7]">
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
    high: "border-green-200 bg-green-50 text-green-600",
    medium: "border-amber-200 bg-amber-50 text-amber-600",
    low: "border-orange-200 bg-orange-50 text-orange-600",
    manual: "border-red-200 bg-red-50 text-red-600",
  };

  const labels: Record<RecoveryProbability, string> = {
    high: "Alta",
    medium: "Média",
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
    high: "bg-green-500",
    medium: "bg-amber-500",
    low: "bg-orange-500",
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
            className="text-sm font-medium text-[#1a1a2e] truncate hover:text-orange-500 transition-colors"
          >
            {contact.customer_name}
          </Link>
          <StageBadge stage={contact.lead_status} />
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-semibold text-[#1a1a2e]">
            {classification.score}
          </span>
          <span className="text-sm font-semibold text-[#1a1a2e]">
            {formatCurrency(contact.payment_value)}
          </span>
        </div>
      </div>

      <p className="mt-1.5 text-[0.65rem] text-[#9ca3af] line-clamp-1">
        {classification.reasoning}
      </p>
      <p className="mt-0.5 text-[0.6rem] text-[#d1d5db]">
        {classification.suggestedStrategy}
      </p>
    </PlatformInset>
  );
}

function StrategyCard({ strategy }: { strategy: RecoveryStrategy }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-[#f9f9fb] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-orange-500" />
          <h4 className="text-xs font-medium text-[#1a1a2e]">{strategy.name}</h4>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${
            strategy.enabled
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"
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
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#f0f0f4] text-[0.55rem] font-semibold text-[#717182]">
        {step.order}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] text-[#374151] line-clamp-1">
          {step.action}
        </p>
        <div className="flex items-center gap-1.5 text-[0.55rem] text-[#d1d5db]">
          <span>{channelLabel}</span>
          <span>·</span>
          <span>{delay}</span>
          {step.condition && (
            <>
              <span>·</span>
              <span className="text-[#9ca3af]">se: {step.condition}</span>
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
        <h4 className="text-xs font-medium text-[#1a1a2e]">{perf.strategyName}</h4>
        <span className="text-xs font-semibold text-orange-500">
          {perf.successRate.toFixed(0)}% sucesso
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[0.55rem] uppercase text-[#d1d5db]">Usos</p>
          <p className="text-xs font-medium text-[#374151]">{perf.timesUsed}</p>
        </div>
        <div>
          <p className="text-[0.55rem] uppercase text-[#d1d5db]">Tempo médio</p>
          <p className="text-xs font-medium text-[#374151]">{perf.averageRecoveryTimeHours}h</p>
        </div>
        <div>
          <p className="text-[0.55rem] uppercase text-[#d1d5db]">Resposta</p>
          <p className="text-xs font-medium text-[#374151]">{perf.responseRate}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 w-full rounded-full bg-[#f0f0f4]">
        <div
          className="h-1 rounded-full bg-orange-500"
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
      <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageCircle className="h-3 w-3 text-orange-500" />
          <span className="text-[0.6rem] uppercase tracking-wider text-orange-500">
            WhatsApp preview
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[#374151]">{preview}</p>
      </div>

      <div className="mt-2 flex items-center justify-between text-[0.6rem] text-[#d1d5db]">
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
    running: { dot: "bg-green-500", text: "text-green-600", label: "Online" },
    pending: { dot: "bg-amber-500", text: "text-amber-600", label: "Pendente" },
    error: { dot: "bg-red-500", text: "text-red-600", label: "Erro" },
  };

  const s = styles[status];

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#717182]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          <span className={`text-[0.6rem] font-medium ${s.text}`}>
            {s.label}
          </span>
        </div>
      </div>
      {detail && (
        <p className="mt-0.5 text-[0.55rem] text-[#d1d5db]">{detail}</p>
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
    <div className="flex items-center justify-between gap-2 rounded-lg border border-black/[0.06] bg-[#f9f9fb] px-3 py-2">
      <div>
        <p className="text-xs font-medium text-[#374151]">{label}</p>
        <p className="text-[0.6rem] text-[#d1d5db]">{description}</p>
      </div>
      <Eye className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
    </div>
  );
}

function CRMRule({ trigger, action }: { trigger: string; action: string }) {
  return (
    <div className="flex items-start gap-2">
      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-orange-500" />
      <div>
        <p className="text-[#374151]">{trigger}</p>
        <p className="text-[#d1d5db]">{action}</p>
      </div>
    </div>
  );
}
