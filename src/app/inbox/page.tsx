import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ExternalLink,
  Inbox,
  MessageCircle,
  Send,
} from "lucide-react";

import {
  changeConversationStatus,
  registerConversationReply,
  sendAiConversationReply,
} from "@/app/actions/recovery-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { ActionButton } from "@/components/ui/action-button";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { MessageBubble } from "@/components/ui/message-bubble";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { mapStageLabel, recommendedNextAction } from "@/lib/stage";
import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type { InboxConversation } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conversas | PagRecovery",
};

type InboxPageProps = {
  searchParams: Promise<{
    conversationId?: string;
  }>;
};

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const params = await searchParams;
  const service = getPaymentRecoveryService();
  const sellerIdentity =
    session.role === "seller"
      ? await getSellerIdentityByEmail(session.email)
      : null;
  const sellerControl =
    session.role === "seller"
      ? await service.getSellerAdminControlForName(sellerIdentity?.agentName)
      : undefined;

  if (session.role === "seller" && sellerControl && !sellerControl.inboxEnabled) {
    return (
      <PlatformAppPage currentPath="/inbox">
        <PlatformSurface className="p-6 sm:p-7">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-white/35">
            Conversas bloqueadas pelo admin
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
            A central de conversas foi pausada para este seller.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgba(255,255,255,0.62)]">
            O admin retirou o acesso da carteira às conversas. Você ainda pode
            acompanhar os casos no CRM, mas o atendimento fica centralizado até
            nova liberação.
          </p>
        </PlatformSurface>
      </PlatformAppPage>
    );
  }

  const messaging = new MessagingService();
  const [allContacts, inboxSnapshot] = await Promise.all([
    service.getFollowUpContacts(),
    messaging.getInboxSnapshot(),
  ]);

  const contacts =
    session.role === "admin"
      ? allContacts
      : allContacts.filter((contact) =>
          canRoleAccessAgent(
            session.role,
            contact.assigned_agent,
            sellerIdentity?.agentName,
          ),
        );
  const accessibleLeadIds = new Set(contacts.map((contact) => contact.lead_id));
  const conversations = inboxSnapshot.conversations.filter((conversation) => {
    if (session.role === "admin") {
      return true;
    }

    if (conversation.lead_id) {
      return accessibleLeadIds.has(conversation.lead_id);
    }

    return canRoleAccessAgent(
      session.role,
      conversation.assigned_agent,
      sellerIdentity?.agentName,
    );
  });
  const selectedConversation =
    (params.conversationId
      ? conversations.find(
          (conversation) => conversation.conversation_id === params.conversationId,
        )
      : null) ??
    conversations[0] ??
    null;
  const selectedMessages = selectedConversation
    ? await messaging.getConversationMessages(selectedConversation.conversation_id)
    : [];

  const conversationCount = conversations.length;
  const unreadCount = conversations.reduce((s, c) => s + c.unread_count, 0);
  const messageCount = conversations.reduce((s, c) => s + c.message_count, 0);
  const selectedLead =
    contacts.find((c) => c.lead_id === selectedConversation?.lead_id) ?? null;
  const latestRecoveryPrompt =
    [...selectedMessages]
      .reverse()
      .find((message) => message.metadata?.kind === "recovery_prompt")
      ?.metadata ?? null;

  return (
    <PlatformAppPage
      currentPath="/inbox"
      action={
        <Link
          href="/leads"
          className="glass-button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
        >
          CRM
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <AutoRefresh intervalMs={5000} />

      {/* ── Métricas ── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={MessageCircle}
          label="conversas"
          value={conversationCount.toString()}
        />
        <PlatformMetricCard
          icon={Inbox}
          label="não lidas"
          value={unreadCount.toString()}
        />
        <PlatformMetricCard
          icon={Send}
          label="mensagens"
          value={messageCount.toString()}
        />
      </section>

      {/* ── Cabeçalho ── */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <div className="grid gap-5 border-b border-[var(--border)] pb-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-end">
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-white/35">
              Central de conversas
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
              Fila, thread e contexto no mesmo fluxo.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgba(255,255,255,0.62)]">
              A inbox concentra o atendimento que já nasceu do webhook. O time
              continua a conversa aqui e o CRM acompanha a mesma história.
            </p>
            <p className="mt-3 text-sm text-[rgba(255,255,255,0.56)]">
              <span className="font-semibold text-white">{conversationCount}</span> conversas abertas
              {" · "}
              <span className="font-semibold text-white">{unreadCount}</span> mensagens não lidas
            </p>
          </div>

          <div className="glass-inset rounded-2xl px-4 py-4 text-sm leading-6 text-[rgba(255,255,255,0.6)]">
            Priorize a fila e mantenha toda a tratativa na mesma thread.
          </div>
        </div>
      </PlatformSurface>

      {/* ── Grid principal: Fila | Thread | Contexto ── */}
      <section className="mt-5 grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_17rem]">

        {/* ── Fila de conversas ── */}
        <PlatformSurface className="p-3 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between px-1 pb-3">
            <h2 className="text-[0.65rem] font-medium uppercase tracking-[0.06em] text-white/35">
              Fila
            </h2>
            <span className="muted-pill flex h-5 min-w-5 items-center justify-center rounded-full text-[0.65rem] font-semibold">
              {conversationCount}
            </span>
          </div>

          <div className="space-y-1.5 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-1">
            {conversations.length === 0 ? (
                <PlatformInset className="p-5 text-center">
                <MessageCircle className="mx-auto h-5 w-5 text-[rgba(255,255,255,0.24)]" />
                <p className="mt-2 text-sm text-[rgba(255,255,255,0.54)]">Nenhuma conversa por aqui ainda.</p>
                <p className="mt-1 text-xs text-[rgba(255,255,255,0.38)]">
                  Elas nascem quando o webhook entra e o primeiro follow-up é aberto.
                </p>
                {session.role === "admin" ? (
                  <Link href="/connect" className="mt-3 inline-block text-xs font-medium text-[var(--accent)] hover:underline">
                    Configurar WhatsApp
                  </Link>
                ) : null}
              </PlatformInset>
            ) : (
              conversations
                .sort((a, b) => b.unread_count - a.unread_count)
                .map((conv) => (
                  <ConversationRow
                    key={conv.conversation_id}
                    conversation={conv}
                    active={conv.conversation_id === selectedConversation?.conversation_id}
                  />
                ))
            )}
          </div>
        </PlatformSurface>

        {/* ── Thread principal ── */}
        <PlatformSurface className="flex flex-col p-4 sm:p-5">
          {selectedConversation ? (
            <>
              {/* Cabeçalho da conversa */}
              <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">
                      {selectedConversation.customer_name}
                    </h3>
                    <StatusBadge
                      label={labelForChannel(selectedConversation.channel)}
                      variant="neutral"
                    />
                  </div>
                  <p className="mt-0.5 text-sm text-[rgba(255,255,255,0.42)]">
                    {selectedConversation.contact_value}
                  </p>
                  <p className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.06em] text-white/35">
                    {selectedConversation.message_count} mensagens · {selectedConversation.unread_count} não lidas
                  </p>
                </div>

                <div className="self-start sm:self-auto">
                  <ConversationStatusSelect
                    conversationId={selectedConversation.conversation_id}
                    currentStatus={selectedConversation.status}
                  />
                </div>
              </div>

              {/* Mensagens */}
              <div className="min-h-[20rem] flex-1 space-y-3 overflow-y-auto py-4 lg:max-h-[calc(100vh-18rem)] lg:pr-1">
                {selectedMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-[rgba(255,255,255,0.42)]">
                      Ainda sem mensagens nesta thread.
                    </p>
                  </div>
                ) : (
                  selectedMessages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))
                )}
              </div>

              {/* Área de resposta */}
              <div className="border-t border-[var(--border)] pt-4">
                <form
                  action={registerConversationReply}
                  className="flex items-center gap-2"
                >
                  <input
                    type="hidden"
                    name="conversationId"
                    value={selectedConversation.conversation_id}
                  />
                  <input
                    name="content"
                    type="text"
                    placeholder="Escrever mensagem..."
                    autoComplete="off"
                    className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[rgba(255,255,255,0.34)] transition-shadow"
                  />
                  <ActionButton
                    className="glass-button-primary inline-flex h-[2.625rem] w-[2.625rem] shrink-0 items-center justify-center rounded-xl text-white"
                    aria-label="Enviar mensagem"
                  >
                    <Send className="h-4 w-4" />
                  </ActionButton>
                </form>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-[rgba(255,255,255,0.38)]">
                    Use a thread para centralizar o histórico da abordagem.
                  </p>

                  <form action={sendAiConversationReply}>
                    <input
                      type="hidden"
                      name="conversationId"
                      value={selectedConversation.conversation_id}
                    />
                    <ActionButton className="glass-button-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                      <Bot className="h-3.5 w-3.5" />
                      Responder com IA
                    </ActionButton>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="text-center">
                <Inbox className="mx-auto h-8 w-8 text-[rgba(255,255,255,0.22)]" />
                <p className="mt-3 text-sm font-medium text-[rgba(255,255,255,0.42)]">Selecione uma conversa na fila.</p>
              </div>
            </div>
          )}
        </PlatformSurface>

        {/* ── Contexto do lead ── */}
        <PlatformSurface className="p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
          <h3 className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-white/35">
            Contexto do lead
          </h3>

          {selectedLead ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedLead.customer_name}
                </p>
                <p className="mt-0.5 text-lg font-bold text-[var(--accent)]">
                  {formatCurrency(selectedLead.payment_value)}
                </p>
                <p className="mt-1 text-xs text-[rgba(255,255,255,0.38)]">
                  {selectedLead.product || "Produto não informado"}
                </p>
              </div>

              <div className="glass-inset space-y-2.5 rounded-xl px-3.5 py-3">
                <ContextLine
                  label="Etapa"
                  value={mapStageLabel(selectedLead.lead_status)}
                />
                <ContextLine
                  label="Dono"
                  value={selectedLead.assigned_agent || "Sem responsável"}
                />
                <ContextLine
                  label="Contato"
                  value={selectedLead.phone || selectedLead.email || "Sem contato"}
                />
              </div>

              <div className="glass-inset rounded-xl px-3.5 py-3">
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.06em] text-white/35">
                  Próxima ação
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[rgba(255,255,255,0.72)]">
                  {recommendedNextAction(selectedLead)}
                </p>
              </div>

              {latestRecoveryPrompt ? (
                <PlatformInset className="px-3.5 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.42)]">
                    Cobrança ativa
                  </p>
                  <div className="mt-2 space-y-2 text-sm text-[rgba(255,255,255,0.62)]">
                    {latestRecoveryPrompt.paymentUrl || latestRecoveryPrompt.retryLink ? (
                      <a
                        href={latestRecoveryPrompt.paymentUrl || latestRecoveryPrompt.retryLink}
                        target="_blank"
                        rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] transition-colors hover:text-[#72f2a2]"
                  >
                        Abrir link de pagamento
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    {latestRecoveryPrompt.pixCode ? (
                      <p className="break-words font-mono text-xs leading-5 text-[rgba(255,255,255,0.78)]">
                        {latestRecoveryPrompt.pixCode}
                      </p>
                    ) : null}
                    {latestRecoveryPrompt.pixExpiresAt ? (
                      <p className="text-xs text-[rgba(255,255,255,0.38)]">
                        Expira em {latestRecoveryPrompt.pixExpiresAt}
                      </p>
                    ) : null}
                  </div>
                </PlatformInset>
              ) : null}

              <Link
                href={`/leads/${selectedLead.lead_id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] transition-colors hover:text-[#72f2a2]"
              >
                Abrir lead no CRM
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[rgba(255,255,255,0.42)]">
              Conversa não vinculada a lead.
            </p>
          )}
        </PlatformSurface>
      </section>
    </PlatformAppPage>
  );
}

/* ── Componentes auxiliares ── */

function ConversationRow({
  conversation,
  active,
}: {
  conversation: InboxConversation;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 transition-colors ${
        active
          ? "border-[rgba(30,215,96,0.2)] bg-[rgba(30,215,96,0.12)] shadow-[0_18px_36px_rgba(0,0,0,0.22)]"
          : "border-transparent bg-white/[0.03] hover:border-white/8 hover:bg-white/[0.05]"
      }`}
    >
      <Link href={`/inbox?conversationId=${conversation.conversation_id}`} className="block">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm font-medium ${active ? "text-white" : "text-[rgba(255,255,255,0.72)]"}`}>
            {conversation.customer_name}
          </p>
          {conversation.unread_count > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[0.625rem] font-bold tabular-nums text-[#052116]"
              aria-label={`${conversation.unread_count} não lidas`}
            >
              {conversation.unread_count}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[rgba(255,255,255,0.42)]">
          {conversation.last_message_preview || "Sem mensagens ainda."}
        </p>
        <p className="mt-1 text-[0.6875rem] text-[rgba(255,255,255,0.28)]">
          {formatMessageTime(conversation.last_message_at)}
        </p>
      </Link>
    </div>
  );
}

function ConversationStatusSelect({
  conversationId,
  currentStatus,
}: {
  conversationId: string;
  currentStatus: string;
}) {
  const options = [
    { status: "open", label: "Aberta" },
    { status: "pending", label: "Aguardando" },
    { status: "closed", label: "Encerrada" },
  ] as const;

  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <form key={opt.status} action={changeConversationStatus}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <input type="hidden" name="status" value={opt.status} />
          <ActionButton
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              currentStatus === opt.status
                ? "border border-[rgba(30,215,96,0.18)] bg-[rgba(30,215,96,0.12)] text-[var(--accent)]"
                : "text-[rgba(255,255,255,0.42)] hover:bg-white/6 hover:text-white"
            }`}
          >
            {opt.label}
          </ActionButton>
        </form>
      ))}
    </div>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-xs text-[rgba(255,255,255,0.42)]">{label}</span>
      <span className="truncate text-right text-xs font-medium text-[rgba(255,255,255,0.72)]">{value}</span>
    </div>
  );
}

function labelForChannel(channel: InboxConversation["channel"]) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "email") return "Email";
  return "SMS";
}

function formatMessageTime(value: string) {
  const date = safeDate(value);

  if (!date) {
    return "sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function safeDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
