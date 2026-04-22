import { NextResponse } from "next/server";

import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";
import { verifyPlatformPassword } from "@/server/auth/passwords";
import { createSessionToken } from "@/server/auth/core";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON." } },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "email and password required." } },
      { status: 400 },
    );
  }

  const storage = getPartnerStorageService();
  const user = await storage.findUserByEmail(email);

  if (!user || !user.active) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid credentials." } },
      { status: 401 },
    );
  }

  if (!verifyPlatformPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid credentials." } },
      { status: 401 },
    );
  }

  const profile = await storage.getProfile(user.partnerId);
  const token = await createSessionToken(email, "partner", user.partnerId);

  await storage.touchUserLogin(email);

  return NextResponse.json({
    ok: true,
    token,
    partner: {
      id: user.partnerId,
      name: profile?.name,
      slug: profile?.slug,
    },
  });
}
