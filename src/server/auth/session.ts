import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSessionToken,
  defaultPathForRole,
  getSessionCookieName,
  getSessionTtlSeconds,
  normalizeNextPath,
  type UserRole,
  verifySessionToken,
} from "@/server/auth/core";

export async function getAuthenticatedSession() {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value;
  return verifySessionToken(token);
}

export async function setAuthenticatedSession(email: string, role: UserRole) {
  const store = await cookies();
  const token = await createSessionToken(email, role);

  store.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionTtlSeconds(),
  });
}

export async function clearAuthenticatedSession() {
  const store = await cookies();
  store.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAuthenticatedSession(allowedRoles?: UserRole[]) {
  const session = await getAuthenticatedSession();

  if (!session) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    redirect(defaultPathForRole(session.role));
  }

  return session;
}

export function resolvePostLoginPath(input?: string | null, role?: UserRole) {
  return normalizeNextPath(input, role);
}
