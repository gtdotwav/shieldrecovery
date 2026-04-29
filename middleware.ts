import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  defaultPathForRole,
  getSessionCookieName,
  isRoleAllowedForPath,
  isApiLikePath,
  isAuthConfigured,
  isProtectedPath,
  verifySessionToken,
} from "@/server/auth/core";

function buildCsp(nonce: string): string {
  // Modern browsers honour 'strict-dynamic' + nonce and ignore 'unsafe-inline';
  // older browsers fall back to 'unsafe-inline' so the page never breaks.
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://graph.facebook.com https://api.vapi.ai https://api.elevenlabs.io wss://*.elevenlabs.io https://*.sentry.io https://*.ingest.sentry.io",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  return directives.join("; ");
}

function generateNonce(): string {
  // Edge-runtime safe: use Web Crypto for 16 bytes of randomness.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=+$/g, "");
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const next = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  next.headers.set("x-nonce", nonce);
  next.headers.set("Content-Security-Policy", buildCsp(nonce));

  if (!isProtectedPath(pathname)) {
    return next;
  }

  if (!isAuthConfigured()) {
    if (pathname === "/login") return next;

    if (isApiLikePath(pathname)) {
      const res = NextResponse.json(
        { error: "Platform authentication is not configured." },
        { status: 503 },
      );
      res.headers.set("Content-Security-Policy", buildCsp(nonce));
      return res;
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "config");
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set("Content-Security-Policy", buildCsp(nonce));
    return redirect;
  }

  const bearerToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearerToken?.startsWith("sk_live_") || bearerToken?.startsWith("sk_test_")) {
    return next;
  }

  const cookieToken = request.cookies.get(getSessionCookieName())?.value;
  const token = bearerToken ?? cookieToken;
  const session = await verifySessionToken(token);

  if (session) {
    if (!isRoleAllowedForPath(pathname, session.role)) {
      if (isApiLikePath(pathname)) {
        const res = NextResponse.json({ error: "Forbidden." }, { status: 403 });
        res.headers.set("Content-Security-Policy", buildCsp(nonce));
        return res;
      }

      const redirect = NextResponse.redirect(new URL(defaultPathForRole(session.role), request.url));
      redirect.headers.set("Content-Security-Policy", buildCsp(nonce));
      return redirect;
    }

    return next;
  }

  if (isApiLikePath(pathname)) {
    const res = NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    res.headers.set("Content-Security-Policy", buildCsp(nonce));
    return res;
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  const redirect = NextResponse.redirect(loginUrl);
  redirect.headers.set("Content-Security-Policy", buildCsp(nonce));
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
