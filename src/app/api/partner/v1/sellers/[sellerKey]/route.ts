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

  // Scope check
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

  const [analytics, contacts, conversations] = await Promise.all([
    storage.getAnalytics(control.sellerName),
    storage.getFollowUpContacts(control.sellerName),
    storage.getInboxConversations(control.sellerName),
  ]);

  return NextResponse.json({
    seller: {
      seller_key: control.sellerKey,
      seller_name: control.sellerName,
      active: control.active,
      gateway_slug: control.gatewaySlug,
    },
    stats: {
      total_failed: analytics.total_failed_payments,
      recovered: analytics.recovered_payments,
      recovery_rate: analytics.recovery_rate,
      recovered_revenue: analytics.recovered_revenue,
      active_leads: analytics.active_recoveries,
      avg_recovery_hours: analytics.average_recovery_time_hours,
    },
    leads: contacts.map((c) => ({
      lead_id: c.lead_id,
      customer_name: c.customer_name,
      email: c.email,
      phone: c.phone,
      product: c.product,
      amount: c.payment_value,
      payment_status: c.payment_status,
      payment_method: c.payment_method,
      lead_status: c.lead_status,
      order_id: c.order_id,
      gateway_payment_id: c.gateway_payment_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
    })),
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
