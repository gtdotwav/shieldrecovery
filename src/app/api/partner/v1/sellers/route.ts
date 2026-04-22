import { NextResponse } from "next/server";

import {
  requirePartnerApiKey,
  isErrorResponse,
} from "@/server/recovery/controllers/partner-api-auth";
import { getStorageService } from "@/server/recovery/services/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePartnerApiKey(request);
  if (isErrorResponse(auth)) return auth;

  const storage = getStorageService();

  // Get all sellers visible to this API key
  const controls = await storage.getSellerAdminControls();
  const analytics = await storage.getAnalytics();

  // If the API key is scoped to a seller, filter
  const filtered = auth.sellerKey
    ? controls.filter((c) => c.sellerKey === auth.sellerKey)
    : controls;

  const sellers = await Promise.all(
    filtered.map(async (control) => {
      const sellerAnalytics = await storage.getAnalytics(control.sellerName);
      const contacts = await storage.getFollowUpContacts(control.sellerName);
      const conversations = await storage.getInboxConversations(control.sellerName);

      return {
        seller_key: control.sellerKey,
        seller_name: control.sellerName,
        active: control.active,
        stats: {
          total_failed: sellerAnalytics.total_failed_payments,
          recovered: sellerAnalytics.recovered_payments,
          recovery_rate: sellerAnalytics.recovery_rate,
          recovered_revenue: sellerAnalytics.recovered_revenue,
          active_leads: sellerAnalytics.active_recoveries,
          avg_recovery_hours: sellerAnalytics.average_recovery_time_hours,
        },
        leads_count: contacts.length,
        conversations_count: conversations.length,
        unread_messages: conversations.reduce((s, c) => s + c.unread_count, 0),
      };
    }),
  );

  return NextResponse.json({ sellers });
}
