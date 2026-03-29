import Link from "next/link";
import {
  Clock,
  ExternalLink,
  Megaphone,
  Mic,
  Percent,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Play,
  Settings2,
  TrendingUp,
} from "lucide-react";

import {
  dispatchCall,
  saveCallcenterSettings,
} from "@/app/actions/recovery-actions";
import { ActionButton } from "@/components/ui/action-button";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { LeadPhoneSelector } from "@/components/ui/lead-phone-selector";
import { StageBadge } from "@/components/ui/stage-badge";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { formatPhone, hasPhone } from "@/lib/contact";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getStorageService } from "@/server/recovery/services/storage";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type {
  CallRecord,
  CallcenterSettingsRecord,
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
    storage.listCalls({ limit: 30 }),
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

  return (
    <PlatformAppPage currentPath="/calling">
      {/* KPI cards */}
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
          label="duracao media"
          value={formatDuration(analytics.averageDurationSeconds)}
          subtitle={`${formatDuration(analytics.totalDurationSeconds)} total`}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Admin: Dispatch call form */}
          {isAdmin ? (
            <PlatformSurface className="p-5 sm:p-6">
              <div className="border-b border-[var(--border)] pb-4">
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--accent)]">
                  Disparar chamada
                </p>
                <h3 className="mt-1 text-[0.95rem] font-semibold tracking-[-0.01em] text-gray-900 dark:text-white">
                  Ligar para um contato
                </h3>
              </div>

              <form action={dispatchCall} className="mt-4 space-y-4">
                <LeadPhoneSelector
                  contacts={callableContacts.map((c) => ({
                    lead_id: c.lead_id,
                    customer_name: c.customer_name,
                    phone: c.phone,
                    payment_value: c.payment_value,
                  }))}
                />

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Copy / Script da chamada
                  </label>
                  <textarea
                    name="copy"
                    rows={3}
                    placeholder="Ola, estou ligando em nome da empresa sobre o pagamento pendente..."
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 resize-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Produto
                    </label>
                    <input
                      name="product"
                      type="text"
                      placeholder="Mentoria Premium"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Tom de voz
                    </label>
                    <select
                      name="voiceTone"
                      defaultValue="empathetic"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    >
                      <option value="empathetic">Empatico</option>
                      <option value="professional">Profissional</option>
                      <option value="urgent">Urgente</option>
                      <option value="friendly">Amigavel</option>
                      <option value="direct">Direto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Genero da voz
                    </label>
                    <select
                      name="voiceGender"
                      defaultValue="female"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    >
                      <option value="female">Feminina</option>
                      <option value="male">Masculina</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Desconto (%)
                    </label>
                    <input
                      name="discountPercent"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue="0"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Cupom de desconto
                  </label>
                  <input
                    name="couponCode"
                    type="text"
                    placeholder="Ex: RECUPERA20"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                  />
                </div>

                <input type="hidden" name="provider" value="vapi" />

                <div className="flex justify-end">
                  <ActionButton className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]">
                    <Play className="h-4 w-4" />
                    Disparar chamada
                  </ActionButton>
                </div>
              </form>
            </PlatformSurface>
          ) : null}

          {/* Seller: Settings panel */}
          {!isAdmin ? (
            <PlatformSurface className="p-5 sm:p-6">
              <div className="border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[var(--accent)]">
                    Configuracoes do agente de voz
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Chamadas sao disparadas automaticamente via webhook. Configure o tom e desconto aqui.
                </p>
              </div>

              <form action={saveCallcenterSettings} className="mt-4 space-y-4">
                <input type="hidden" name="sellerKey" value={sellerKey} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      <Mic className="h-3 w-3" /> Tom de voz
                    </label>
                    <select
                      name="voiceTone"
                      defaultValue={settings?.voiceTone ?? "empathetic"}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    >
                      <option value="empathetic">Empatico</option>
                      <option value="professional">Profissional</option>
                      <option value="urgent">Urgente</option>
                      <option value="friendly">Amigavel</option>
                      <option value="direct">Direto</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      <Megaphone className="h-3 w-3" /> Genero da voz
                    </label>
                    <select
                      name="voiceGender"
                      defaultValue={settings?.voiceGender ?? "female"}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    >
                      <option value="female">Feminina</option>
                      <option value="male">Masculina</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      <Percent className="h-3 w-3" /> Desconto oferecido (%)
                    </label>
                    <input
                      name="discountPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      defaultValue={settings?.discountPercent ?? 0}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Cupom de desconto
                    </label>
                    <input
                      name="couponCode"
                      type="text"
                      placeholder="Ex: RECUPERA20"
                      defaultValue={settings?.couponCode ?? ""}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Produto padrao
                    </label>
                    <input
                      name="defaultProduct"
                      type="text"
                      placeholder="Nome do produto"
                      defaultValue={settings?.defaultProduct ?? ""}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Script padrao da chamada
                  </label>
                  <textarea
                    name="defaultCopy"
                    rows={3}
                    placeholder="Ola, tudo bem? Aqui é da [empresa], estou entrando em contato sobre..."
                    defaultValue={settings?.defaultCopy ?? ""}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <ActionButton className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]">
                    <Settings2 className="h-4 w-4" />
                    Salvar configuracoes
                  </ActionButton>
                </div>
              </form>
            </PlatformSurface>
          ) : null}

          {/* Recent calls */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                  Chamadas recentes
                </p>
                <h3 className="mt-1 text-[0.95rem] font-semibold tracking-[-0.01em] text-gray-900 dark:text-white">
                  Historico de ligacoes
                </h3>
              </div>
              {analytics.totalCalls > 0 ? (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {analytics.totalCalls} total
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-2.5">
              {calls.length === 0 ? (
                <PlatformInset className="p-6 text-center">
                  <PhoneOff className="mx-auto h-5 w-5 text-gray-400" />
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma chamada registrada ainda.
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {isAdmin
                      ? "Use o formulario acima para disparar a primeira chamada."
                      : "As chamadas aparecerao aqui conforme forem disparadas via webhook."}
                  </p>
                </PlatformInset>
              ) : (
                calls.map((call) => <CallRow key={call.id} call={call} />)
              )}
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          {/* Admin: Callable contacts */}
          {isAdmin ? (
            <PlatformSurface className="p-5">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                Contatos para ligar
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {callableContacts.length}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                leads ativos com telefone
              </p>

              <div className="mt-4 max-h-[20rem] space-y-2 overflow-y-auto">
                {callableContacts.slice(0, 10).map((contact) => (
                  <ContactRow key={contact.lead_id} contact={contact} />
                ))}
                {callableContacts.length > 10 ? (
                  <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-2">
                    +{callableContacts.length - 10} contatos
                  </p>
                ) : null}
              </div>
            </PlatformSurface>
          ) : null}

          {/* Outcome breakdown */}
          {analytics.totalCalls > 0 ? (
            <PlatformSurface className="p-5">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                Resultados das chamadas
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
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                Status das chamadas
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

          {/* Seller: current settings summary */}
          {!isAdmin && settings ? (
            <PlatformSurface className="p-5">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                Config ativa
              </p>
              <div className="mt-3 space-y-2">
                <SettingLine label="Tom" value={mapToneLabel(settings.voiceTone)} />
                <SettingLine label="Genero" value={settings.voiceGender === "female" ? "Feminina" : "Masculina"} />
                <SettingLine label="Desconto" value={`${settings.discountPercent}%`} />
                <SettingLine label="Cupom" value={settings.couponCode || "—"} />
                <SettingLine label="Produto" value={settings.defaultProduct || "—"} />
                <SettingLine label="Provider" value={settings.provider} />
              </div>
            </PlatformSurface>
          ) : null}
        </div>
      </section>
    </PlatformAppPage>
  );
}

/* ── Components ── */

function CallRow({ call }: { call: CallRecord }) {
  const StatusIcon =
    call.status === "completed"
      ? Phone
      : call.status === "no_answer" || call.status === "busy"
        ? PhoneMissed
        : call.status === "in_progress" || call.status === "ringing"
          ? PhoneIncoming
          : PhoneOff;

  const statusColor =
    call.status === "completed"
      ? "text-green-500"
      : call.status === "in_progress" || call.status === "ringing"
        ? "text-blue-500"
        : call.status === "failed"
          ? "text-red-500"
          : "text-gray-400";

  return (
    <div className="glass-inset rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 ${statusColor}`}
          >
            <StatusIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {formatPhone(call.toNumber)}
              </p>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.65rem] font-medium ${
                  call.status === "completed"
                    ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                    : call.status === "in_progress"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                      : call.status === "failed"
                        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {mapStatusLabel(call.status)}
              </span>
              {call.outcome ? (
                <span className="inline-flex items-center rounded-md bg-[var(--accent)]/5 px-2 py-0.5 text-[0.65rem] font-medium text-[var(--accent)]">
                  {mapOutcomeLabel(call.outcome)}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              {call.durationSeconds > 0 ? (
                <span>{formatDuration(call.durationSeconds)}</span>
              ) : null}
              {call.product ? <span>{call.product}</span> : null}
              {call.voiceTone ? (
                <span>{mapToneLabel(call.voiceTone)}</span>
              ) : null}
              {call.discountPercent && call.discountPercent > 0 ? (
                <span className="text-[var(--accent)]">
                  -{call.discountPercent}%
                </span>
              ) : null}
              {call.chosenPaymentMethod ? (
                <span className="font-medium text-[var(--accent)]">
                  {call.chosenPaymentMethod === "pix" ? "PIX" : call.chosenPaymentMethod === "card" ? "Cartao" : "Boleto"}
                </span>
              ) : null}
              <span>{call.provider}</span>
              {call.sentiment ? (
                <span
                  className={
                    call.sentiment === "positive"
                      ? "text-green-500"
                      : call.sentiment === "negative"
                        ? "text-red-500"
                        : ""
                  }
                >
                  {call.sentiment === "positive"
                    ? "Positivo"
                    : call.sentiment === "negative"
                      ? "Negativo"
                      : "Neutro"}
                </span>
              ) : null}
            </div>
            {call.transcriptSummary ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {call.transcriptSummary}
              </p>
            ) : null}
            {call.checkoutUrl ? (
              <a
                href={call.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-[var(--accent)]/10 px-2 py-1 text-[0.65rem] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Link de pagamento enviado
              </a>
            ) : null}
            {call.copy ? (
              <p className="mt-1 text-[0.65rem] text-gray-400 dark:text-gray-500 line-clamp-1 italic">
                Copy: {call.copy}
              </p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatRelativeTime(call.createdAt)}
          </p>
          {call.leadId ? (
            <Link
              href={`/leads/${call.leadId}`}
              className="mt-1 text-[0.65rem] font-medium text-[var(--accent)] hover:underline"
            >
              Ver lead
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ContactRow({ contact }: { contact: FollowUpContact }) {
  return (
    <Link
      href={`/leads/${contact.lead_id}`}
      className="glass-inset glass-hover block rounded-lg p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {contact.customer_name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatPhone(contact.phone)}
          </p>
        </div>
        <div className="text-right shrink-0">
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
    <div className="glass-inset rounded-lg px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
          {count}{" "}
          <span className="text-gray-400 dark:text-gray-500">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
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
    <div className="glass-inset rounded-lg px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="text-xs font-semibold text-gray-900 dark:text-white">
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
    wrong_number: "Numero errado",
    voicemail_left: "Recado deixado",
    no_voicemail: "Sem recado",
    technical_issue: "Problema tecnico",
    other: "Outro",
  };
  return labels[outcome] ?? outcome;
}

function mapStatusLabel(status: string) {
  const labels: Record<string, string> = {
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
  return labels[status] ?? status;
}

function mapToneLabel(tone: string) {
  const labels: Record<string, string> = {
    empathetic: "Empatico",
    professional: "Profissional",
    urgent: "Urgente",
    friendly: "Amigavel",
    direct: "Direto",
  };
  return labels[tone] ?? tone;
}
