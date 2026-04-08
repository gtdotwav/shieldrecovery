"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, NotebookPen } from "lucide-react";
import {
  createCalendarNoteAction,
  deleteCalendarNoteAction,
} from "@/app/actions/calendar-actions";
import { cn } from "@/lib/utils";

type LaneConfig = {
  key: string;
  title: string;
  dot: string;
};

type NoteData = {
  id: string;
  title: string;
  content?: string;
  lane: string;
  createdByEmail: string;
  createdByRole: string;
  updatedAt: string;
};

function formatClock(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function CalendarNoteDialog({
  dateLabel,
  date,
  month,
  notes,
  lanes,
  currentUserEmail,
  currentUserRole,
}: {
  dateLabel: string;
  date: string;
  month: string;
  notes: NoteData[];
  lanes: LaneConfig[];
  currentUserEmail: string;
  currentUserRole: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  const groupedByLane = lanes
    .map((lane) => ({
      ...lane,
      notes: notes.filter((n) => n.lane === lane.key),
    }))
    .filter((g) => g.notes.length > 0);

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
          "border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]",
          "hover:border-[var(--accent)]/40 hover:shadow-sm",
          "text-gray-700 dark:text-gray-300",
        )}
      >
        <NotebookPen className="h-4 w-4 text-amber-500" />
        <span>{notes.length}</span>
        <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
          {notes.length === 1 ? "nota" : "notas"}
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          {/* Card */}
          <div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative z-10 w-full max-w-lg rounded-2xl shadow-2xl",
              "border border-gray-200 dark:border-gray-800",
              "bg-white dark:bg-[#161616]",
              "animate-in fade-in slide-in-from-bottom-3 duration-200",
              "max-h-[75vh] flex flex-col",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-amber-500">
                  Notas
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">
                  {dateLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Add note form */}
              <form
                ref={formRef}
                action={async (formData) => {
                  await createCalendarNoteAction(formData);
                  formRef.current?.reset();
                }}
              >
                <input type="hidden" name="date" value={date} />

                <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#111]/50 p-3.5">
                  <div className="grid gap-2.5 sm:grid-cols-[1fr_2fr]">
                    <select
                      name="lane"
                      defaultValue="operations"
                      className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-2.5 text-[0.78rem] text-gray-700 dark:text-gray-300 outline-none transition focus:border-[var(--accent)]/40"
                    >
                      {lanes.map((lane) => (
                        <option key={lane.key} value={lane.key}>
                          {lane.title}
                        </option>
                      ))}
                    </select>

                    <input
                      name="title"
                      type="text"
                      placeholder="Título da nota..."
                      required
                      className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-3 text-[0.78rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none transition focus:border-[var(--accent)]/40"
                    />
                  </div>

                  <textarea
                    name="content"
                    rows={2}
                    placeholder="Contexto adicional..."
                    className="mt-2.5 w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-[0.78rem] leading-relaxed text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none transition focus:border-[var(--accent)]/40"
                  />

                  <div className="mt-2.5 flex justify-end">
                    <button
                      type="submit"
                      className="glass-button-primary inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.72rem] font-semibold"
                    >
                      <Plus className="h-3 w-3" />
                      Salvar
                    </button>
                  </div>
                </div>
              </form>

              {/* Notes grouped by lane */}
              {groupedByLane.length > 0 ? (
                groupedByLane.map((group) => (
                  <div key={group.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("h-1.5 w-1.5 rounded-full", group.dot)} />
                      <h4 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                        {group.title}
                      </h4>
                      <span className="ml-auto rounded px-1.5 py-0.5 text-[0.58rem] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800">
                        {group.notes.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {group.notes.map((note) => {
                        const canDelete =
                          currentUserRole === "admin" ||
                          note.createdByEmail === currentUserEmail;

                        return (
                          <div
                            key={note.id}
                            className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#111]/50 px-3.5 py-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[0.82rem] font-semibold text-gray-800 dark:text-gray-200">
                                  {note.title}
                                </p>
                                {note.content ? (
                                  <p className="mt-1 text-[0.78rem] leading-relaxed text-gray-500 dark:text-gray-400">
                                    {note.content}
                                  </p>
                                ) : null}
                              </div>
                              {canDelete ? (
                                <form action={deleteCalendarNoteAction}>
                                  <input type="hidden" name="noteId" value={note.id} />
                                  <input type="hidden" name="month" value={month} />
                                  <button
                                    type="submit"
                                    className="shrink-0 rounded-md px-2 py-1 text-[0.65rem] font-medium text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                  >
                                    remover
                                  </button>
                                </form>
                              ) : null}
                            </div>
                            <p className="mt-2 font-mono text-[0.58rem] text-gray-300 dark:text-gray-600">
                              {note.createdByRole} · {note.createdByEmail} · {formatClock(note.updatedAt)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <NotebookPen className="mx-auto h-6 w-6 text-gray-200 dark:text-gray-700" />
                  <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                    Nenhuma nota neste dia.
                  </p>
                  <p className="mt-0.5 text-xs text-gray-300 dark:text-gray-600">
                    Use o formulário acima para adicionar.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
