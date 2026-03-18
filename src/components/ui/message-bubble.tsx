import { formatCurrency } from "@/lib/format";
import type { MessageRecord } from "@/server/recovery/types";

export function MessageBubble({ message }: { message: MessageRecord }) {
  const inbound = message.direction === "inbound";
  const recoveryCard = !inbound && message.metadata?.kind === "recovery_prompt";
  const aiReply = !inbound && message.metadata?.kind === "ai_draft";

  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl ${
          recoveryCard
            ? "w-full max-w-[30rem] overflow-hidden border border-orange-200 bg-orange-50/40 p-0"
            : `px-4 py-2.5 ${
                inbound
                  ? "bg-gray-100 text-gray-900"
                  : "border border-orange-100 bg-orange-50 text-gray-900"
              }`
        }`}
      >
        {recoveryCard ? (
          <RecoveryPromptCard message={message} />
        ) : (
          <>
            {aiReply ? (
              <p className="mb-1.5 text-[0.625rem] font-bold uppercase tracking-widest text-orange-500">
                IA Shield
              </p>
            ) : null}
            <p className="text-sm leading-relaxed">{message.content}</p>
            <p className="mt-1.5 text-[0.6875rem] text-gray-400">
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
    <>
      <div className="border-b border-orange-200/60 bg-orange-100/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-orange-600">
              Disparo inicial
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {metadata?.product || "Recuperação de pagamento"}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-orange-200 bg-white px-2.5 py-0.5 text-[0.625rem] font-semibold text-orange-600">
            {message.status === "queued" ? "na fila" : "registrado"}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="grid gap-x-4 gap-y-2 rounded-xl border border-black/[0.05] bg-white p-3 sm:grid-cols-2">
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
          {metadata?.paymentUrl ? (
            <KeyValue label="Link novo" value="disponível" />
          ) : null}
          {metadata?.pixCode ? (
            <KeyValue label="Pix copia e cola" value="disponível" />
          ) : null}
        </div>

        <p className="text-sm leading-relaxed text-gray-800">
          {message.content}
        </p>

        {metadata?.pixCode ? (
          <div className="rounded-xl border border-orange-200 bg-white px-3 py-2.5">
            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-orange-600">
              Código Pix
            </p>
            <p className="mt-1.5 break-words font-mono text-xs leading-5 text-gray-700">
              {metadata.pixCode}
            </p>
          </div>
        ) : null}

        {metadata?.retryLink || metadata?.paymentUrl ? (
          <a
            href={metadata.paymentUrl || metadata.retryLink}
            className="inline-flex rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            target="_blank"
            rel="noreferrer"
          >
            {metadata.actionLabel || "Abrir pagamento"}
          </a>
        ) : null}

        <p className="text-[0.6875rem] text-gray-400">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
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

function labelForMessageStatus(status: MessageRecord["status"]) {
  if (status === "queued") return "na fila";
  if (status === "sent") return "enviada";
  if (status === "delivered") return "entregue";
  if (status === "read") return "lida";
  if (status === "failed") return "falhou";
  return "recebida";
}

function safeDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
