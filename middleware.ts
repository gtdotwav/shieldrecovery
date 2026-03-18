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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthConfigured()) {
    if (pathname === "/login") {
      return NextResponse.next();
    }

    if (isApiLikePath(pathname)) {
      return NextResponse.json(
        { error: "Platform authentication is not configured." },
        { status: 503 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "config");
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (session) {
    if (!isRoleAllowedForPath(pathname, session.role)) {
      if (isApiLikePath(pathname)) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      return NextResponse.redirect(new URL(defaultPathForRole(session.role), request.url));
    }

    return NextResponse.next();
  }

  if (isApiLikePath(pathname)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
