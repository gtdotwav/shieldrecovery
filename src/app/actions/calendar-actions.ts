"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { CALENDAR_NOTE_LANES, type CalendarNoteLane } from "@/server/recovery/types";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

function isCalendarLane(value: string): value is CalendarNoteLane {
  return (CALENDAR_NOTE_LANES as readonly string[]).includes(value);
}

export async function createCalendarNoteAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const date = String(formData.get("date") ?? "");
  const lane = String(formData.get("lane") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!date || !isCalendarLane(lane) || !title) {
    return;
  }

  await service.createCalendarNote({
    date,
    lane,
    title,
    content: content || undefined,
    createdByEmail: session.email,
    createdByRole: session.role,
  });

  revalidatePath("/calendar");
}

export async function deleteCalendarNoteAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const noteId = String(formData.get("noteId") ?? "");
  const month = String(formData.get("month") ?? "");

  if (!noteId || !month) {
    return;
  }

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
