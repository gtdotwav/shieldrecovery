import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  normalizeNextPath,
  verifySessionToken,
} from "@/server/auth/core";

export async function getAuthenticatedSession() {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value;
  return verifySessionToken(token);
}

export async function setAuthenticatedSession(email: string) {
  const store = await cookies();
  const token = await createSessionToken(email);

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

export async function requireAuthenticatedSession() {
  const session = await getAuthenticatedSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export function resolvePostLoginPath(input?: string | null) {
  return normalizeNextPath(input);
}
