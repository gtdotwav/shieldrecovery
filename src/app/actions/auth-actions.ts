"use server";

import { redirect } from "next/navigation";

import {
  authenticateCredentials,
  isAuthConfigured,
  normalizeNextPath,
} from "@/server/auth/core";
import {
  clearAuthenticatedSession,
  setAuthenticatedSession,
} from "@/server/auth/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const next = normalizeNextPath(String(formData.get("next") ?? "/dashboard"));

  if (!isAuthConfigured()) {
    redirect("/login?error=config");
  }

  const isValid = await authenticateCredentials({ email, password });

  if (!isValid) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  await setAuthenticatedSession(email);
  redirect(next);
}

export async function logoutAction() {
  await clearAuthenticatedSession();
  redirect("/login?logged_out=1");
}
