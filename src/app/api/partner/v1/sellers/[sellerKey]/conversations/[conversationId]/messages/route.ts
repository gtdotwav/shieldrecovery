import { NextResponse } from "next/server";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";
import { getStorageService } from "@/server/recovery/services/storage";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ sellerKey: string; conversationId: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const auth = await requirePartnerApiKey(request);
  if (isErrorResponse(auth)) return auth;

  const { sellerKey, conversationId } = await params;

  if (auth.sellerKey && auth.sellerKey !== sellerKey) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "API key not scoped to this seller." } },
      { status: 403 },
    );
  }

  const storage = getStorageService();

  // Verify conversation belongs to this seller
  const conversation = await storage.findConversationById(conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Conversation not found." } },
      { status: 404 },
    );
  }

  const messages = await storage.getConversationMessages(conversationId);

  return NextResponse.json({
    conversation_id: conversationId,
    seller_key: sellerKey,
    customer_name: conversation.customerName,
    channel: conversation.channel,
    contact_value: conversation.contactValue,
    status: conversation.status,
    total_messages: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      channel: m.channel,
      content: m.content,
      status: m.status,
      sender_name: m.senderName,
      sender_address: m.senderAddress,
      created_at: m.createdAt,
      delivered_at: m.deliveredAt,
      read_at: m.readAt,
      error: m.error,
      metadata: m.metadata
        ? {
            payment_url: m.metadata.paymentUrl,
            pix_code: m.metadata.pixCode,
            pix_qr_code: m.metadata.pixQrCode,
            pix_expires_at: m.metadata.pixExpiresAt,
          }
        : undefined,
    })),
  });
}
