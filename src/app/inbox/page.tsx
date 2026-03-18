import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ExternalLink,
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
  title: "Conversas | Shield Recovery",
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
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
            Conversas bloqueadas pelo admin
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111827]">
            A central de conversas foi pausada para este seller.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
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
          className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
        >
          CRM
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <AutoRefresh intervalMs={5000} />
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={MessageCircle}
          label="conversas"
          value={conversationCount.toString()}
        />
        <PlatformMetricCard
          icon={Send}
          label="não lidas"
          value={unreadCount.toString()}
        />
        <PlatformMetricCard
          icon={MessageCircle}
          label="mensagens"
          value={conversations.reduce((s, c) => s + c.message_count, 0).toString()}
        />
      </section>

      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <div className="grid gap-5 border-b border-black/[0.06] pb-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
              Central de conversas
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-[1.95rem]">
              Fila, thread e contexto no mesmo fluxo.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
              A inbox concentra o atendimento que já nasceu do webhook. O time
              continua a conversa aqui e o CRM acompanha a mesma história.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#6b7280]">
              {conversationCount} conversas abertas e {unreadCount} mensagens
              ainda pedindo leitura.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbfbfc] px-4 py-4 text-sm leading-6 text-[#6b7280]">
            Priorize a fila e mantenha toda a tratativa na mesma thread.
          </div>
        </div>
      </PlatformSurface>

      <section className="mt-5 grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_18rem]">
        <PlatformSurface className="p-3 xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between px-1 pb-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[#9ca3af]">
              Fila
            </h2>
            <span className="rounded-full border border-black/[0.06] bg-[#f7f8fa] px-2 py-0.5 text-[0.65rem] font-medium text-[#6b7280]">
              {conversationCount}
            </span>
          </div>

          <div className="space-y-1.5 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1">
            {conversations.length === 0 ? (
              <PlatformInset className="p-5 text-center">
                <MessageCircle className="mx-auto h-5 w-5 text-[#d1d5db]" />
                <p className="mt-2 text-sm text-[#9ca3af]">Nenhuma conversa por aqui ainda.</p>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  Elas nascem quando o webhook entra e o primeiro follow-up é aberto.
                </p>
                {session.role === "admin" ? (
                  <Link href="/connect" className="mt-3 inline-block text-xs text-orange-500 hover:underline">
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

        <PlatformSurface className="flex flex-col p-4 sm:p-5">
          {selectedConversation ? (
            <>
              <div className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="text-sm font-semibold text-[#1a1a2e]">
                      {selectedConversation.customer_name}
                    </p>
                    <StatusBadge
                      label={labelForChannel(selectedConversation.channel)}
                      variant="neutral"
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    {selectedConversation.contact_value}
                  </p>
                  <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
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

              <div className="min-h-[22rem] flex-1 overflow-y-auto py-4 space-y-2 xl:max-h-[calc(100vh-18rem)] xl:pr-1">
                {selectedMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#9ca3af]">
                    Ainda sem mensagens nesta thread.
                  </p>
                ) : (
                  selectedMessages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))
                )}
              </div>

              <div className="border-t border-black/[0.06] pt-3">
                <div className="grid gap-2">
                  <form
                    action={registerConversationReply}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <input
                      type="hidden"
                      name="conversationId"
                      value={selectedConversation.conversation_id}
                    />
                    <input
                      name="content"
                      type="text"
                      placeholder="Registrar mensagem ou atualização da tratativa..."
                      className="flex-1 rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none placeholder:text-[#9ca3af] focus:border-orange-300 focus:ring-1 focus:ring-orange-100"
                    />
                    <ActionButton className="inline-flex items-center justify-center rounded-[0.95rem] bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                      <Send className="h-4 w-4" />
                    </ActionButton>
                  </form>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#9ca3af]">
                      Use a thread para centralizar o histórico da abordagem.
                    </p>

                    <form action={sendAiConversationReply}>
                      <input
                        type="hidden"
                        name="conversationId"
                        value={selectedConversation.conversation_id}
                      />
                      <ActionButton className="inline-flex items-center gap-2 rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-2 text-xs font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]">
                        <Bot className="h-4 w-4" />
                        Responder com IA
                      </ActionButton>
                    </form>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center py-12">
              <p className="text-sm text-[#9ca3af]">Selecione uma conversa na fila.</p>
            </div>
          )}
        </PlatformSurface>

        <PlatformSurface className="p-4 xl:sticky xl:top-20 xl:self-start">
          <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-orange-500">
            Contexto do lead
          </h3>

          {selectedLead ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#1a1a2e]">
                  {selectedLead.customer_name}
                </p>
                <p className="mt-0.5 text-lg font-semibold text-[#1a1a2e]">
                  {formatCurrency(selectedLead.payment_value)}
                </p>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  {selectedLead.product || "Produto não informado"}
                </p>
              </div>

              <div className="space-y-2 rounded-[1rem] border border-black/[0.06] bg-[#fbfbfc] px-3 py-3">
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

              <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbfbfc] px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#9ca3af]">
                  Próxima ação
                </p>
                <p className="mt-2 text-sm leading-6 text-[#374151]">
                  {recommendedNextAction(selectedLead)}
                </p>
              </div>

              {latestRecoveryPrompt ? (
                <PlatformInset className="px-3 py-3">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#9ca3af]">
                    Cobrança ativa
                  </p>
                  <div className="mt-2 space-y-2 text-sm text-[#374151]">
                    {latestRecoveryPrompt.paymentUrl || latestRecoveryPrompt.retryLink ? (
                      <a
                        href={latestRecoveryPrompt.paymentUrl || latestRecoveryPrompt.retryLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
                      >
                        Abrir link de pagamento
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    {latestRecoveryPrompt.pixCode ? (
                      <p className="break-all font-mono text-xs leading-6 text-[#1a1a2e]">
                        {latestRecoveryPrompt.pixCode}
                      </p>
                    ) : null}
                    {latestRecoveryPrompt.pixExpiresAt ? (
                      <p className="text-xs text-[#9ca3af]">
                        Expira em {latestRecoveryPrompt.pixExpiresAt}
                      </p>
                    ) : null}
                  </div>
                </PlatformInset>
              ) : null}

              <Link
                href={`/leads/${selectedLead.lead_id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
              >
                Abrir lead no CRM
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#9ca3af]">
              Conversa não vinculada a lead.
            </p>
          )}
        </PlatformSurface>
      </section>
    </PlatformAppPage>
  );
}

function ConversationRow({
  conversation,
  active,
}: {
  conversation: InboxConversation;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[0.95rem] border px-3 py-3 transition-colors ${
        active
          ? "border-orange-200 bg-orange-50/60"
          : "border-black/[0.04] bg-[#fbfbfc] hover:bg-white"
      }`}
    >
      <Link href={`/inbox?conversationId=${conversation.conversation_id}`} className="block">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-[#1a1a2e]">
            {conversation.customer_name}
          </p>
          {conversation.unread_count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 text-[0.6rem] font-bold text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[#9ca3af] truncate">
          {conversation.last_message_preview}
        </p>
        <p className="mt-1 text-[0.65rem] text-[#d1d5db]">
          {formatMessageTime(conversation.last_message_at)}
        </p>
      </Link>

      {conversation.lead_id ? null : null}
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
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <form key={opt.status} action={changeConversationStatus}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <input type="hidden" name="status" value={opt.status} />
          <ActionButton
            className={`rounded-[0.8rem] px-2.5 py-1 text-[0.65rem] font-medium transition-colors ${
              currentStatus === opt.status
                ? "bg-orange-50 text-orange-600 border border-orange-200"
                : "text-[#9ca3af] hover:bg-[#f5f5f7] hover:text-[#717182]"
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
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#9ca3af]">{label}</span>
      <span className="text-xs text-right text-[#374151]">{value}</span>
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
