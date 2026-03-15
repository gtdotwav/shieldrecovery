import { formatCurrency } from "@/lib/format";
import type { MessageRecord } from "@/server/recovery/types";

export function MessageBubble({ message }: { message: MessageRecord }) {
  const inbound = message.direction === "inbound";
  const recoveryCard = !inbound && message.metadata?.kind === "recovery_prompt";
  const aiReply = !inbound && message.metadata?.kind === "ai_draft";

  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl ${
          recoveryCard
            ? "w-full max-w-[30rem] border border-orange-200 bg-[#fff7f1] p-0"
            : `px-3.5 py-2.5 ${
                inbound ? "bg-[#f5f5f7]" : "border border-orange-100 bg-orange-50"
              }`
        }`}
      >
        {recoveryCard ? (
          <RecoveryPromptCard message={message} />
        ) : (
          <>
            {aiReply ? (
              <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-orange-600">
                IA Shield
              </p>
            ) : null}
            <p className="text-sm leading-relaxed text-[#1a1a2e]">
              {message.content}
            </p>
            <p className="mt-1 text-[0.6rem] text-[#9ca3af]">
              {labelForMessageStatus(message.status)}
              {" · "}
              {formatMessageTime(message.createdAt)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function RecoveryPromptCard({ message }: { message: MessageRecord }) {
  const metadata = message.metadata;

  return (
    <div className="overflow-hidden rounded-2xl">
      <div className="border-b border-orange-200/70 bg-[#fff1e6] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-orange-600">
              Disparo inicial
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1a1a2e]">
              {metadata?.product || "Recuperação de pagamento"}
            </p>
          </div>
          <div className="rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[0.65rem] font-medium text-orange-600">
            {message.status === "queued" ? "na fila" : "registrado"}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="grid gap-2 rounded-xl border border-black/5 bg-white/80 p-3 text-xs text-[#717182] sm:grid-cols-2">
          <KeyValue
            label="Total"
            value={
              typeof metadata?.paymentValue === "number"
                ? formatCurrency(metadata.paymentValue)
                : "-"
            }
          />
          <KeyValue label="Método" value={metadata?.paymentMethod || "-"} />
          <KeyValue label="Status" value={metadata?.paymentStatus || "-"} />
          <KeyValue
            label="Motivo"
            value={metadata?.failureReason || "pagamento pendente"}
          />
        </div>

        <p className="text-sm leading-relaxed text-[#1a1a2e]">
          {message.content}
        </p>

        {metadata?.retryLink ? (
          <a
            href={metadata.retryLink}
            className="inline-flex rounded-xl bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            target="_blank"
            rel="noreferrer"
          >
            {metadata.actionLabel || "Abrir pagamento"}
          </a>
        ) : null}

        <p className="text-[0.65rem] text-[#9ca3af]">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[#9ca3af]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[#1a1a2e]">{value}</p>
    </div>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function labelForMessageStatus(status: MessageRecord["status"]) {
  if (status === "queued") return "na fila";
  if (status === "sent") return "enviada";
  if (status === "delivered") return "entregue";
  if (status === "read") return "lida";
  if (status === "failed") return "falhou";
  return "recebida";
}
