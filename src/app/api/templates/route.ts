import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getStorageService } from "@/server/recovery/services/storage";
import type { MessageTemplateInput } from "@/server/recovery/types";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin", "seller"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storage = getStorageService();
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? undefined;
  const vertical = url.searchParams.get("vertical") ?? undefined;
  const channel = url.searchParams.get("channel") ?? undefined;
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;
  const active = url.searchParams.has("active")
    ? url.searchParams.get("active") === "true"
    : undefined;

  const templates = await storage.listMessageTemplates({
    category,
    vertical,
    channel,
    sellerKey,
    active,
  });

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
