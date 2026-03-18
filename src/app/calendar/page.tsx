import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageCircleMore,
  NotebookPen,
  Wallet,
} from "lucide-react";

import {
  createCalendarNoteAction,
  deleteCalendarNoteAction,
} from "@/app/actions/calendar-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { canRoleAccessAgent } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type {
  CalendarActivityItem,
  CalendarDaySummary,
  CalendarNoteLane,
  CalendarNoteRecord,
} from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendário | Shield Recovery",
};

type SearchParamValue = string | string[] | undefined;

type CalendarPageProps = {
  searchParams?: Promise<{
    month?: SearchParamValue;
    date?: SearchParamValue;
  }>;
};

const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

const laneConfig: Array<{
  key: CalendarNoteLane;
  title: string;
  description: string;
}> = [
  {
    key: "operations",
    title: "Operação",
    description: "Combinados, bloqueios e foco do dia.",
  },
  {
    key: "automations",
    title: "Automações",
    description: "IA, filas, ajustes e pontos de fluxo.",
  },
  {
    key: "revenue",
    title: "Receita",
    description: "Observações comerciais e leitura de faturamento.",
  },
];

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const params = (await searchParams) ?? {};
  const month = normalizeMonthParam(readSearchParam(params.month));
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
  const visibleLeadIds =
    session.role === "admin"
      ? undefined
      : [...new Set(contacts.map((contact) => contact.lead_id))];
  const snapshot = await service.getCalendarSnapshot({ month, visibleLeadIds });
  const selectedDate = resolveSelectedDate(
    readSearchParam(params.date),
    snapshot.month,
    snapshot.days,
  );
  const selectedDay =
    snapshot.days.find((day) => day.date === selectedDate) ??
    createEmptyDay(selectedDate);
  const selectedActivities = snapshot.activities
    .filter((item) => item.date === selectedDate)
    .slice(0, 12);
  const selectedNotes = snapshot.notes.filter((note) => note.date === selectedDate);
  const selectedMessages = selectedDay.outboundMessages + selectedDay.inboundMessages;
  const monthRecoveredRevenue = snapshot.days.reduce(
    (sum, day) => sum + day.recoveredRevenue,
    0,
  );
  const monthLabel = formatMonthLabel(snapshot.month);
  const prevMonth = shiftMonth(snapshot.month, -1);
  const nextMonth = shiftMonth(snapshot.month, 1);
  const today = todayDateKey();
  const grid = buildCalendarGrid(snapshot.days, snapshot.month);
  const movementDays = snapshot.days.filter(hasDayMovement).length;

  return (
    <PlatformAppPage
      currentPath="/calendar"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/calendar?month=${prevMonth}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </Link>
          <Link
            href={`/calendar?month=${toMonthKey(new Date())}&date=${today}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
          >
            Hoje
          </Link>
          <Link
            href={`/calendar?month=${nextMonth}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Próximo
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
    >
      <PlatformSurface className="overflow-hidden p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_18rem] xl:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <PlatformPill icon={CalendarDays}>{monthLabel}</PlatformPill>
            </div>

            <h2 className="mt-4 max-w-[16ch] text-3xl font-semibold tracking-tight text-[#111827] sm:text-[2.3rem]">
              Veja o mês por movimento. Abra a data para o detalhe.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6b7280]">
              A visão mensal agora ficou seca de propósito: só mostra o que
              movimentou cada dia. Timeline, notas e contexto operacional ficam
              concentrados na data selecionada.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-black/[0.06] bg-[#fbfbfc] px-4 py-4 text-sm leading-6 text-[#6b7280]">
            {movementDays} dias com movimento, {formatCurrency(monthRecoveredRevenue)}{" "}
            recuperado e {formatShortDate(selectedDate)} aberta agora.
          </div>
        </div>
      </PlatformSurface>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_24rem]">
        <PlatformSurface className="overflow-hidden p-4 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-orange-500">
                  Movimento do mês
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
                  {monthLabel}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <PlatformPill>{movementDays} dias com movimento</PlatformPill>
              </div>
            </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[58rem]">
              <div className="grid grid-cols-7 gap-2">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]"
                  >
                    {label}
                  </div>
                ))}

                {grid.map((cell, index) =>
                  cell ? (
                    <Link
                      key={cell.date}
                      href={`/calendar?month=${snapshot.month}&date=${cell.date}`}
                      className={cn(
                        "group flex min-h-[8.75rem] flex-col rounded-[1.2rem] border px-3.5 py-3 transition-all",
                        getDaySurfaceClass(cell, cell.date === selectedDate),
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            cell.date === today ? "text-orange-600" : "text-[#111827]",
                          )}
                        >
                          {readDayNumber(cell.date)}
                        </span>
                        {cell.date === selectedDate ? (
                          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-orange-600">
                            aberta
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5">
                        <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9ca3af]">
                          Movimentado
                        </p>
                        <p className="mt-1 text-lg font-semibold tracking-tight text-[#111827] sm:text-xl">
                          {cell.recoveredRevenue > 0 ? formatCompactCurrency(cell.recoveredRevenue) : "R$ 0"}
                        </p>
                      </div>

                      <div className="mt-auto pt-5">
                        <p className="text-sm text-[#6b7280]">{getCompactCellDescription(cell)}</p>
                        <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-orange-600 opacity-0 transition-opacity group-hover:opacity-100">
                          Abrir data
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[8.75rem] rounded-[1.2rem] border border-dashed border-black/[0.05] bg-transparent"
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </PlatformSurface>

        <PlatformSurface className="p-4 sm:p-5 xl:sticky xl:top-20 xl:self-start">
          <div className="border-b border-black/[0.06] pb-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-orange-500">
              Data aberta
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
              {formatFullDate(selectedDate)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
              Aqui entra o detalhe completo do dia: volume, timeline e notas da
              operação.
            </p>
          </div>

          <div className="mt-4">
            <PlatformInset className="grid gap-3 p-4">
              <DaySummaryLine
                icon={Wallet}
                label="Movimentado"
                value={formatCurrency(selectedDay.recoveredRevenue)}
                detail={`${selectedDay.recoveredCount} recuperações`}
              />
              <DaySummaryLine
                icon={MessageCircleMore}
                label="Mensagens"
                value={String(selectedMessages)}
                detail={`${selectedDay.outboundMessages} saídas · ${selectedDay.inboundMessages} entradas`}
              />
              <DaySummaryLine
                icon={Bot}
                label="Automações"
                value={String(selectedDay.automationJobs)}
                detail="jobs ligados à carteira visível"
              />
              <DaySummaryLine
                icon={NotebookPen}
                label="Notas"
                value={String(selectedNotes.length)}
                detail="contexto salvo nesta data"
              />
            </PlatformInset>
          </div>

          <div className="mt-5 border-t border-black/[0.06] pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                Timeline
              </p>
              <span className="text-xs text-[#9ca3af]">{selectedActivities.length} eventos</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {selectedActivities.length === 0 ? (
                <PlatformInset className="p-4">
                  <p className="text-sm text-[#9ca3af]">
                    Sem movimentação registrada neste dia.
                  </p>
                </PlatformInset>
              ) : (
                selectedActivities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </div>
          <div className="mt-5 border-t border-black/[0.06] pt-4">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                  Notas do dia
                </p>
                <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                  Tudo o que não cabe no número do calendário fica registrado aqui.
                </p>
              </div>

              <form action={createCalendarNoteAction} className="space-y-3">
                <input type="hidden" name="date" value={selectedDate} />
                <div className="grid gap-3">
                  <label className="space-y-1">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ca3af]">
                      Faixa
                    </span>
                    <select
                      name="lane"
                      defaultValue="operations"
                      className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-orange-400"
                    >
                      {laneConfig.map((lane) => (
                        <option key={lane.key} value={lane.key}>
                          {lane.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ca3af]">
                      Título
                    </span>
                    <input
                      name="title"
                      type="text"
                      placeholder="O que precisa ficar registrado?"
                      required
                      className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-orange-400"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ca3af]">
                      Contexto
                    </span>
                    <input
                      name="content"
                      type="text"
                      placeholder="Decisão, bloqueio, hipótese ou atualização relevante."
                      className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-orange-400"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="inline-flex h-[42px] items-center justify-center rounded-full bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                >
                  Salvar nota
                </button>
              </form>

              <div className="space-y-3 border-t border-black/[0.06] pt-4">
                {laneConfig.map((lane) => (
                  <NoteLaneSection
                    key={lane.key}
                    lane={lane}
                    notes={selectedNotes.filter((note) => note.lane === lane.key)}
                    month={snapshot.month}
                    currentUserEmail={session.email}
                    currentUserRole={session.role}
                  />
                ))}
              </div>
            </div>
          </div>
        </PlatformSurface>
      </section>
    </PlatformAppPage>
  );
}

function DaySummaryLine({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white">
          <Icon className="h-4 w-4 text-orange-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#111827]">{label}</p>
          <p className="mt-1 text-sm leading-6 text-[#6b7280]">{detail}</p>
        </div>
      </div>
      <p className="text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function ActivityRow({ activity }: { activity: CalendarActivityItem }) {
  return (
    <div className="rounded-[1rem] border border-black/[0.06] bg-[#fafafa] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#111827]">{activity.title}</p>
          <p className="mt-1 text-sm text-[#6b7280]">{activity.detail}</p>
        </div>
        <span className="shrink-0 text-[0.68rem] uppercase tracking-[0.16em] text-[#9ca3af]">
          {formatClock(activity.at)}
        </span>
      </div>
      {activity.href ? (
        <Link
          href={activity.href}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-orange-600 transition-colors hover:text-orange-700"
        >
          Abrir
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function NoteLaneSection({
  lane,
  notes,
  month,
  currentUserEmail,
  currentUserRole,
}: {
  lane: { key: CalendarNoteLane; title: string; description: string };
  notes: CalendarNoteRecord[];
  month: string;
  currentUserEmail: string;
  currentUserRole: "admin" | "seller";
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#111827]">{lane.title}</h4>
          <p className="mt-1 text-sm leading-6 text-[#6b7280]">{lane.description}</p>
        </div>
        <span className="rounded-full border border-black/[0.06] bg-white px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
          {notes.length}
        </span>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-[1rem] border border-dashed border-black/[0.08] bg-white/70 px-3.5 py-4 text-sm text-[#9ca3af]">
          Nenhuma nota nesta faixa ainda.
        </div>
      ) : (
        notes.map((note) => {
          const canDelete =
            currentUserRole === "admin" || note.createdByEmail === currentUserEmail;

          return (
            <div
              key={note.id}
              className="rounded-[1rem] border border-black/[0.06] bg-white px-3.5 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111827]">{note.title}</p>
                  {note.content ? (
                    <p className="mt-2 text-sm leading-6 text-[#4b5563]">{note.content}</p>
                  ) : null}
                </div>
                {canDelete ? (
                  <form action={deleteCalendarNoteAction}>
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="month" value={month} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-full border border-black/[0.08] px-2.5 py-1 text-[0.68rem] font-medium text-[#6b7280] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
                    >
                      Apagar
                    </button>
                  </form>
                ) : null}
              </div>
              <p className="mt-3 text-[0.72rem] uppercase tracking-[0.14em] text-[#9ca3af]">
                {note.createdByRole} · {note.createdByEmail} · {formatClock(note.updatedAt)}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}

function readSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeMonthParam(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return toMonthKey(new Date());
}

function resolveSelectedDate(
  value: string | undefined,
  month: string,
  days: CalendarDaySummary[],
) {
  const daySet = new Set(days.map((day) => day.date));
  if (value && daySet.has(value)) {
    return value;
  }

  const today = todayDateKey();
  if (today.startsWith(month) && daySet.has(today)) {
    return today;
  }

  return days[0]?.date ?? `${month}-01`;
}

function createEmptyDay(date: string): CalendarDaySummary {
  return {
    date,
    recoveredRevenue: 0,
    recoveredCount: 0,
    newLeads: 0,
    automationJobs: 0,
    outboundMessages: 0,
    inboundMessages: 0,
    notesCount: 0,
  };
}

function buildCalendarGrid(days: CalendarDaySummary[], month: string) {
  const [yearValue, monthValue] = month.split("-");
  const firstDay = new Date(Date.UTC(Number(yearValue), Number(monthValue) - 1, 1, 12, 0, 0));
  const offset = (firstDay.getUTCDay() + 6) % 7;

  return [...Array.from({ length: offset }, () => null), ...days];
}

function getDaySurfaceClass(day: CalendarDaySummary, isSelected: boolean) {
  if (isSelected) {
    return "border-orange-500/30 bg-[linear-gradient(180deg,rgba(249,115,22,0.1),rgba(255,255,255,0.96))] shadow-[0_14px_34px_rgba(249,115,22,0.14)]";
  }

  if (day.recoveredRevenue > 0) {
    return "border-orange-500/18 bg-[linear-gradient(180deg,rgba(249,115,22,0.08),rgba(255,255,255,0.96))] hover:border-orange-500/25 hover:shadow-[0_12px_28px_rgba(249,115,22,0.08)]";
  }

  if (day.notesCount > 0 || day.automationJobs > 0 || day.outboundMessages + day.inboundMessages > 0) {
    return "border-black/[0.06] bg-[linear-gradient(180deg,#ffffff,#fafafa)] hover:border-orange-500/18 hover:bg-white";
  }

  return "border-black/[0.06] bg-[#fafafa] hover:border-orange-500/14 hover:bg-white";
}

function getCompactCellDescription(day: CalendarDaySummary) {
  if (day.recoveredRevenue > 0) {
    return `${day.recoveredCount} recuperação${day.recoveredCount === 1 ? "" : "es"}`;
  }
  if (day.newLeads > 0) {
    return `${day.newLeads} lead${day.newLeads === 1 ? "" : "s"} em carteira`;
  }
  if (day.outboundMessages + day.inboundMessages > 0) {
    return `${day.outboundMessages + day.inboundMessages} interação${day.outboundMessages + day.inboundMessages === 1 ? "" : "ões"}`;
  }
  if (day.automationJobs > 0 || day.notesCount > 0) {
    return "Operação registrada";
  }
  return "Sem movimento";
}

function hasDayMovement(day: CalendarDaySummary) {
  return (
    day.recoveredRevenue > 0 ||
    day.recoveredCount > 0 ||
    day.newLeads > 0 ||
    day.automationJobs > 0 ||
    day.outboundMessages > 0 ||
    day.inboundMessages > 0 ||
    day.notesCount > 0
  );
}

function formatMonthLabel(month: string) {
  const [yearValue, monthValue] = month.split("-");
  const date = new Date(Date.UTC(Number(yearValue), Number(monthValue) - 1, 1, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatCompactCurrency(value: number) {
  if (!value) return "R$ 0";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function readDayNumber(date: string) {
  return Number(date.split("-")[2]);
}

function shiftMonth(month: string, amount: number) {
  const [yearValue, monthValue] = month.split("-");
  const date = new Date(Date.UTC(Number(yearValue), Number(monthValue) - 1 + amount, 1));
  return toMonthKey(date);
}

function toMonthKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function todayDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}
