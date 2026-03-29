import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Mail,
  MessageCircle,
  Phone,
  PhoneCall,
  PhoneMissed,
  Send,
  User,
} from "lucide-react";

import {
  registerConversationReply,
  transitionLeadStage,
} from "@/app/actions/recovery-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { ActionButton } from "@/components/ui/action-button";
import { MessageBubble } from "@/components/ui/message-bubble";
import { StageBadge } from "@/components/ui/stage-badge";
import { TimeBadge } from "@/components/ui/time-badge";
import { pickBestContact, formatPhone, hasPhone } from "@/lib/contact";
import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
} from "@/lib/format";
import {
  mapPaymentMethod,
  mapPaymentStatus,
  mapStageLabel,
  recommendedNextAction,
} from "@/lib/stage";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type { CallRecord } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function LeadDetailPage({ params }: PageProps) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const { leadId } = await params;
  const service = getPaymentRecoveryService();
  const messaging = new MessagingService();
  const contacts = await service.getFollowUpContacts();
  const sellerIdentity =
    session.role === "seller"
      ? await getSellerIdentityByEmail(session.email)
      : null;

  const lead = contacts.find((contact) => contact.lead_id === leadId);

  if (
    !lead ||
    !canRoleAccessAgent(
      session.role,
      lead.assigned_agent,
      sellerIdentity?.agentName,
    )
  ) {
    notFound();
  }

  const callStorage = getStorageService();
  const leadCalls = await callStorage.listCalls({ leadId: leadId, limit: 10 });
  const inbox = await messaging.getInboxSnapshot();
  const relatedConversation = inbox.conversations.find(
    (conversation) => conversation.lead_id === leadId,
  );
  const selectedInbox = relatedConversation
    ? await messaging.getInboxSnapshot(relatedConversation.conversation_id)
    : inbox;
  const messages =
    relatedConversation &&
    selectedInbox.selectedConversation?.conversation_id ===
      relatedConversation.conversation_id
      ? selectedInbox.selectedMessages
      : [];

  const primaryChannel = hasPhone(lead.phone) ? "WhatsApp" : "Email";
  const bestContact = pickBestContact(lead.phone, lead.email);
  const displayContact = hasPhone(lead.phone)
    ? formatPhone(bestContact)
    : bestContact;
  const whatsappHref = hasPhone(lead.phone)
    ? `https://wa.me/${lead.phone.replace(/\D/g, "")}`
    : undefined;
  const emailHref =
    lead.email && lead.email !== "unknown@pagrecovery.local"
      ? `mailto:${lead.email}`
      : undefined;

  return (
    <PlatformAppPage
      currentPath="/leads"
      action={
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao CRM
        </Link>
      }
    >
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
        <Link href="/leads" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          CRM
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700 dark:text-gray-200">{lead.customer_name}</span>
      </nav>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_20rem]">
        <div className="space-y-5">
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StageBadge stage={lead.lead_status} />
                  <TimeBadge updatedAt={lead.updated_at} />
                  {relatedConversation ? (
                    <PlatformPill icon={MessageCircle}>
                      {relatedConversation.unread_count > 0
                        ? `${relatedConversation.unread_count} novas`
                        : "conversa em andamento"}
                    </PlatformPill>
                  ) : null}
                </div>

                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                    {lead.customer_name}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {lead.product || "Sem produto informado"} · pedido{" "}
                    {lead.order_id || "nao informado"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Abrir no WhatsApp
                    </a>
                  ) : null}
                  {emailHref ? (
                    <a
                      href={emailHref}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Enviar email
                    </a>
                  ) : null}
                  {relatedConversation ? (
                    <Link
                      href={`/inbox?conversationId=${relatedConversation.conversation_id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Abrir na inbox
                    </Link>
                  ) : null}
                </div>
              </div>

              <PlatformInset className="min-w-[16rem] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Valor em recuperação
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  {formatCurrency(lead.payment_value)}
                </p>
                <div className="mt-3 space-y-2">
                  <SummaryLine
                    label="Método"
                    value={mapPaymentMethod(lead.payment_method)}
                  />
                  <SummaryLine
                    label="Pagamento"
                    value={mapPaymentStatus(lead.payment_status)}
                  />
                  <SummaryLine
                    label="Contato principal"
                    value={`${primaryChannel} · ${displayContact}`}
                  />
                </div>
              </PlatformInset>
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                  Próxima ação
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  Mova o caso com um clique.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  O time não precisa pensar no fluxo inteiro toda vez. A ação
                  certa já fica explícita para o estágio atual do lead.
                </p>
              </div>

              <PlatformInset className="max-w-md p-4">
                <p className="text-xs text-[var(--muted)]">Recomendação atual</p>
                <p className="mt-1 text-sm leading-6 text-[var(--foreground-secondary)]">
                  {recommendedNextAction(lead)}
                </p>
              </PlatformInset>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StageAction
                leadId={lead.lead_id}
                currentStatus={lead.lead_status}
                targetStatus="CONTACTING"
                label="Marcar como contato"
              />
              <StageAction
                leadId={lead.lead_id}
                currentStatus={lead.lead_status}
                targetStatus="WAITING_CUSTOMER"
                label="Aguardando cliente"
              />
              <StageAction
                leadId={lead.lead_id}
                currentStatus={lead.lead_status}
                targetStatus="RECOVERED"
                label="Pagamento recuperado"
                variant="success"
              />
              <StageAction
                leadId={lead.lead_id}
                currentStatus={lead.lead_status}
                targetStatus="LOST"
                label="Marcar como perdido"
                variant="danger"
              />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                  Conversa
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  Histórico de tratativa
                </h2>
              </div>

              {relatedConversation ? (
                <div className="flex flex-wrap gap-2">
                  <PlatformPill icon={MessageCircle}>
                    {relatedConversation.message_count} mensagens
                  </PlatformPill>
                  <PlatformPill icon={Clock}>
                    {formatRelativeTime(relatedConversation.last_message_at)}
                  </PlatformPill>
                </div>
              ) : null}
            </div>

            <div className="mt-5 min-h-[12rem] space-y-2.5">
              {messages.length === 0 ? (
                <PlatformInset className="flex min-h-[12rem] flex-col items-center justify-center p-6 text-center">
                  <MessageCircle className="h-5 w-5 text-[var(--muted)]" />
                  <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                    {relatedConversation
                      ? "A conversa existe, mas a thread está sendo acompanhada pela inbox."
                      : "Ainda não existe conversa vinculada a este lead."}
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                    {relatedConversation
                      ? "Abra a central de conversas para acompanhar mensagens em tempo real e registrar a próxima tratativa."
                      : "Assim que o webhook abrir o follow-up inicial, a conversa aparecerá aqui automaticamente com o contexto do pagamento."}
                  </p>
                </PlatformInset>
              ) : (
                <div className="max-h-[26rem] space-y-2.5 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              )}
            </div>

            {relatedConversation ? (
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <form action={registerConversationReply} className="flex gap-2">
                  <input
                    type="hidden"
                    name="conversationId"
                    value={relatedConversation.conversation_id}
                  />
                  <input
                    name="content"
                    type="text"
                    placeholder="Registrar tratativa ou resposta enviada..."
                    className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                  />
                  <ActionButton className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]">
                    <Send className="h-4 w-4" />
                  </ActionButton>
                </form>
              </div>
            ) : null}
          </PlatformSurface>

          {/* Call history */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                  Chamadas
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  Historico de ligacoes
                </h2>
              </div>
              {leadCalls.length > 0 ? (
                <PlatformPill icon={PhoneCall}>
                  {leadCalls.length} chamada{leadCalls.length !== 1 ? "s" : ""}
                </PlatformPill>
              ) : null}
            </div>

            <div className="mt-5 space-y-2.5">
              {leadCalls.length === 0 ? (
                <PlatformInset className="flex min-h-[8rem] flex-col items-center justify-center p-6 text-center">
                  <PhoneCall className="h-5 w-5 text-[var(--muted)]" />
                  <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                    Nenhuma chamada registrada para este lead.
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                    As chamadas feitas pelo agente de voz aparecerao aqui automaticamente.
                  </p>
                </PlatformInset>
              ) : (
                <div className="max-h-[20rem] space-y-2.5 overflow-y-auto pr-1">
                  {leadCalls.map((call) => (
                    <LeadCallRow key={call.id} call={call} />
                  ))}
                </div>
              )}
            </div>
          </PlatformSurface>
        </div>

        <div className="space-y-4 2xl:sticky 2xl:top-20 2xl:self-start">
          <PlatformSurface className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
              Resumo do caso
            </p>
            <div className="mt-4 space-y-3">
              <SidebarLine label="Lead" value={lead.lead_id} />
              <SidebarLine
                label="Responsável"
                value={lead.assigned_agent || "Sem responsável"}
              />
              <SidebarLine label="Contato" value={displayContact} />
              <SidebarLine
                label="Atualizado"
                value={formatDateTime(lead.updated_at)}
              />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
              Pagamento
            </p>
            <div className="mt-4 space-y-3">
              <SidebarLine
                label="Valor"
                value={formatCurrency(lead.payment_value)}
              />
              <SidebarLine
                label="Status"
                value={mapPaymentStatus(lead.payment_status)}
              />
              <SidebarLine
                label="Método"
                value={mapPaymentMethod(lead.payment_method)}
              />
              <SidebarLine label="Pedido" value={lead.order_id || "—"} />
              <SidebarLine label="Gateway ID" value={lead.gateway_payment_id || "—"} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
              Linha do tempo
            </p>
            <div className="mt-4 space-y-3">
              <TimelineItem
                icon={CreditCard}
                label="Pagamento em recuperação"
                time={lead.created_at ?? lead.updated_at}
              />
              {lead.assigned_agent ? (
                <TimelineItem
                  icon={User}
                  label={`Caso atribuído para ${lead.assigned_agent}`}
                  time={lead.updated_at}
                />
              ) : null}
              <TimelineItem
                icon={MessageCircle}
                label={`Etapa atual: ${mapStageLabel(lead.lead_status)}`}
                time={lead.updated_at}
              />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function StageAction({
  leadId,
  currentStatus,
  targetStatus,
  label,
  variant,
}: {
  leadId: string;
  currentStatus: string;
  targetStatus: string;
  label: string;
  variant?: "success" | "danger";
}) {
  const isActive = currentStatus === targetStatus;

  let buttonClass =
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]";

  if (isActive) {
    buttonClass =
      "cursor-default border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]";
  } else if (variant === "success") {
    buttonClass =
      "border border-[var(--accent)]/20 bg-[var(--accent)]/5 text-[var(--accent)] hover:bg-[var(--accent)]/10";
  } else if (variant === "danger") {
    buttonClass =
      "border border-red-500/20 bg-red-50 text-red-500 hover:bg-red-100";
  }

  return (
    <form action={transitionLeadStage}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="status" value={targetStatus} />
      <input
        type="hidden"
        name="intent"
        value={
          currentStatus === "NEW_RECOVERY" && targetStatus === "CONTACTING"
            ? "start_flow"
            : "move_stage"
        }
      />
      <ActionButton
        disabled={isActive}
        className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${buttonClass}`}
      >
        {label}
      </ActionButton>
    </form>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="text-sm text-[var(--foreground-secondary)]">{value}</span>
    </div>
  );
}

function SidebarLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="text-sm leading-6 text-[var(--foreground-secondary)] break-words">{value}</p>
    </div>
  );
}

function LeadCallRow({ call }: { call: CallRecord }) {
  const StatusIcon =
    call.status === "completed" ? PhoneCall :
    call.status === "no_answer" || call.status === "busy" ? PhoneMissed :
    PhoneCall;

  const statusLabel: Record<string, string> = {
    queued: "Na fila",
    ringing: "Tocando",
    in_progress: "Em andamento",
    completed: "Completada",
    failed: "Falhou",
    no_answer: "Sem resposta",
    busy: "Ocupado",
    voicemail: "Caixa postal",
    cancelled: "Cancelada",
  };

  const outcomeLabel: Record<string, string> = {
    recovered: "Recuperado",
    callback_scheduled: "Callback agendado",
    interested: "Interessado",
    no_interest: "Sem interesse",
    wrong_number: "Numero errado",
    voicemail_left: "Recado deixado",
    no_voicemail: "Sem recado",
    technical_issue: "Problema tecnico",
    other: "Outro",
  };

  const durationStr = call.durationSeconds > 0
    ? call.durationSeconds < 60
      ? `${call.durationSeconds}s`
      : `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s`
    : "";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)]">
        <StatusIcon className={`h-3.5 w-3.5 ${
          call.status === "completed" ? "text-green-500" :
          call.status === "failed" ? "text-red-500" : "text-[var(--muted)]"
        }`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground-secondary)]">
            {statusLabel[call.status] ?? call.status}
          </span>
          {call.outcome ? (
            <span className="inline-flex items-center rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-[0.65rem] font-medium text-[var(--accent)]">
              {outcomeLabel[call.outcome] ?? call.outcome}
            </span>
          ) : null}
          {durationStr ? (
            <span className="text-xs text-[var(--muted)]">{durationStr}</span>
          ) : null}
        </div>
        {call.transcriptSummary ? (
          <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{call.transcriptSummary}</p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--muted)]">
          {formatRelativeTime(call.createdAt)} · {call.provider}
        </p>
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  time,
}: {
  icon: typeof Clock;
  label: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--background)]">
        <Icon className="h-3.5 w-3.5 text-[var(--muted)]" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-[var(--foreground-secondary)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {formatRelativeTime(time)}
        </p>
      </div>
    </div>
  );
}
