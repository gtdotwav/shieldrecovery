import { NextResponse } from "next/server";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";
import { getStorageService } from "@/server/recovery/services/storage";
import { MessagingService } from "@/server/recovery/services/messaging-service";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ sellerKey: string; conversationId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const auth = await requirePartnerApiKey(request);
  if (isErrorResponse(auth)) return auth;

  const { sellerKey, conversationId } = await params;

  if (auth.sellerKey && auth.sellerKey !== sellerKey) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "API key not scoped to this seller." } },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON." } },
      { status: 400 },
    );
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "content is required." } },
      { status: 400 },
    );
  }

  const storage = getStorageService();
  const conversation = await storage.findConversationById(conversationId);

  if (!conversation) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Conversation not found." } },
      { status: 404 },
    );
  }

  const messaging = new MessagingService();
  const result = await messaging.dispatchOutboundMessage({
    conversation,
    content,
  });

  return NextResponse.json({
    ok: result.status !== "failed",
    conversation_id: conversationId,
    status: result.status,
    provider_message_id: result.providerMessageId,
    error: result.error,
  });
}
