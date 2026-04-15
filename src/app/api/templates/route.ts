import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getStorageService } from "@/server/recovery/services/storage";
import type { MessageTemplateInput } from "@/server/recovery/types";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "seller" && session.role !== "market") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storage = getStorageService();
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? undefined;
  const vertical = url.searchParams.get("vertical") ?? undefined;
  const channel = url.searchParams.get("channel") ?? undefined;
  let effectiveSellerKey = url.searchParams.get("sellerKey") ?? undefined;
  const active = url.searchParams.has("active")
    ? url.searchParams.get("active") === "true"
    : undefined;

  if (session.role === "seller") {
    const identity = await getSellerIdentityByEmail(session.email);
    if (!identity) {
      return NextResponse.json({ error: "Seller not found" }, { status: 403 });
    }
    effectiveSellerKey = identity.agentName;
  }

  const templates = await storage.listMessageTemplates({
    category,
    vertical,
    channel,
    sellerKey: effectiveSellerKey,
    active,
  });

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storage = getStorageService();

  let body: MessageTemplateInput;
  try {
    body = (await request.json()) as MessageTemplateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || !body.bodyWhatsapp) {
    return NextResponse.json(
      { error: "name and bodyWhatsapp are required" },
      { status: 400 },
    );
  }

  const template = await storage.createMessageTemplate(body);
  return NextResponse.json({ template }, { status: 201 });
}
