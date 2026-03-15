import Link from "next/link";
import {
  ArrowRight,
  Phone,
  UsersRound,
} from "lucide-react";

import { transitionLeadStage } from "@/app/actions/recovery-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StageBadge } from "@/components/ui/stage-badge";
import { StopPropagation } from "@/components/ui/stop-propagation";
import { TimeBadge } from "@/components/ui/time-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { hasPhone, pickBestContact } from "@/lib/contact";
import { mapStageLabel, recommendedNextAction } from "@/lib/stage";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type { FollowUpContact } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM | Shield Recovery",
};

export default async function LeadsPage() {
  const service = getPaymentRecoveryService();
  const contacts = await service.getFollowUpContacts();

  const activeContacts = contacts.filter(
    (c) => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST",
  );
  const unassignedCount = activeContacts.filter((c) => !c.assigned_agent).length;
  const withPhoneCount = activeContacts.filter((c) => hasPhone(c.phone)).length;

  const lanes = [
    { key: "NEW_RECOVERY", leads: contacts.filter((c) => c.lead_status === "NEW_RECOVERY") },
    { key: "CONTACTING", leads: contacts.filter((c) => c.lead_status === "CONTACTING") },
    { key: "WAITING_CUSTOMER", leads: contacts.filter((c) => c.lead_status === "WAITING_CUSTOMER") },
    { key: "RECOVERED", leads: contacts.filter((c) => c.lead_status === "RECOVERED") },
    { key: "LOST", leads: contacts.filter((c) => c.lead_status === "LOST") },
  ];

  const actionableLeads = contacts.filter(
    (c) => c.lead_status === "NEW_RECOVERY" || c.lead_status === "CONTACTING",
  );
  const focusedLead =
    actionableLeads.sort((a, b) => b.payment_value - a.payment_value)[0] ??
    contacts[0] ??
    null;

  return (
    <PlatformAppPage
      currentPath="/leads"
      action={
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Conversas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={UsersRound}
          label="leads ativos"
          value={activeContacts.length.toString()}
        />
        <PlatformMetricCard
          icon={UsersRound}
          label="sem responsável"
          value={unassignedCount.toString()}
        />
        <PlatformMetricCard
          icon={Phone}
          label="com telefone"
          value={withPhoneCount.toString()}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_19rem]">
        <PlatformSurface className="p-4 sm:p-5">
          <div className="border-b border-black/[0.06] pb-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
              Carteira por etapa
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
              O CRM onde cada caso avança com contexto claro.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
              Aqui o time organiza a recuperação por momento do lead. Cada card
              mostra somente o que ajuda a agir: valor, dono, canal e próxima
              movimentação.
            </p>
          </div>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-5 xl:overflow-visible xl:pb-0">
            {lanes.map((lane) => (
              <div
                key={lane.key}
                className="min-w-[17.5rem] rounded-2xl border border-black/[0.05] bg-[#f9fafb] p-3 xl:min-w-0"
              >
                <div className="flex items-center justify-between pb-3">
                  <p className="text-sm font-medium text-[#1a1a2e]">
                    {mapStageLabel(lane.key)}
                  </p>
                  <span className="rounded-full border border-black/[0.06] bg-white px-2 py-0.5 text-[0.65rem] text-[#717182]">
                    {lane.leads.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {lane.leads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-black/10 px-3 py-5 text-center">
                      <p className="text-xs text-[#9ca3af]">Vazio</p>
                    </div>
                  ) : (
                    lane.leads.map((contact) => (
                      <LeadCard key={contact.lead_id} contact={contact} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </PlatformSurface>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-4">
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-orange-500">
              Caso em foco
            </h3>
            {focusedLead ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e]">
                    {focusedLead.customer_name}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#1a1a2e]">
                    {formatCurrency(focusedLead.payment_value)}
                  </p>
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    {focusedLead.product || "Produto não informado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StageBadge stage={focusedLead.lead_status} />
                  <TimeBadge updatedAt={focusedLead.updated_at} />
                </div>
                <div className="space-y-2 text-sm">
                  <DetailLine label="Dono" value={focusedLead.assigned_agent || "Sem responsável"} />
                  <DetailLine
                    label="Contato"
                    value={pickBestContact(focusedLead.phone, focusedLead.email)}
                  />
                  <DetailLine label="Atualizado" value={formatDateTime(focusedLead.updated_at)} />
                </div>
                <div className="rounded-xl bg-[#f5f5f7] px-3 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#717182]">
                    Próxima ação
                  </p>
                  <p className="mt-1 text-sm text-[#374151]">{recommendedNextAction(focusedLead)}</p>
                </div>
              </div>
            ) : (
              <PlatformInset className="mt-3 p-4">
                <p className="text-sm text-[#9ca3af]">Nenhum lead na carteira.</p>
              </PlatformInset>
            )}
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function LeadCard({ contact }: { contact: FollowUpContact }) {
  const channel = hasPhone(contact.phone) ? "WhatsApp" : "Email";
  const isTerminal = contact.lead_status === "RECOVERED" || contact.lead_status === "LOST";

  return (
    <Link
      href={`/leads/${contact.lead_id}`}
      className="group block rounded-2xl border border-black/[0.06] bg-white p-3.5 transition-all hover:border-orange-200 hover:shadow-[0_14px_32px_rgba(17,24,39,0.06)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium text-[#1a1a2e] transition-colors group-hover:text-orange-600">
          {contact.customer_name}
        </span>
        <p className="whitespace-nowrap text-sm font-semibold text-[#1a1a2e]">
          {formatCurrency(contact.payment_value)}
        </p>
      </div>
      <p className="mt-1 text-xs text-[#9ca3af]">
        {contact.product || "Produto não informado"}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#9ca3af]">
        <span>{contact.assigned_agent || "Sem dono"}</span>
        <span className="text-[#d1d5db]">·</span>
        <span>{channel}</span>
        <TimeBadge updatedAt={contact.updated_at} />
      </div>
      <div className="mt-3 rounded-xl border border-black/[0.05] bg-[#fafafa] px-3 py-2.5">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#9ca3af]">
          Próxima ação
        </p>
        <p className="mt-1 text-xs leading-5 text-[#4b5563]">
          {recommendedNextAction(contact)}
        </p>
      </div>
      {!isTerminal && (
        <StopPropagation className="mt-3">
          <LeadAction contact={contact} />
        </StopPropagation>
      )}
    </Link>
  );
}

function LeadAction({ contact }: { contact: FollowUpContact }) {
  const nextStatus = contact.lead_status === "NEW_RECOVERY" ? "CONTACTING" : contact.lead_status === "CONTACTING" ? "WAITING_CUSTOMER" : "CONTACTING";
  const label = contact.lead_status === "NEW_RECOVERY" ? "Iniciar contato" : contact.lead_status === "CONTACTING" ? "Aguardar cliente" : "Retomar contato";
  const isPrimary = contact.lead_status === "NEW_RECOVERY";

  return (
    <form action={transitionLeadStage}>
      <input type="hidden" name="leadId" value={contact.lead_id} />
      <input type="hidden" name="status" value={nextStatus} />
      <ActionButton className={`w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isPrimary ? "bg-orange-500 text-white hover:bg-orange-600" : "border border-black/10 bg-white text-[#1a1a2e] hover:bg-[#f5f5f7]"}`}>
        {label}
      </ActionButton>
    </form>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#9ca3af]">{label}</span>
      <span className="text-sm text-[#374151] truncate">{value}</span>
    </div>
  );
}
