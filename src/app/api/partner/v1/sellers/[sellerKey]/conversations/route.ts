import { NextResponse } from "next/server";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";
import { getStorageService } from "@/server/recovery/services/storage";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ sellerKey: string }> };

export async function GET(request: Request, { params }: RouteProps) {
  const auth = await requirePartnerApiKey(request);
  if (isErrorResponse(auth)) return auth;

  const { sellerKey } = await params;

  if (auth.sellerKey && auth.sellerKey !== sellerKey) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "API key not scoped to this seller." } },
      { status: 403 },
    );
  }

  const storage = getStorageService();
  const controls = await storage.getSellerAdminControls();
  const control = controls.find((c) => c.sellerKey === sellerKey);

  if (!control) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Seller not found." } },
      { status: 404 },
    );
  }

  const conversations = await storage.getInboxConversations(control.sellerName);

  return NextResponse.json({
    seller_key: sellerKey,
    total: conversations.length,
    unread_total: conversations.reduce((s, c) => s + c.unread_count, 0),
    conversations: conversations.map((c) => ({
      conversation_id: c.conversation_id,
      lead_id: c.lead_id,
      customer_name: c.customer_name,
      channel: c.channel,
      contact_value: c.contact_value,
      status: c.status,
      last_message: c.last_message_preview,
      last_message_at: c.last_message_at,
      unread_count: c.unread_count,
      message_count: c.message_count,
    })),
  });
}
