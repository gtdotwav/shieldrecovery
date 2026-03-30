import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Play,
  Settings2,
  TrendingUp,
} from "lucide-react";

import {
  dispatchCall,
  markCallConverted,
  redialCall,
  saveCallcenterSettings,
} from "@/app/actions/recovery-actions";
import { ActionButton } from "@/components/ui/action-button";
import {
  QuickDispatchInputs,
  VoiceGenderSelector,
  VoiceToneSelector,
} from "@/components/ui/voice-selectors";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { StageBadge } from "@/components/ui/stage-badge";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { formatPhone, hasPhone } from "@/lib/contact";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getStorageService } from "@/server/recovery/services/storage";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type {
  CallRecord,
  FollowUpContact,
} from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "CallCenter" };

export default async function CallingPage() {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const isAdmin = session.role === "admin";
  const storage = getStorageService();
  const service = getPaymentRecoveryService();

  const sellerKey = session.email.split("@")[0];

  const [calls, analytics, contacts, settings] = await Promise.all([
    storage.listCalls({ limit: 50 }),
    storage.getCallAnalytics(),
    service.getFollowUpContacts(),
    storage.getCallcenterSettings(sellerKey),
  ]);

  const callableContacts = contacts.filter(
    (c) =>
      hasPhone(c.phone) &&
      c.lead_status !== "RECOVERED" &&
      c.lead_status !== "LOST",
  );

  const vapiConfigured = Boolean(
    process.env.VAPI_API_KEY &&
    (process.env.VAPI_PHONE_NUMBER_ID || process.env.VAPI_PHONE_ID),
  );

  return (
    <PlatformAppPage currentPath="/calling">
      {/* ── KPI row ── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={PhoneCall}
          label="total de chamadas"
          value={analytics.totalCalls.toString()}
          subtitle={`${analytics.completedCalls} completadas`}
        />
        <PlatformMetricCard
          icon={PhoneIncoming}
          label="taxa de atendimento"
          value={`${(analytics.answerRate * 100).toFixed(1)}%`}
          subtitle={`${analytics.answeredCalls} atendidas`}
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="recuperados por voz"
          value={analytics.recoveredFromCalls.toString()}
          subtitle={`${analytics.callbacksScheduled} callbacks agendados`}
        />
        <PlatformMetricCard
          icon={Clock}
          label="duração média"
          value={formatDuration(analytics.averageDurationSeconds)}
          subtitle={`${formatDuration(analytics.totalDurationSeconds)} total`}
        />
      </section>

      {/* ── Main area ── */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(17rem,0.75fr)]">
        <div className="space-y-5">

          {/* ── Disparar Chamada ── */}
          {isAdmin ? (
            <PlatformSurface className="p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    Disparar chamada
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)]">
                    Ligue para qualquer contato em segundos.
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {vapiConfigured ? (
                    <PlatformPill>
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                      VAPI ATIVO
                    </PlatformPill>
                  ) : (
                    <PlatformPill>
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      VAPI NÃO CONFIG
                    </PlatformPill>
                  )}
                </div>
              </div>

              <form action={dispatchCall} className="mt-5 space-y-5">
                {/* Lead / Phone inputs */}
                <QuickDispatchInputs
                  contacts={callableContacts.map((c) => ({
                    lead_id: c.lead_id,
                    customer_name: c.customer_name,
                    phone: c.phone,
                    payment_value: c.payment_value,
                  }))}
                />

                {/* Voice config */}
                <div>
                  <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Tom de voz
                  </p>
                  <VoiceToneSelector defaultValue={settings?.voiceTone ?? "empathetic"} />
                </div>

                <div>
                  <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Voz do agente
                  </p>
                  <VoiceGenderSelector defaultValue={settings?.voiceGender ?? "female"} />
                </div>

                {/* Script + extras */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
                      Produto
                    </label>
                    <input
                      name="product"
                      type="text"
                      placeholder="Mentoria Premium"
                      defaultValue={settings?.defaultProduct ?? ""}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
                      Desconto (%)
                    </label>
                    <input
                      name="discountPercent"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={settings?.discountPercent ?? 0}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
                      Cupom
                    </label>
                    <input
                      name="couponCode"
                      type="text"
                      placeholder="RECUPERA20"
                      defaultValue={settings?.couponCode ?? ""}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
                    Script (System Prompt)
                  </label>
                  <textarea
                    name="copy"
                    rows={3}
                    placeholder="Olá, estou ligando em nome da empresa sobre o pagamento pendente..."
                    defaultValue={settings?.defaultCopy ?? ""}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <ActionButton className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-strong)]">
                    <Play className="h-4 w-4" />
                    Ligar agora
                  </ActionButton>
                </div>
              </form>
            </PlatformSurface>
          ) : null}

          {/* ── Seller: Settings panel ── */}
          {!isAdmin ? (
            <PlatformSurface className="p-5 sm:p-6">
              <div className="border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    Configurações do agente de voz
                  </p>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Chamadas são disparadas automaticamente via webhook. Configure o tom e desconto.
                </p>
              </div>

              <form action={saveCallcenterSettings} className="mt-5 space-y-5">
                <input type="hidden" name="sellerKey" value={sellerKey} />

                <div>
                  <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Tom de voz
                  </p>
                  <VoiceToneSelector defaultValue={settings?.voiceTone ?? "empathetic"} />
                </div>

                <div>
                  <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Voz do agente
                  </p>
                  <VoiceGenderSelector defaultValue={settings?.voiceGender ?? "female"} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
                      Desconto (%)
                    </label>
                    <input
                      name="discountPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      defaultValue={settings?.discountPercent ?? 0}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
                      Cupom
                    </label>
                    <input
                      name="couponCode"
                      type="text"
                      placeholder="RECUPERA20"
                      defaultValue={settings?.couponCode ?? ""}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
                      Produto padrão
                    </label>
                    <input
                      name="defaultProduct"
                      type="text"
                      placeholder="Nome do produto"
                      defaultValue={settings?.defaultProduct ?? ""}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
                    Script padrão
                  </label>
                  <textarea
                    name="defaultCopy"
                    rows={3}
                    placeholder="Olá, tudo bem? Aqui é da [empresa]..."
                    defaultValue={settings?.defaultCopy ?? ""}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <ActionButton className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-strong)]">
                    <Settings2 className="h-4 w-4" />
                    Salvar configurações
                  </ActionButton>
                </div>
              </form>
            </PlatformSurface>
          ) : null}

          {/* ── Histórico de Chamadas (Table) ── */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Histórico de chamadas
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  Todas as ligações registradas.
                </h3>
              </div>
              {analytics.totalCalls > 0 ? (
                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {analytics.totalCalls} chamadas
                </span>
              ) : null}
            </div>

            {calls.length === 0 ? (
              <PlatformInset className="mt-4 p-6 text-center">
                <PhoneOff className="mx-auto h-5 w-5 text-[var(--muted)]" />
                <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                  Nenhuma chamada registrada ainda.
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {isAdmin
                    ? "Use o formulário acima para disparar a primeira chamada."
                    : "As chamadas aparecerão aqui conforme forem disparadas via webhook."}
                </p>
              </PlatformInset>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="pb-3 pr-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Data
                      </th>
                      <th className="pb-3 pr-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Lead
                      </th>
                      <th className="pb-3 pr-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Telefone
                      </th>
                      <th className="pb-3 pr-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Status
                      </th>
                      <th className="pb-3 pr-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Duração
                      </th>
                      <th className="pb-3 pr-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Custo
                      </th>
                      <th className="pb-3 pr-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Transcrição
                      </th>
                      <th className="pb-3 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => (
                      <CallTableRow key={call.id} call={call} isAdmin={isAdmin} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PlatformSurface>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          {/* Callable contacts */}
          {isAdmin ? (
            <PlatformSurface className="p-5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Contatos para ligar
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                {callableContacts.length}
              </p>
              <p className="text-xs text-[var(--muted)]">
                leads ativos com telefone
              </p>

              <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto sm:max-h-[20rem]">
                {callableContacts.slice(0, 10).map((contact) => (
                  <ContactRow key={contact.lead_id} contact={contact} />
                ))}
                {callableContacts.length > 10 ? (
                  <p className="pt-2 text-center text-xs text-[var(--muted)]">
                    +{callableContacts.length - 10} contatos
                  </p>
                ) : null}
              </div>
            </PlatformSurface>
          ) : null}

          {/* Outcome breakdown */}
          {analytics.totalCalls > 0 ? (
            <PlatformSurface className="p-5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Resultados
              </p>
              <div className="mt-4 space-y-2">
                {Object.entries(analytics.byOutcome)
                  .sort(([, a], [, b]) => b - a)
                  .map(([outcome, count]) => (
                    <OutcomeBar
                      key={outcome}
                      label={mapOutcomeLabel(outcome)}
                      count={count}
                      total={analytics.completedCalls || analytics.totalCalls}
                    />
                  ))}
              </div>
            </PlatformSurface>
          ) : null}

          {/* Status breakdown */}
          {analytics.totalCalls > 0 ? (
            <PlatformSurface className="p-5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Status
              </p>
              <div className="mt-4 space-y-2">
                {Object.entries(analytics.byStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <OutcomeBar
                      key={status}
                      label={mapStatusLabel(status)}
                      count={count}
                      total={analytics.totalCalls}
                    />
                  ))}
              </div>
            </PlatformSurface>
          ) : null}

          {/* Seller: current config */}
          {!isAdmin && settings ? (
            <PlatformSurface className="p-5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Config ativa
              </p>
              <div className="mt-3 space-y-2">
                <SettingLine label="Tom" value={mapToneLabel(settings.voiceTone)} />
                <SettingLine label="Gênero" value={settings.voiceGender === "female" ? "Feminina" : "Masculina"} />
                <SettingLine label="Desconto" value={`${settings.discountPercent}%`} />
                <SettingLine label="Cupom" value={settings.couponCode || "—"} />
                <SettingLine label="Produto" value={settings.defaultProduct || "—"} />
              </div>
            </PlatformSurface>
          ) : null}
        </div>
      </section>
    </PlatformAppPage>
  );
}

/* ── Call Table Row ── */

function CallTableRow({ call, isAdmin }: { call: CallRecord; isAdmin: boolean }) {
  const statusColor =
    call.status === "completed"
      ? "bg-green-500/10 text-green-500"
      : call.status === "in_progress" || call.status === "ringing"
        ? "bg-blue-500/10 text-blue-400"
        : call.status === "failed"
          ? "bg-red-500/10 text-red-400"
          : "bg-[var(--surface-strong)] text-[var(--muted)]";

  const dateStr = new Date(call.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isRecoverable =
    call.outcome !== "recovered" &&
    call.status !== "in_progress" &&
    call.status !== "ringing" &&
    call.status !== "queued";

  return (
    <tr className="border-b border-[var(--border)] last:border-0">
      <td className="py-3 pr-4 text-xs text-[var(--muted)] whitespace-nowrap">
        {dateStr}
      </td>
      <td className="py-3 pr-4">
        {call.leadId ? (
          <Link
            href={`/leads/${call.leadId}`}
            className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
          >
            {call.product || call.leadId.slice(0, 8)}
          </Link>
        ) : (
          <span className="text-sm text-[var(--muted)]">—</span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-[var(--foreground)] whitespace-nowrap">
        {formatPhone(call.toNumber)}
      </td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${statusColor}`}>
          {mapStatusLabel(call.status).toUpperCase()}
        </span>
        {call.outcome === "recovered" ? (
          <span className="ml-1 inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-green-500">
            CONVERTIDO
          </span>
        ) : null}
      </td>
      <td className="py-3 pr-4 text-sm tabular-nums text-[var(--foreground)]">
        {call.durationSeconds > 0 ? formatDuration(call.durationSeconds) : "—"}
      </td>
      <td className="py-3 pr-4 text-sm tabular-nums text-[var(--muted)]">
        {call.providerCost != null && Number(call.providerCost) > 0
          ? `$${Number(call.providerCost).toFixed(4)}`
          : "—"}
      </td>
      <td className="py-3 pr-4">
        {call.transcript ? (
          <Link
            href={`/leads/${call.leadId ?? ""}`}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Ver
          </Link>
        ) : (
          <span className="text-xs text-[var(--muted)]">—</span>
        )}
      </td>
      <td className="py-3">
        {isAdmin ? (
          <div className="flex flex-col gap-1">
            {isRecoverable ? (
              <>
                <form action={redialCall} className="inline">
                  <input type="hidden" name="callId" value={call.id} />
                  <button
                    type="submit"
                    className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
                  >
                    Religar
                  </button>
                </form>
                {call.leadId ? (
                  <form action={markCallConverted} className="inline">
                    <input type="hidden" name="callId" value={call.id} />
                    <input type="hidden" name="leadId" value={call.leadId} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-green-500 hover:underline whitespace-nowrap"
                    >
                      Marcar convertido
                    </button>
                  </form>
                ) : null}
              </>
            ) : call.outcome === "recovered" ? (
              <span className="text-xs text-green-500">
                <CheckCircle2 className="inline h-3 w-3 mr-0.5" />
                Convertido
              </span>
            ) : null}
          </div>
        ) : null}
      </td>
    </tr>
  );
}

/* ── Components ── */

function ContactRow({ contact }: { contact: FollowUpContact }) {
  return (
    <Link
      href={`/leads/${contact.lead_id}`}
      className="block rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 transition-colors hover:bg-[var(--surface)]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">
            {contact.customer_name}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {formatPhone(contact.phone)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold tabular-nums text-[var(--accent)]">
            {formatCurrency(contact.payment_value)}
          </p>
          <StageBadge stage={contact.lead_status} />
        </div>
      </div>
    </Link>
  );
}

function OutcomeBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--foreground-secondary)]">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-[var(--foreground)]">
          {count}{" "}
          <span className="text-[var(--muted)]">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-[var(--surface)]">
        <div
          className="h-1 rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SettingLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--muted)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--foreground)]">
          {value}
        </span>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function mapOutcomeLabel(outcome: string) {
  const labels: Record<string, string> = {
    recovered: "Recuperado",
    callback_scheduled: "Callback agendado",
    interested: "Interessado",
    no_interest: "Sem interesse",
    wrong_number: "Número errado",
    voicemail_left: "Recado deixado",
    no_voicemail: "Sem recado",
    technical_issue: "Problema técnico",
    other: "Outro",
  };
  return labels[outcome] ?? outcome;
}

function mapStatusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: "Na fila",
    ringing: "Tocando",
    in_progress: "Em andamento",
    completed: "Finalizada",
    failed: "Falhou",
    no_answer: "Sem resposta",
    busy: "Ocupado",
    voicemail: "Caixa postal",
    cancelled: "Cancelada",
  };
  return labels[status] ?? status;
}

function mapToneLabel(tone: string) {
  const labels: Record<string, string> = {
    empathetic: "Empático",
    professional: "Profissional",
    urgent: "Urgente",
    friendly: "Amigável",
    direct: "Direto",
  };
  return labels[tone] ?? tone;
}
