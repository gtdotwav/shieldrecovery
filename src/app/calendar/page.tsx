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
  PlatformAppPage,
  PlatformInset,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { CalendarNoteDialog } from "@/components/ui/calendar-note-dialog";
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
} from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendário",
};

type SearchParamValue = string | string[] | undefined;

type CalendarPageProps = {
  searchParams?: Promise<{
    month?: SearchParamValue;
    date?: SearchParamValue;
  }>;
};

const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const laneConfig: Array<{
  key: CalendarNoteLane;
  title: string;
  icon: string;
  color: string;
  dot: string;
}> = [
  {
    key: "operations",
    title: "Operação",
    icon: "ops",
    color: "text-blue-500",
    dot: "bg-blue-500",
  },
  {
    key: "automations",
    title: "Automações",
    icon: "auto",
    color: "text-purple-500",
    dot: "bg-purple-500",
  },
  {
    key: "revenue",
    title: "Receita",
    icon: "rev",
    color: "text-emerald-500",
    dot: "bg-emerald-500",
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
    .slice(0, 24);
  const selectedNotes = snapshot.notes.filter((note) => note.date === selectedDate);
  const selectedMessages = selectedDay.outboundMessages + selectedDay.inboundMessages;
  const monthRecoveredRevenue = snapshot.days.reduce(
    (sum, day) => sum + day.recoveredRevenue,
    0,
  );
  const monthRecoveredCount = snapshot.days.reduce(
    (sum, day) => sum + day.recoveredCount,
    0,
  );
  const monthLabel = formatMonthLabel(snapshot.month);
  const monthCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const prevMonth = shiftMonth(snapshot.month, -1);
  const nextMonth = shiftMonth(snapshot.month, 1);
  const today = todayDateKey();
  const grid = buildCalendarGrid(snapshot.days, snapshot.month);
  const movementDays = snapshot.days.filter(hasDayMovement).length;
  const totalMessages = snapshot.days.reduce(
    (sum, day) => sum + day.outboundMessages + day.inboundMessages,
    0,
  );
  const totalAutomations = snapshot.days.reduce(
    (sum, day) => sum + day.automationJobs,
    0,
  );

  const maxDayRevenue = Math.max(
    ...snapshot.days.map((day) => day.recoveredRevenue),
    1,
  );

  return (
    <PlatformAppPage currentPath="/calendar">
      {/* ── Header row: month navigation + KPIs ── */}
      <PlatformSurface className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Month nav */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Link
                href={`/calendar?month=${prevMonth}`}
                className="glass-button-secondary flex h-9 w-9 items-center justify-center rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={`/calendar?month=${nextMonth}`}
                className="glass-button-secondary flex h-9 w-9 items-center justify-center rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div>
              <h2 className="text-[1.65rem] font-semibold tracking-tight text-gray-900 dark:text-white">
                {monthCapitalized}
              </h2>
              <p className="text-[0.78rem] text-gray-500 dark:text-gray-400">
                {movementDays} dias ativos · {formatShortDate(selectedDate)} selecionado
              </p>
            </div>

            <Link
              href={`/calendar?month=${toMonthKey(new Date())}&date=${today}`}
              className="muted-pill ml-1 hidden rounded-md px-2.5 py-1 text-[0.68rem] font-medium transition-all hover:border-[var(--accent-soft)] hover:text-[var(--accent)] sm:inline-flex"
            >
              Hoje
            </Link>
          </div>

          {/* KPI strip */}
          <div className="flex flex-wrap gap-2.5">
            <KpiBadge
              icon={Wallet}
              label="Recuperado"
              value={formatCurrency(monthRecoveredRevenue)}
              highlight
            />
            <KpiBadge
              icon={CalendarDays}
              label="Recuperações"
              value={String(monthRecoveredCount)}
            />
            <KpiBadge
              icon={MessageCircleMore}
              label="Mensagens"
              value={String(totalMessages)}
            />
            <KpiBadge
              icon={Bot}
              label="Automações"
              value={String(totalAutomations)}
            />
          </div>
        </div>
      </PlatformSurface>

      {/* ── Calendar grid ── */}
      <PlatformSurface className="mt-3 p-3 sm:p-4">
        <div className="overflow-x-auto">
          <div className="min-w-[54rem]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7">
              {weekdayLabels.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "pb-2.5 text-center text-[0.62rem] font-semibold uppercase tracking-[0.2em]",
                    i >= 5
                      ? "text-gray-300 dark:text-gray-600"
                      : "text-gray-400 dark:text-gray-500",
                  )}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-200 dark:bg-gray-800">
              {grid.map((cell, index) =>
                cell ? (
                  <DayCell
                    key={cell.date}
                    cell={cell}
                    month={snapshot.month}
                    isSelected={cell.date === selectedDate}
                    isToday={cell.date === today}
                    isWeekend={index % 7 >= 5}
                    maxRevenue={maxDayRevenue}
                  />
                ) : (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[6.5rem] bg-gray-50/50 dark:bg-[#0f0f0f]"
                  />
                ),
              )}
            </div>

            {/* Legend */}
            <div className="mt-2.5 flex items-center gap-5 px-1">
              <div className="flex items-center gap-3 text-[0.62rem] text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Recuperação
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Mensagens
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> Automação
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Notas
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-[0.58rem] text-gray-300 dark:text-gray-600">
                <span>baixo</span>
                <div className="flex gap-0.5">
                  {[0.06, 0.12, 0.2, 0.3, 0.45].map((opacity) => (
                    <span
                      key={opacity}
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: `rgba(var(--accent-rgb, 249,115,22), ${opacity})` }}
                    />
                  ))}
                </div>
                <span>alto</span>
              </div>
            </div>
          </div>
        </div>
      </PlatformSurface>

      {/* ── Selected day detail ── */}
      <PlatformSurface className="mt-3 p-5 sm:p-6">
        {/* Date header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Dia selecionado
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                {formatFullDate(selectedDate)}
              </h3>
            </div>
            {selectedDate === today ? (
              <span className="success-pill rounded-md px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                Hoje
              </span>
            ) : null}
          </div>

          {/* Notes dialog trigger */}
          <CalendarNoteDialog
            dateLabel={formatFullDate(selectedDate)}
            date={selectedDate}
            month={snapshot.month}
            notes={selectedNotes}
            lanes={laneConfig.map(({ key, title, dot }) => ({ key, title, dot }))}
            currentUserEmail={session.email}
            currentUserRole={session.role}
          />
        </div>

        {/* KPI row */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <DayMetric
            icon={Wallet}
            label="Recuperado"
            value={formatCurrency(selectedDay.recoveredRevenue)}
            detail={`${selectedDay.recoveredCount} operações`}
            accent
          />
          <DayMetric
            icon={MessageCircleMore}
            label="Mensagens"
            value={String(selectedMessages)}
            detail={`${selectedDay.outboundMessages} env · ${selectedDay.inboundMessages} rec`}
          />
          <DayMetric
            icon={Bot}
            label="Automações"
            value={String(selectedDay.automationJobs)}
            detail="jobs executados"
          />
          <DayMetric
            icon={NotebookPen}
            label="Notas"
            value={String(selectedNotes.length)}
            detail="registros salvos"
          />
        </div>

        {/* Timeline */}
        <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
              Timeline
            </h4>
            <span className="muted-pill rounded-md px-2 py-0.5 text-[0.62rem] font-medium">
              {selectedActivities.length}
            </span>
          </div>

          {selectedActivities.length === 0 ? (
            <PlatformInset className="mt-3 px-4 py-6 text-center">
              <CalendarDays className="mx-auto h-5 w-5 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                Nenhuma atividade neste dia.
              </p>
            </PlatformInset>
          ) : (
            <div className="relative mt-3">
              {/* Vertical connector */}
              <div className="absolute left-[1.05rem] top-3 bottom-3 w-px bg-gray-100 dark:bg-gray-800" />

              <div className="space-y-0.5">
                {selectedActivities.map((activity, i) => (
                  <TimelineRow
                    key={activity.id}
                    activity={activity}
                    isFirst={i === 0}
                    isLast={i === selectedActivities.length - 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PlatformSurface>
    </PlatformAppPage>
  );
}

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

function KpiBadge({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-inset flex items-center gap-2.5 rounded-xl px-3.5 py-2.5",
        highlight && "border-[var(--accent-soft)]",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          highlight
            ? "bg-[var(--accent)]/10 text-[var(--accent)]"
            : "bg-white dark:bg-[#1a1a1a] text-gray-400 dark:text-gray-500",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            highlight ? "text-[var(--accent)]" : "text-gray-900 dark:text-white",
          )}
        >
          {value}
        </p>
        <p className="text-[0.58rem] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ── Calendar day cell ── */

function DayCell({
  cell,
  month,
  isSelected,
  isToday,
  isWeekend,
  maxRevenue,
}: {
  cell: CalendarDaySummary;
  month: string;
  isSelected: boolean;
  isToday: boolean;
  isWeekend: boolean;
  maxRevenue: number;
}) {
  const hasMovement = hasDayMovement(cell);
  const intensity = cell.recoveredRevenue > 0
    ? Math.max(0.05, (cell.recoveredRevenue / maxRevenue) * 0.35)
    : 0;

  return (
    <Link
      href={`/calendar?month=${month}&date=${cell.date}`}
      className={cn(
        "group relative flex min-h-[6.5rem] flex-col p-2.5 transition-all duration-150",
        isSelected
          ? "z-10 bg-white dark:bg-[#1a1a1a] shadow-[inset_0_0_0_2px_var(--accent)]"
          : isWeekend
            ? "bg-gray-50 dark:bg-[#0f0f0f] hover:bg-white dark:hover:bg-[#151515]"
            : "bg-white dark:bg-[#141414] hover:bg-gray-50/50 dark:hover:bg-[#181818]",
      )}
      style={
        intensity > 0 && !isSelected
          ? { background: `rgba(var(--accent-rgb, 249,115,22), ${intensity})` }
          : undefined
      }
    >
      {/* Day number */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-[0.78rem] font-semibold leading-none",
            isToday
              ? "bg-[var(--accent)] text-white shadow-sm"
              : isSelected
                ? "text-[var(--accent)]"
                : "text-gray-700 dark:text-gray-300",
          )}
        >
          {readDayNumber(cell.date)}
        </span>

        {/* Micro-dots */}
        <div className="flex items-center gap-0.5">
          {cell.outboundMessages + cell.inboundMessages > 0 ? (
            <span className="h-1 w-1 rounded-full bg-blue-400" />
          ) : null}
          {cell.automationJobs > 0 ? (
            <span className="h-1 w-1 rounded-full bg-purple-400" />
          ) : null}
          {cell.notesCount > 0 ? (
            <span className="h-1 w-1 rounded-full bg-amber-400" />
          ) : null}
        </div>
      </div>

      {/* Revenue / status */}
      <div className="mt-auto">
        {cell.recoveredRevenue > 0 ? (
          <>
            <p className="text-[0.78rem] font-bold tabular-nums text-[var(--accent)]">
              {formatCompactCurrency(cell.recoveredRevenue)}
            </p>
            <p className="text-[0.58rem] text-gray-400 dark:text-gray-500">
              {cell.recoveredCount} rec
            </p>
          </>
        ) : hasMovement ? (
          <p className="text-[0.62rem] text-gray-400 dark:text-gray-500">
            {getCompactDescription(cell)}
          </p>
        ) : (
          <p className="text-[0.62rem] text-gray-300 dark:text-gray-700">—</p>
        )}
      </div>

      {/* Hover hint */}
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

/* ── Day detail KPI card ── */

function DayMetric({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-inset rounded-xl p-3.5">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            accent ? "text-[var(--accent)]" : "text-gray-400 dark:text-gray-500",
          )}
        />
        <span className="text-[0.62rem] font-medium uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "mt-2.5 text-[1.35rem] font-semibold tabular-nums tracking-tight",
          accent ? "text-[var(--accent)]" : "text-gray-900 dark:text-white",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[0.68rem] text-gray-400 dark:text-gray-500">{detail}</p>
    </div>
  );
}

/* ── Timeline row ── */

function TimelineRow({
  activity,
  isFirst,
  isLast,
}: {
  activity: CalendarActivityItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="group relative flex gap-3 py-2 pl-1">
      {/* Dot on the timeline */}
      <div className="relative z-10 mt-1.5 flex h-[0.55rem] w-[0.55rem] shrink-0 items-center justify-center">
        <span className="h-[0.45rem] w-[0.45rem] rounded-full bg-gray-300 transition-colors group-hover:bg-[var(--accent)] dark:bg-gray-600" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#111111]/50 px-3.5 py-2.5 transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-700 group-hover:bg-gray-50 dark:group-hover:bg-[#111111]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[0.78rem] font-medium text-gray-800 dark:text-gray-200">
              {activity.title}
            </p>
            <p className="mt-0.5 text-[0.72rem] leading-relaxed text-gray-500 dark:text-gray-400">
              {activity.detail}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[0.62rem] tabular-nums text-gray-400 dark:text-gray-500">
              {formatClock(activity.at)}
            </span>
            {activity.href ? (
              <Link
                href={activity.href}
                className="flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-colors hover:text-[var(--accent)] dark:text-gray-600"
              >
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════ */

function readSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeMonthParam(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return toMonthKey(new Date());
}

function resolveSelectedDate(
  value: string | undefined,
  month: string,
  days: CalendarDaySummary[],
) {
  const daySet = new Set(days.map((day) => day.date));
  if (value && daySet.has(value)) return value;
  const today = todayDateKey();
  if (today.startsWith(month) && daySet.has(today)) return today;
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

function getCompactDescription(day: CalendarDaySummary) {
  const parts: string[] = [];
  if (day.newLeads > 0) parts.push(`${day.newLeads} lead${day.newLeads > 1 ? "s" : ""}`);
  const msgs = day.outboundMessages + day.inboundMessages;
  if (msgs > 0) parts.push(`${msgs} msg`);
  if (day.automationJobs > 0) parts.push(`${day.automationJobs} job${day.automationJobs > 1 ? "s" : ""}`);
  if (day.notesCount > 0) parts.push(`${day.notesCount} nota${day.notesCount > 1 ? "s" : ""}`);
  return parts.join(" · ") || "Atividade";
}

function formatMonthLabel(month: string) {
  const [yearValue, monthValue] = month.split("-");
  const date = new Date(Date.UTC(Number(yearValue), Number(monthValue) - 1, 1, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(`${date}T12:00:00.000Z`),
  );
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
  }).format(value / 100);
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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
