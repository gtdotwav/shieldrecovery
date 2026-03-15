import Link from "next/link";
import { ArrowRight, CircleAlert, Phone, UsersRound } from "lucide-react";

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
import { hasPhone, pickBestContact } from "@/lib/contact";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  mapPaymentMethod,
  mapPaymentStatus,
  mapStageLabel,
  recommendedNextAction,
  scorePriority,
} from "@/lib/stage";
import { cn } from "@/lib/utils";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type {
  FollowUpContact,
  RecoveryLeadStatus,
} from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM | Shield Recovery",
};

type SearchParamValue = string | string[] | undefined;

type LeadsPageProps = {
  searchParams?: Promise<{
    view?: SearchParamValue;
    scope?: SearchParamValue;
  }>;
};

type ViewMode = "list" | "kanban";
type ScopeMode = "open" | "all" | "closed";

const laneOrder: RecoveryLeadStatus[] = [
  "NEW_RECOVERY",
  "CONTACTING",
  "WAITING_CUSTOMER",
  "RECOVERED",
  "LOST",
];

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  await requireAuthenticatedSession();
  const params = (await searchParams) ?? {};
  const currentView = readViewMode(params.view);
  const currentScope = readScopeMode(params.scope);

  const service = getPaymentRecoveryService();
  const contacts = await service.getFollowUpContacts();

  const sortedContacts = [...contacts].sort(compareLeads);
  const activeContacts = sortedContacts.filter(isOpenLead);
  const filteredContacts = filterContactsByScope(sortedContacts, currentScope);

  const unassignedCount = activeContacts.filter((c) => !c.assigned_agent).length;
  const withPhoneCount = activeContacts.filter((c) => hasPhone(c.phone)).length;
  const waitingCount = activeContacts.filter(
    (c) => c.lead_status === "WAITING_CUSTOMER",
  ).length;

  const lanes = laneOrder.map((key) => ({
    key,
    leads: sortedContacts.filter((c) => c.lead_status === key),
  }));

  const focusedLead =
    filteredContacts.find((contact) => isOpenLead(contact)) ??
    activeContacts[0] ??
    sortedContacts[0] ??
    null;

  return (
    <PlatformAppPage
      currentPath="/leads"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <ViewSwitcher currentView={currentView} currentScope={currentScope} />
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Conversas
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={UsersRound}
          label="leads ativos"
          value={activeContacts.length.toString()}
        />
        <PlatformMetricCard
          icon={CircleAlert}
          label="aguardando retorno"
          value={waitingCount.toString()}
        />
        <PlatformMetricCard
          icon={Phone}
          label="com telefone"
          value={withPhoneCount.toString()}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_19rem]">
        <PlatformSurface className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-black/[0.06] pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-orange-500">
                CRM operacional
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
                Lista para escala, kanban para leitura rápida.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
                A carteira principal agora nasce em lista. Isso reduz ruído,
                suporta volume alto e deixa o kanban como visão complementar, não
                como gargalo do dia a dia.
              </p>
            </div>

            <ScopeSwitcher currentView={currentView} currentScope={currentScope} />
          </div>

          <div className="mt-4">
            {currentView === "list" ? (
              <LeadListView contacts={filteredContacts} />
            ) : (
              <LeadKanbanView lanes={lanes} currentScope={currentScope} />
            )}
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
                  <DetailLine
                    label="Dono"
                    value={focusedLead.assigned_agent || "Sem responsável"}
                  />
                  <DetailLine
                    label="Contato"
                    value={pickBestContact(focusedLead.phone, focusedLead.email)}
                  />
                  <DetailLine
                    label="Status"
                    value={`${mapPaymentMethod(focusedLead.payment_method)} · ${mapPaymentStatus(focusedLead.payment_status)}`}
                  />
                  <DetailLine
                    label="Atualizado"
                    value={formatDateTime(focusedLead.updated_at)}
                  />
                </div>
                <div className="rounded-xl bg-[#f5f5f7] px-3 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#717182]">
                    Próxima ação
                  </p>
                  <p className="mt-1 text-sm text-[#374151]">
                    {recommendedNextAction(focusedLead)}
                  </p>
                </div>
                <Link
                  href={`/leads/${focusedLead.lead_id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
                >
                  Abrir detalhe do lead
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <PlatformInset className="mt-3 p-4">
                <p className="text-sm text-[#9ca3af]">Nenhum lead na carteira.</p>
              </PlatformInset>
            )}
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-orange-500">
              Leitura da carteira
            </h3>
            <div className="mt-4 space-y-2.5">
              {laneOrder.map((stage) => {
                const count = activeContacts.filter((c) => c.lead_status === stage).length;
                if (stage === "RECOVERED" || stage === "LOST") {
                  return null;
                }

                return (
                  <div
                    key={stage}
                    className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <StageBadge stage={stage} />
                    </div>
                    <span className="text-sm font-medium text-[#1a1a2e]">{count}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2.5">
                <span className="text-sm text-[#6b7280]">Sem responsável</span>
                <span className="text-sm font-medium text-[#1a1a2e]">{unassignedCount}</span>
              </div>
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function ViewSwitcher({
  currentView,
  currentScope,
}: {
  currentView: ViewMode;
  currentScope: ScopeMode;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-black/[0.08] bg-white p-1">
      <SwitcherLink
        href={buildLeadsHref({ view: "list", scope: currentScope })}
        active={currentView === "list"}
      >
        Lista
      </SwitcherLink>
      <SwitcherLink
        href={buildLeadsHref({ view: "kanban", scope: currentScope })}
        active={currentView === "kanban"}
      >
        Kanban
      </SwitcherLink>
    </div>
  );
}

function ScopeSwitcher({
  currentView,
  currentScope,
}: {
  currentView: ViewMode;
  currentScope: ScopeMode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SwitcherLink
        href={buildLeadsHref({ view: currentView, scope: "open" })}
        active={currentScope === "open"}
      >
        Em aberto
      </SwitcherLink>
      <SwitcherLink
        href={buildLeadsHref({ view: currentView, scope: "all" })}
        active={currentScope === "all"}
      >
        Todos
      </SwitcherLink>
      <SwitcherLink
        href={buildLeadsHref({ view: currentView, scope: "closed" })}
        active={currentScope === "closed"}
      >
        Encerrados
      </SwitcherLink>
    </div>
  );
}

function SwitcherLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-[#111827] text-white"
          : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]",
      )}
    >
      {children}
    </Link>
  );
}

function LeadListView({ contacts }: { contacts: FollowUpContact[] }) {
  if (contacts.length === 0) {
    return (
      <PlatformInset className="p-6 text-center">
        <p className="text-sm text-[#6b7280]">
          Nenhum lead encontrado para essa visualização.
        </p>
      </PlatformInset>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="grid grid-cols-[minmax(0,1.5fr)_0.9fr_0.95fr_1.2fr_0.8fr_0.9fr_0.8fr] gap-3 border-b border-black/[0.06] bg-[#fafafa] px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
            <span>Lead</span>
            <span>Etapa</span>
            <span>Valor</span>
            <span>Contato</span>
            <span>Dono</span>
            <span>Atualizado</span>
            <span className="text-right">Ação</span>
          </div>
          <div className="divide-y divide-black/[0.06]">
            {contacts.map((contact) => (
              <LeadTableRow key={contact.lead_id} contact={contact} />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {contacts.map((contact) => (
          <LeadCompactCard key={contact.lead_id} contact={contact} />
        ))}
      </div>
    </>
  );
}

function LeadKanbanView({
  lanes,
  currentScope,
}: {
  lanes: { key: RecoveryLeadStatus; leads: FollowUpContact[] }[];
  currentScope: ScopeMode;
}) {
  const visibleLanes =
    currentScope === "open"
      ? lanes.filter((lane) => lane.key !== "RECOVERED" && lane.key !== "LOST")
      : currentScope === "closed"
        ? lanes.filter((lane) => lane.key === "RECOVERED" || lane.key === "LOST")
        : lanes;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-5 xl:overflow-visible xl:pb-0">
      {visibleLanes.map((lane) => (
        <div
          key={lane.key}
          className="min-w-[17rem] rounded-2xl border border-black/[0.05] bg-[#f9fafb] p-3 xl:min-w-0"
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
                <LeadCompactCard key={contact.lead_id} contact={contact} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadTableRow({ contact }: { contact: FollowUpContact }) {
  const isTerminal = isTerminalLead(contact);

  return (
    <div className="grid grid-cols-[minmax(0,1.5fr)_0.9fr_0.95fr_1.2fr_0.8fr_0.9fr_0.8fr] gap-3 px-4 py-3 transition-colors hover:bg-[#fcfcfd]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/leads/${contact.lead_id}`}
            className="truncate text-sm font-semibold text-[#111827] transition-colors hover:text-orange-600"
          >
            {contact.customer_name}
          </Link>
        </div>
        <p className="mt-1 truncate text-xs text-[#9ca3af]">
          {contact.product || "Produto não informado"}
        </p>
        <p className="mt-1 truncate text-xs text-[#6b7280]">
          {mapPaymentMethod(contact.payment_method)} ·{" "}
          {mapPaymentStatus(contact.payment_status)}
        </p>
      </div>

      <div className="flex items-center">
        <StageBadge stage={contact.lead_status} />
      </div>

      <div className="flex items-center text-sm font-semibold text-[#111827]">
        {formatCurrency(contact.payment_value)}
      </div>

      <div className="min-w-0 self-center">
        <p className="truncate text-sm text-[#374151]">
          {pickBestContact(contact.phone, contact.email)}
        </p>
        <p className="mt-1 truncate text-xs text-[#9ca3af]">
          {hasPhone(contact.phone) ? "WhatsApp prioritário" : "Email prioritário"}
        </p>
      </div>

      <div className="flex items-center text-sm text-[#374151]">
        {contact.assigned_agent || "Sem responsável"}
      </div>

      <div className="flex items-center">
        <TimeBadge updatedAt={contact.updated_at} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/leads/${contact.lead_id}`}
          className="text-xs font-medium text-[#6b7280] transition-colors hover:text-[#111827]"
        >
          Abrir
        </Link>
        {!isTerminal ? (
          <StopPropagation>
            <LeadAction contact={contact} compact />
          </StopPropagation>
        ) : null}
      </div>
    </div>
  );
}

function LeadCompactCard({ contact }: { contact: FollowUpContact }) {
  const isTerminal = isTerminalLead(contact);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-[0_10px_24px_rgba(17,24,39,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/leads/${contact.lead_id}`}
            className="block truncate text-sm font-semibold text-[#111827] transition-colors hover:text-orange-600"
          >
            {contact.customer_name}
          </Link>
          <p className="mt-1 truncate text-xs text-[#9ca3af]">
            {contact.product || "Produto não informado"}
          </p>
        </div>
        <p className="whitespace-nowrap text-sm font-semibold text-[#111827]">
          {formatCurrency(contact.payment_value)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StageBadge stage={contact.lead_status} />
        <TimeBadge updatedAt={contact.updated_at} />
      </div>

      <div className="mt-3 grid gap-2 text-sm text-[#4b5563] sm:grid-cols-2">
        <DetailBlock label="Contato" value={pickBestContact(contact.phone, contact.email)} />
        <DetailBlock label="Dono" value={contact.assigned_agent || "Sem responsável"} />
      </div>

      <div className="mt-3 rounded-xl bg-[#f8fafc] px-3 py-2.5">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#9ca3af]">
          Próxima ação
        </p>
        <p className="mt-1 text-xs leading-5 text-[#4b5563]">
          {recommendedNextAction(contact)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <Link
          href={`/leads/${contact.lead_id}`}
          className="text-xs font-medium text-[#6b7280] transition-colors hover:text-[#111827]"
        >
          Abrir detalhe
        </Link>
        {!isTerminal ? (
          <StopPropagation>
            <LeadAction contact={contact} />
          </StopPropagation>
        ) : null}
      </div>
    </div>
  );
}

function LeadAction({
  contact,
  compact = false,
}: {
  contact: FollowUpContact;
  compact?: boolean;
}) {
  const nextStatus =
    contact.lead_status === "NEW_RECOVERY"
      ? "CONTACTING"
      : contact.lead_status === "CONTACTING"
        ? "WAITING_CUSTOMER"
        : "CONTACTING";
  const label =
    contact.lead_status === "NEW_RECOVERY"
      ? "Iniciar"
      : contact.lead_status === "CONTACTING"
        ? "Aguardar"
        : "Retomar";
  const isPrimary = contact.lead_status === "NEW_RECOVERY";

  return (
    <form action={transitionLeadStage}>
      <input type="hidden" name="leadId" value={contact.lead_id} />
      <input type="hidden" name="status" value={nextStatus} />
      <ActionButton
        className={cn(
          "rounded-lg text-xs font-medium transition-colors",
          compact ? "px-2.5 py-1.5" : "px-3 py-1.5",
          isPrimary
            ? "bg-orange-500 text-white hover:bg-orange-600"
            : "border border-black/10 bg-white text-[#1a1a2e] hover:bg-[#f5f5f7]",
        )}
      >
        {label}
      </ActionButton>
    </form>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#9ca3af]">{label}</span>
      <span className="truncate text-right text-sm text-[#374151]">{value}</span>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#9ca3af]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm text-[#374151]">{value}</p>
    </div>
  );
}

function readViewMode(value: SearchParamValue): ViewMode {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === "kanban" ? "kanban" : "list";
}

function readScopeMode(value: SearchParamValue): ScopeMode {
  const selected = Array.isArray(value) ? value[0] : value;
  if (selected === "all" || selected === "closed") {
    return selected;
  }
  return "open";
}

function buildLeadsHref({
  view,
  scope,
}: {
  view: ViewMode;
  scope: ScopeMode;
}) {
  const params = new URLSearchParams();
  params.set("view", view);
  params.set("scope", scope);
  return `/leads?${params.toString()}`;
}

function isOpenLead(contact: FollowUpContact) {
  return contact.lead_status !== "RECOVERED" && contact.lead_status !== "LOST";
}

function isTerminalLead(contact: FollowUpContact) {
  return contact.lead_status === "RECOVERED" || contact.lead_status === "LOST";
}

function filterContactsByScope(contacts: FollowUpContact[], scope: ScopeMode) {
  if (scope === "open") {
    return contacts.filter(isOpenLead);
  }

  if (scope === "closed") {
    return contacts.filter((contact) => !isOpenLead(contact));
  }

  return contacts;
}

function compareLeads(a: FollowUpContact, b: FollowUpContact) {
  const aOpen = isOpenLead(a);
  const bOpen = isOpenLead(b);

  if (aOpen !== bOpen) {
    return aOpen ? -1 : 1;
  }

  if (aOpen && bOpen) {
    return scorePriority(b) - scorePriority(a);
  }

  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}
