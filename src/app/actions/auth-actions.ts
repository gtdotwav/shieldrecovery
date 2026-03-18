"use server";

import { redirect } from "next/navigation";

import {
  isRoleAllowedForPath,
  isAuthConfigured,
  normalizeNextPath,
} from "@/server/auth/core";
import {
  authenticatePlatformUser,
  registerSellerLogin,
} from "@/server/auth/identities";
import {
  clearAuthenticatedSession,
  setAuthenticatedSession,
} from "@/server/auth/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const requestedNext = String(formData.get("next") ?? "");

  if (!isAuthConfigured()) {
    redirect("/login?error=config");
  }

  const authenticatedUser = await authenticatePlatformUser({ email, password });

  if (!authenticatedUser) {
    const next = normalizeNextPath(requestedNext);
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const next = normalizeNextPath(
    requestedNext,
    authenticatedUser.role,
  );

  await setAuthenticatedSession(authenticatedUser.email, authenticatedUser.role);
  if (authenticatedUser.role === "seller") {
    await registerSellerLogin(authenticatedUser.email);
  }
  redirect(
    isRoleAllowedForPath(next, authenticatedUser.role)
      ? next
      : normalizeNextPath(undefined, authenticatedUser.role),
  );
}

export async function logoutAction() {
  await clearAuthenticatedSession();
  redirect("/login?logged_out=1");
}
