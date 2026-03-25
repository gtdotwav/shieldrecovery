import { formatCurrency } from "@/lib/format";
import { platformBrand } from "@/lib/platform";
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
            ? "glass-panel qr-panel w-full max-w-[30rem] overflow-hidden border border-[rgba(30,215,96,0.16)] bg-[rgba(10,33,26,0.74)] p-0"
            : `px-4 py-2.5 ${
                inbound
                  ? "glass-inset text-[rgba(255,255,255,0.88)]"
                  : "glass-panel border border-[rgba(30,215,96,0.14)] text-[rgba(255,255,255,0.9)]"
              }`
        }`}
      >
        {recoveryCard ? (
          <RecoveryPromptCard message={message} />
        ) : (
          <>
            {aiReply ? (
              <p className="mb-1.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.26em] text-[var(--accent)]">
                IA {platformBrand.name}
              </p>
            ) : null}
            <p className="text-sm leading-relaxed">{message.content}</p>
            <p className="mt-1.5 text-[0.6875rem] text-[rgba(255,255,255,0.42)]">
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
      <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(30,215,96,0.08),rgba(255,255,255,0.03))] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.26em] text-[var(--accent)]">
              Disparo inicial
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {metadata?.product || "Recuperação de pagamento"}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[rgba(30,215,96,0.18)] bg-[rgba(30,215,96,0.12)] px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[#98efba]">
            {message.status === "queued" ? "na fila" : "registrado"}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="glass-inset grid gap-x-4 gap-y-2 rounded-xl p-3 sm:grid-cols-2">
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

        <p className="text-sm leading-relaxed text-[rgba(255,255,255,0.84)]">
          {message.content}
        </p>

        {metadata?.pixQrCode ? (
          <div className="glass-inset rounded-xl px-3 py-3">
            <p className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.26em] text-[var(--accent)]">
              QR Code Pix
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={metadata.pixQrCode}
              alt="QR Code Pix"
              className="mt-2 h-64 w-64 max-w-full rounded-xl border border-white/10 bg-white object-contain p-2"
            />
            <p className="mt-2 text-xs text-[rgba(255,255,255,0.56)]">
              Escaneie este QR Code para concluir o pagamento.
            </p>
          </div>
        ) : null}

        {metadata?.pixCode ? (
          <div className="glass-inset rounded-xl px-3 py-2.5">
            <p className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.26em] text-[var(--accent)]">
              Código Pix
            </p>
            <p className="mt-1.5 break-words font-mono text-xs leading-5 text-[rgba(255,255,255,0.72)]">
              {metadata.pixCode}
            </p>
          </div>
        ) : null}

        {metadata?.retryLink || metadata?.paymentUrl ? (
          <a
            href={metadata.paymentUrl || metadata.retryLink}
            className="glass-button-primary inline-flex rounded-xl px-4 py-2 text-sm font-semibold"
            target="_blank"
            rel="noreferrer"
          >
            {metadata.actionLabel || "Abrir pagamento"}
          </a>
        ) : null}

        <p className="text-[0.6875rem] text-[rgba(255,255,255,0.42)]">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.42)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-[rgba(255,255,255,0.82)]">{value}</p>
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
  return "registrada";
}

function safeDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
