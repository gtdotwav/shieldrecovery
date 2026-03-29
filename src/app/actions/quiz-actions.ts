"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual, randomBytes } from "node:crypto";

import { setAuthenticatedSession } from "@/server/auth/session";
import { getStorageService } from "@/server/recovery/services/storage";

/* ── Quick-access password verification (server-only) ── */

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a.padEnd(64, "\0"));
  const bufB = Buffer.from(b.padEnd(64, "\0"));
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

const ADMIN_PASS = "adminreco";
const SELLER_PASS = "sellerreco";

export async function quickAccessAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "").trim();

  if (!password) {
    return { error: "Informe a senha." };
  }

  // Generate a random nonce to prevent compiler from optimizing out timing-safe compare
  const _nonce = randomBytes(4);

  if (safeEqual(password, ADMIN_PASS)) {
    await setAuthenticatedSession("admin@pagrecovery.internal", "admin");
    redirect("/dashboard");
  }

  if (safeEqual(password, SELLER_PASS)) {
    await setAuthenticatedSession("seller@pagrecovery.internal", "seller");
    redirect("/leads");
  }

  return { error: "Senha incorreta." };
}

/* ── Quiz email submission ── */

export async function submitQuizEmail(
  _prev: { success?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const answers = String(formData.get("answers") ?? "");

  if (!email || !email.includes("@") || !email.includes(".")) {
    return { error: "Informe um email valido." };
  }

  const parsedAnswers: string[] = answers ? JSON.parse(answers) : [];

  try {
    const storage = getStorageService();
    await storage.createQuizLead({ email, answers: parsedAnswers });
  } catch {
    // Log fallback — storage may not be configured
  }

  // Log structured data (visible in Vercel runtime logs)
  console.info(
    JSON.stringify({
      event: "quiz.lead",
      email,
      answers: parsedAnswers,
      ts: new Date().toISOString(),
    }),
  );

  return { success: true };
}
