import Link from "next/link";
import { ArrowRight, CircleAlert, Phone, UsersRound } from "lucide-react";

import { transitionLeadStage } from "@/app/actions/recovery-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformPill,
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
import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type {
  FollowUpContact,
  RecoveryLeadStatus,
} from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM | PagRecovery",
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
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const params = (await searchParams) ?? {};
  const currentView = readViewMode(params.view);
  const currentScope = readScopeMode(params.scope);

  const service = getPaymentRecoveryService();
  const sellerIdentity =
    session.role === "seller"
      ? await getSellerIdentityByEmail(session.email)
      : null;
  const contacts = (await service.getFollowUpContacts()).filter((contact) =>
    canRoleAccessAgent(
      session.role,
      contact.assigned_agent,
      sellerIdentity?.agentName,
    ),
  );

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
            className="glass-button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
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
          <div className="ambient-divider flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                CRM operacional
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                Lista para operar, kanban para apoiar.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgba(255,255,255,0.6)]">
                A operação principal fica na lista. O kanban continua disponível
                só como apoio visual para leitura de etapa.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <PlatformPill>{filteredContacts.length} casos visíveis</PlatformPill>
                <PlatformPill>{waitingCount} aguardando retorno</PlatformPill>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <ScopeSwitcher currentView={currentView} currentScope={currentScope} />
              <p className="text-xs text-[rgba(255,255,255,0.38)]">Lista como padrão.</p>
            </div>
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
            <h3 className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Caso em foco
            </h3>
            {focusedLead ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {focusedLead.customer_name}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--accent)]">
                    {formatCurrency(focusedLead.payment_value)}
                  </p>
                  <p className="mt-1 text-xs text-[rgba(255,255,255,0.42)]">
                    {focusedLead.product || "Produto não informado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StageBadge stage={focusedLead.lead_status} />
                  <TimeBadge updatedAt={focusedLead.updated_at} />
                </div>
                <div className="glass-inset space-y-2 rounded-[1rem] px-3 py-3">
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
                <div className="glass-inset rounded-[1rem] px-3 py-3">
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[rgba(255,255,255,0.44)]">
                    Próxima ação
                  </p>
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                    {recommendedNextAction(focusedLead)}
                  </p>
                </div>
                <Link
                  href={`/leads/${focusedLead.lead_id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] transition-colors hover:text-[#72f2a2]"
                >
                  Abrir detalhe do lead
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <PlatformInset className="mt-3 p-4">
                  <p className="text-sm text-[rgba(255,255,255,0.54)]">Nenhum lead nesta carteira.</p>
                <p className="mt-1 text-xs text-[rgba(255,255,255,0.38)]">
                  Quando novos casos entrarem, o foco da operação aparece aqui.
                </p>
              </PlatformInset>
            )}
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <h3 className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
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
                    className="glass-inset flex items-center justify-between rounded-[0.95rem] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <StageBadge stage={stage} />
                    </div>
                    <span className="text-sm font-medium text-white">{count}</span>
                  </div>
                );
              })}
              <div className="glass-inset flex items-center justify-between rounded-[0.95rem] px-3 py-2.5">
                <span className="text-sm text-[rgba(255,255,255,0.58)]">Sem responsável</span>
                <span className="text-sm font-medium text-white">{unassignedCount}</span>
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
    <div className="glass-inset inline-flex items-center rounded-full p-1">
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
        "rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] transition-colors",
        active
          ? "bg-[rgba(30,215,96,0.16)] text-[var(--accent)]"
          : "text-[rgba(255,255,255,0.58)] hover:bg-white/6 hover:text-white",
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
          Nenhum lead encontrado nessa visualização.
        </p>
        <p className="mt-1 text-xs text-[#9ca3af]">
          Ajuste o filtro ou aguarde a próxima entrada da carteira.
        </p>
      </PlatformInset>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <div className="glass-panel overflow-hidden rounded-[1.1rem]">
          <div className="ambient-divider grid grid-cols-[minmax(0,1.55fr)_0.9fr_0.95fr_1.1fr_0.8fr_0.9fr_0.82fr] gap-3 border-b bg-[rgba(255,255,255,0.03)] px-4 py-3 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.42)]">
            <span>Lead</span>
            <span>Etapa</span>
            <span>Valor</span>
            <span>Contato</span>
            <span>Dono</span>
            <span>Atualizado</span>
            <span className="text-right">Ação</span>
          </div>
          <div className="divide-y divide-white/6">
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
        <div key={lane.key} className="glass-panel min-w-[17rem] rounded-[1.1rem] p-3 xl:min-w-0">
          <div className="flex items-center justify-between pb-3">
            <p className="text-sm font-medium text-white">
              {mapStageLabel(lane.key)}
            </p>
            <span className="muted-pill rounded-full px-2 py-0.5 text-[0.65rem]">
              {lane.leads.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {lane.leads.length === 0 ? (
              <div className="glass-inset rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">
                <p className="text-xs text-[rgba(255,255,255,0.42)]">Vazio</p>
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
    <div className="grid grid-cols-[minmax(0,1.55fr)_0.9fr_0.95fr_1.1fr_0.8fr_0.9fr_0.82fr] gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/leads/${contact.lead_id}`}
            className="truncate text-sm font-semibold text-white transition-colors hover:text-[var(--accent)]"
          >
            {contact.customer_name}
          </Link>
        </div>
        <p className="mt-1 truncate text-xs text-[rgba(255,255,255,0.42)]">
          {contact.product || "Produto não informado"}
        </p>
        <p className="mt-1 truncate text-xs text-[rgba(255,255,255,0.58)]">
          {mapPaymentMethod(contact.payment_method)} ·{" "}
          {mapPaymentStatus(contact.payment_status)}
        </p>
      </div>

      <div className="flex items-center">
        <StageBadge stage={contact.lead_status} />
      </div>

      <div className="flex items-center text-sm font-semibold text-[var(--accent)]">
        {formatCurrency(contact.payment_value)}
      </div>

      <div className="min-w-0 self-center">
        <p className="truncate text-sm text-[rgba(255,255,255,0.78)]">
          {pickBestContact(contact.phone, contact.email)}
        </p>
        <p className="mt-1 truncate text-xs text-[rgba(255,255,255,0.42)]">
          {hasPhone(contact.phone) ? "WhatsApp prioritário" : "Email prioritário"}
        </p>
      </div>

      <div className="flex items-center text-sm text-[rgba(255,255,255,0.78)]">
        {contact.assigned_agent || "Sem responsável"}
      </div>

      <div className="flex items-center">
        <TimeBadge updatedAt={contact.updated_at} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/leads/${contact.lead_id}`}
          className="text-xs font-medium text-[rgba(255,255,255,0.54)] transition-colors hover:text-white"
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
    <div className="glass-inset rounded-[1.1rem] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/leads/${contact.lead_id}`}
            className="block truncate text-sm font-semibold text-white transition-colors hover:text-[var(--accent)]"
          >
            {contact.customer_name}
          </Link>
          <p className="mt-1 truncate text-xs text-[rgba(255,255,255,0.42)]">
            {contact.product || "Produto não informado"}
          </p>
        </div>
        <p className="whitespace-nowrap text-sm font-semibold text-[var(--accent)]">
          {formatCurrency(contact.payment_value)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StageBadge stage={contact.lead_status} />
        <TimeBadge updatedAt={contact.updated_at} />
      </div>

      <div className="mt-3 grid gap-2 text-sm text-[rgba(255,255,255,0.72)] sm:grid-cols-2">
        <DetailBlock label="Contato" value={pickBestContact(contact.phone, contact.email)} />
        <DetailBlock label="Dono" value={contact.assigned_agent || "Sem responsável"} />
      </div>

      <div className="glass-inset mt-3 rounded-[0.95rem] px-3 py-2.5">
        <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[rgba(255,255,255,0.42)]">
          Próxima ação
        </p>
        <p className="mt-1 text-xs leading-5 text-[rgba(255,255,255,0.72)]">
          {recommendedNextAction(contact)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <Link
          href={`/leads/${contact.lead_id}`}
          className="text-xs font-medium text-[rgba(255,255,255,0.54)] transition-colors hover:text-white"
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
      <input
        type="hidden"
        name="intent"
        value={contact.lead_status === "NEW_RECOVERY" ? "start_flow" : "move_stage"}
      />
      <ActionButton
        className={cn(
          "rounded-lg text-xs font-medium transition-colors",
          compact ? "px-2.5 py-1.5" : "px-3 py-1.5",
          isPrimary
            ? "glass-button-primary text-[0.72rem] uppercase tracking-[0.14em]"
            : "glass-button-secondary text-[0.72rem] uppercase tracking-[0.14em]",
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
      <span className="text-xs text-[rgba(255,255,255,0.42)]">{label}</span>
      <span className="truncate text-right text-sm text-[rgba(255,255,255,0.78)]">{value}</span>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[rgba(255,255,255,0.42)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm text-[rgba(255,255,255,0.78)]">{value}</p>
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
