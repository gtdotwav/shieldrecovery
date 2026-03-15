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
import { MessageBubble } from "@/components/ui/message-bubble";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { mapStageLabel, recommendedNextAction } from "@/lib/stage";
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
  const params = await searchParams;
  const service = getPaymentRecoveryService();
  const messaging = new MessagingService();
  const [contacts, inbox] = await Promise.all([
    service.getFollowUpContacts(),
    messaging.getInboxSnapshot(params.conversationId),
  ]);

  const conversationCount = inbox.conversations.length;
  const unreadCount = inbox.conversations.reduce((s, c) => s + c.unread_count, 0);
  const selectedLead =
    contacts.find((c) => c.lead_id === inbox.selectedConversation?.lead_id) ?? null;

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
      {/* Compact stats */}
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
          value={inbox.conversations.reduce((s, c) => s + c.message_count, 0).toString()}
        />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_18rem]">
        {/* Queue */}
        <PlatformSurface className="p-3 xl:sticky xl:top-20 xl:self-start">
          <h2 className="px-1 pb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#9ca3af]">
            Fila ({conversationCount})
          </h2>

          <div className="space-y-1.5 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1">
            {inbox.conversations.length === 0 ? (
              <PlatformInset className="p-5 text-center">
                <MessageCircle className="mx-auto h-5 w-5 text-[#d1d5db]" />
                <p className="mt-2 text-sm text-[#9ca3af]">Nenhuma conversa ainda.</p>
                <p className="mt-1 text-xs text-[#d1d5db]">
                  As conversas passam a nascer pelo webhook, junto com o primeiro follow-up.
                </p>
                <Link href="/connect" className="mt-3 inline-block text-xs text-orange-500 hover:underline">
                  Configurar WhatsApp
                </Link>
              </PlatformInset>
            ) : (
              inbox.conversations
                .sort((a, b) => b.unread_count - a.unread_count)
                .map((conv) => (
                  <ConversationRow
                    key={conv.conversation_id}
                    conversation={conv}
                    active={conv.conversation_id === inbox.selectedConversation?.conversation_id}
                  />
                ))
            )}
          </div>
        </PlatformSurface>

        {/* Thread */}
        <PlatformSurface className="flex flex-col p-4 sm:p-5">
          {inbox.selectedConversation ? (
            <>
              <div className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="text-sm font-semibold text-[#1a1a2e]">
                      {inbox.selectedConversation.customer_name}
                    </p>
                    <StatusBadge
                      label={labelForChannel(inbox.selectedConversation.channel)}
                      variant="neutral"
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    {inbox.selectedConversation.contact_value}
                  </p>
                </div>

                <div className="self-start sm:self-auto">
                  <ConversationStatusSelect
                    conversationId={inbox.selectedConversation.conversation_id}
                    currentStatus={inbox.selectedConversation.status}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 min-h-[22rem] space-y-2.5 xl:max-h-[calc(100vh-18rem)] xl:pr-1">
                {inbox.selectedMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#9ca3af]">
                    Sem mensagens registradas.
                  </p>
                ) : (
                  inbox.selectedMessages.map((msg) => (
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
                      value={inbox.selectedConversation.conversation_id}
                    />
                    <input
                      name="content"
                      type="text"
                      placeholder="Registrar mensagem ou atualização da tratativa..."
                      className="flex-1 rounded-xl border border-black/10 bg-[#f3f3f5] px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none placeholder:text-[#9ca3af] focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
                    />
                    <ActionButton className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
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
                        value={inbox.selectedConversation.conversation_id}
                      />
                      <ActionButton className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]">
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

        {/* Context sidebar */}
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

              <div className="space-y-2">
                <PlatformInset className="px-3 py-2.5">
                  <ContextLine
                    label="Etapa"
                    value={mapStageLabel(selectedLead.lead_status)}
                  />
                </PlatformInset>
                <PlatformInset className="px-3 py-2.5">
                  <ContextLine
                    label="Dono"
                    value={selectedLead.assigned_agent || "Sem responsável"}
                  />
                </PlatformInset>
                <PlatformInset className="px-3 py-2.5">
                  <ContextLine
                    label="Contato"
                    value={selectedLead.phone || selectedLead.email || "Sem contato"}
                  />
                </PlatformInset>
              </div>

              <div className="rounded-xl bg-[#f5f5f7] px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#9ca3af]">
                  Próxima ação
                </p>
                <p className="mt-2 text-sm leading-6 text-[#374151]">
                  {recommendedNextAction(selectedLead)}
                </p>
              </div>

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
      className={`rounded-xl border px-3 py-3 transition-all ${
        active
          ? "border-orange-200 bg-orange-50 shadow-sm"
          : "border-transparent hover:border-black/5 hover:bg-[#f5f5f7]"
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

      {conversation.lead_id ? (
        <Link
          href={`/leads/${conversation.lead_id}`}
          className="mt-2 inline-flex items-center gap-1 text-[0.65rem] font-medium text-orange-600 hover:text-orange-700"
        >
          Abrir lead
          <ExternalLink className="h-3 w-3" />
        </Link>
      ) : null}
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
            className={`rounded-lg px-2.5 py-1 text-[0.65rem] font-medium transition-colors ${
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
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
