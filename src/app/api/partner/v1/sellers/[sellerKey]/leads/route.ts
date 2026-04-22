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

  const contacts = await storage.getFollowUpContacts(control.sellerName);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const filtered = status
    ? contacts.filter((c) => c.lead_status === status)
    : contacts;

  return NextResponse.json({
    seller_key: sellerKey,
    total: filtered.length,
    leads: filtered.map((c) => ({
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
      assigned_agent: c.assigned_agent,
      created_at: c.created_at,
      updated_at: c.updated_at,
    })),
  });
}
