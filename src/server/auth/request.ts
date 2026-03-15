import { NextResponse } from "next/server";

import { getSessionCookieName, isAuthConfigured, verifySessionToken } from "@/server/auth/core";

function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const target = cookies.find((part) => part.startsWith(`${name}=`));
  return target ? decodeURIComponent(target.slice(name.length + 1)) : null;
}

export async function ensureAuthenticatedRequest(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Platform authentication is not configured." },
      { status: 503 },
    );
  }

  const token = readCookieValue(
    request.headers.get("cookie"),
    getSessionCookieName(),
  );
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}
