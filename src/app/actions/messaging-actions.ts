"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getStorageService } from "@/server/recovery/services/storage";
import type { OptOutChannel } from "@/server/recovery/types";

/* ── Opt-out management ── */

export async function addOptOut(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();

  const contactValue = String(formData.get("contactValue") ?? "").trim();
  const channel = String(formData.get("channel") ?? "whatsapp") as OptOutChannel;
  const reason = String(formData.get("reason") ?? "admin_manual");

  if (!contactValue) return;

  await storage.createOptOut({
    channel,
    contactValue,
    reason,
    source: "admin_manual",
  });

  revalidatePath("/admin");
  revalidatePath("/inbox");
}

export async function removeOptOutAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();

  const contactValue = String(formData.get("contactValue") ?? "").trim();
  const channel = String(formData.get("channel") ?? "whatsapp");

  if (!contactValue) return;

  await storage.removeOptOut(channel, contactValue);

  revalidatePath("/admin");
  revalidatePath("/inbox");
}

/* ── Template management ── */

export async function createTemplateAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();

  const name = String(formData.get("name") ?? "").trim();
  const bodyWhatsapp = String(formData.get("bodyWhatsapp") ?? "").trim();

  if (!name || !bodyWhatsapp) return;

  await storage.createMessageTemplate({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    bodyWhatsapp,
    bodySms: String(formData.get("bodySms") ?? "") || undefined,
    bodyEmailText: String(formData.get("bodyEmailText") ?? "") || undefined,
    bodyEmailHtml: String(formData.get("bodyEmailHtml") ?? "") || undefined,
    subject: String(formData.get("subject") ?? "") || undefined,
    category: (String(formData.get("category") ?? "") || "recovery") as "recovery" | "followup" | "notification" | "promotional",
    vertical: (String(formData.get("vertical") ?? "") || "general") as "general" | "ecommerce" | "saas" | "infoproduct",
    channel: String(formData.get("channel") ?? "") || "whatsapp",
    sellerKey: String(formData.get("sellerKey") ?? "") || undefined,
    active: formData.get("active") !== "false",
    variables: (() => {
      const raw = String(formData.get("variables") ?? "");
      try {
        return raw ? JSON.parse(raw) as string[] : undefined;
      } catch {
        return undefined;
      }
    })(),
  });

  revalidatePath("/admin");
}

/* ── A/B Test management ── */

export async function createABTestAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();

  const name = String(formData.get("name") ?? "").trim();
  const templateAId = String(formData.get("templateAId") ?? "").trim();
  const templateBId = String(formData.get("templateBId") ?? "").trim();

  if (!name || !templateAId || !templateBId) return;

  await storage.createABTest({
    name,
    templateAId,
    templateBId,
    channel: String(formData.get("channel") ?? "") || "whatsapp",
    sellerKey: String(formData.get("sellerKey") ?? "") || undefined,
  });

  revalidatePath("/admin");
}

export async function startABTestAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();

  const testId = String(formData.get("testId") ?? "").trim();
  if (!testId) return;

  await storage.updateABTest(testId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  revalidatePath("/admin");
}

export async function completeABTestAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);
  const storage = getStorageService();

  const testId = String(formData.get("testId") ?? "").trim();
  if (!testId) return;

  const test = await storage.getABTest(testId);
  if (!test) return;

  // Determine winner based on conversion rate
  const rateA = test.totalSentA > 0 ? test.totalConvertedA / test.totalSentA : 0;
  const rateB = test.totalSentB > 0 ? test.totalConvertedB / test.totalSentB : 0;
  const winner: "a" | "b" | "tie" =
    Math.abs(rateA - rateB) < 0.02 ? "tie" : rateA > rateB ? "a" : "b";

  await storage.updateABTest(testId, {
    status: "completed",
    completedAt: new Date().toISOString(),
    winner,
  });

  revalidatePath("/admin");
}
