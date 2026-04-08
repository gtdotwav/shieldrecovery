"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { CALENDAR_NOTE_LANES } from "@/server/recovery/types";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

const createCalendarNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  lane: z.enum(CALENDAR_NOTE_LANES),
  title: z.string().min(1, "Titulo obrigatorio"),
  content: z.string().optional(),
});

const deleteCalendarNoteSchema = z.object({
  noteId: z.string().min(1, "ID da nota obrigatorio"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mes deve estar no formato YYYY-MM"),
});

export async function createCalendarNoteAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller", "market"]);
  const service = getPaymentRecoveryService();

  const parsed = createCalendarNoteSchema.safeParse({
    date: formData.get("date") ?? "",
    lane: formData.get("lane") ?? "",
    title: String(formData.get("title") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return;
  }

  await service.createCalendarNote({
    date: parsed.data.date,
    lane: parsed.data.lane,
    title: parsed.data.title,
    content: parsed.data.content,
    createdByEmail: session.email,
    createdByRole: session.role,
  });

  revalidatePath("/calendar");
}

export async function deleteCalendarNoteAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller", "market"]);
  const service = getPaymentRecoveryService();

  const parsed = deleteCalendarNoteSchema.safeParse({
    noteId: formData.get("noteId") ?? "",
    month: formData.get("month") ?? "",
  });

  if (!parsed.success) {
    return;
  }

  const { noteId, month } = parsed.data;

  const snapshot = await service.getCalendarSnapshot({ month });
  const note = snapshot.notes.find((item) => item.id === noteId);

  if (!note) {
    return;
  }

  if (session.role !== "admin" && note.createdByEmail !== session.email) {
    return;
  }

  await service.deleteCalendarNote(noteId);
  revalidatePath("/calendar");
}
