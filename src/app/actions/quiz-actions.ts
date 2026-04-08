"use server";

import { getStorageService } from "@/server/recovery/services/storage";

/* ── Quiz email submission ── */

export async function submitQuizEmail(
  _prev: { success?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const answers = String(formData.get("answers") ?? "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um email valido." };
  }

  let parsedAnswers: string[] = [];
  if (answers) {
    try {
      const parsed = JSON.parse(answers);
      if (Array.isArray(parsed)) {
        parsedAnswers = parsed.map(String);
      }
    } catch {
      return { error: "Respostas inválidas." };
    }
  }

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
