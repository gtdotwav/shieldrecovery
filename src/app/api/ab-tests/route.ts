import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getStorageService } from "@/server/recovery/services/storage";
import type { ABTestInput } from "@/server/recovery/types";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storage = getStorageService();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const sellerKey = url.searchParams.get("sellerKey") ?? undefined;

  const tests = await storage.listABTests({ status, sellerKey });
  return NextResponse.json({ tests });
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession(["admin"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storage = getStorageService();

  let body: ABTestInput;
  try {
    body = (await request.json()) as ABTestInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || !body.templateAId || !body.templateBId) {
    return NextResponse.json(
      { error: "name, templateAId, and templateBId are required" },
      { status: 400 },
    );
  }

  const test = await storage.createABTest(body);
  return NextResponse.json({ test }, { status: 201 });
}
