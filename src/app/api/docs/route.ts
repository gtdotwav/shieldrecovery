import { NextResponse } from "next/server";

export const dynamic = "force-static";

const endpoints = [
  // Auth
  {
    path: "/api/auth/token",
    method: "POST",
    description: "Authenticate user and return session token",
    auth_required: false,
  },

  // Admin
  {
    path: "/api/admin/sellers",
    method: "GET",
    description: "List all sellers",
    auth_required: true,
  },
  {
    path: "/api/admin/sellers/:key/controls",
    method: "GET | PUT",
    description: "Get or update seller admin controls",
    auth_required: true,
  },
  {
    path: "/api/admin/invites",
    method: "GET | POST",
    description: "List or create seller invites",
    auth_required: true,
  },
  {
    path: "/api/admin/snapshot",
    method: "GET",
    description: "Get admin dashboard snapshot (queue, leads, analytics)",
    auth_required: true,
  },

  // Webhooks
  {
    path: "/api/webhooks/shield-gateway",
    method: "POST",
    description: "Receive Shield Gateway payment webhooks",
    auth_required: false,
  },
  {
    path: "/api/webhooks/shield-gateway/:sellerKey",
    method: "POST",
    description: "Receive Shield Gateway webhooks for a specific seller",
    auth_required: false,
  },
  {
    path: "/api/webhooks/pagouai",
    method: "POST",
    description: "Receive PagouAi payment webhooks",
    auth_required: false,
  },
  {
    path: "/api/webhooks/pagouai/:sellerKey",
    method: "POST",
    description: "Receive PagouAi webhooks for a specific seller",
    auth_required: false,
  },
  {
    path: "/api/webhooks/pagnet/:sellerKey",
    method: "POST",
    description: "Receive PagNet payment webhooks for a specific seller",
    auth_required: false,
  },
  {
    path: "/api/webhooks/buckpay",
    method: "POST",
    description: "Receive BuckPay payment webhooks",
    auth_required: false,
  },
  {
    path: "/api/webhooks/buckpay/:sellerKey",
    method: "POST",
    description: "Receive BuckPay webhooks for a specific seller",
    auth_required: false,
  },
  {
    path: "/api/webhooks/whatsapp",
    method: "GET | POST",
    description: "WhatsApp Cloud API webhook (verify + receive messages)",
    auth_required: false,
  },
  {
    path: "/api/webhooks/callcenter",
    method: "POST",
    description: "VAPI call center event webhooks",
    auth_required: false,
  },
  {
    path: "/api/webhooks/superpay/:sellerKey",
    method: "POST",
    description: "Receive SuperPay payment webhooks for a specific seller",
    auth_required: false,
  },

  // Worker
  {
    path: "/api/worker/run",
    method: "GET",
    description: "Process queued recovery jobs (cron, requires CRON_SECRET)",
    auth_required: true,
  },

  // Agent
  {
    path: "/api/agent/orchestrate",
    method: "GET",
    description: "Run autonomous recovery agent lifecycle (cron, requires CRON_SECRET)",
    auth_required: true,
  },

  // Health
  {
    path: "/api/health",
    method: "GET",
    description: "Health check endpoint",
    auth_required: true,
  },

  // Leads
  {
    path: "/api/leads",
    method: "GET",
    description: "List recovery leads with filters",
    auth_required: true,
  },
  {
    path: "/api/leads/:id",
    method: "GET | PATCH",
    description: "Get or update a specific lead",
    auth_required: true,
  },
  {
    path: "/api/leads/:id/transition",
    method: "POST",
    description: "Transition lead to a new status",
    auth_required: true,
  },

  // Inbox
  {
    path: "/api/inbox",
    method: "GET",
    description: "List conversations in the messaging inbox",
    auth_required: true,
  },
  {
    path: "/api/inbox/:id",
    method: "GET | PATCH",
    description: "Get or update a conversation",
    auth_required: true,
  },
  {
    path: "/api/inbox/:id/reply",
    method: "POST",
    description: "Send a reply in a conversation",
    auth_required: true,
  },
  {
    path: "/api/inbox/:id/ai-reply",
    method: "POST",
    description: "Generate and send an AI-powered reply",
    auth_required: true,
  },
  {
    path: "/api/inbox/:id/status",
    method: "PUT",
    description: "Update conversation status (open/closed/pending)",
    auth_required: true,
  },

  // Dashboard
  {
    path: "/api/dashboard",
    method: "GET",
    description: "Get dashboard analytics and metrics",
    auth_required: true,
  },

  // Analytics
  {
    path: "/api/analytics/recovery",
    method: "GET",
    description: "Get recovery analytics data",
    auth_required: true,
  },

  // Calls
  {
    path: "/api/calls",
    method: "GET | POST",
    description: "List or initiate voice calls",
    auth_required: true,
  },
  {
    path: "/api/calls/:callId",
    method: "GET",
    description: "Get call details",
    auth_required: true,
  },
  {
    path: "/api/calls/stats",
    method: "GET",
    description: "Get call center statistics",
    auth_required: true,
  },
  {
    path: "/api/calls/campaigns",
    method: "GET | POST",
    description: "List or create call campaigns",
    auth_required: true,
  },
  {
    path: "/api/calls/demo",
    method: "POST",
    description: "Initiate a demo call to a prospect (public)",
    auth_required: false,
  },

  // Checkout
  {
    path: "/api/checkout/session",
    method: "POST",
    description: "Create a checkout session",
    auth_required: false,
  },
  {
    path: "/api/checkout/session/:shortId",
    method: "GET",
    description: "Get checkout session by short ID",
    auth_required: false,
  },
  {
    path: "/api/checkout/process",
    method: "POST",
    description: "Process a checkout payment",
    auth_required: false,
  },
  {
    path: "/api/checkout/webhook/:providerSlug",
    method: "POST",
    description: "Checkout payment provider webhook",
    auth_required: false,
  },

  // Settings
  {
    path: "/api/settings/connections",
    method: "GET | PUT",
    description: "Get or update connection settings (WhatsApp, email, etc.)",
    auth_required: true,
  },

  // Debug
  {
    path: "/api/debug/process-webhook",
    method: "GET",
    description: "Debug tool to inspect or reprocess a webhook (requires CRON_SECRET)",
    auth_required: true,
  },

  // Push notifications
  {
    path: "/api/push/register",
    method: "POST",
    description: "Register a push notification token",
    auth_required: true,
  },
  {
    path: "/api/push/unregister",
    method: "POST",
    description: "Unregister a push notification token",
    auth_required: true,
  },

  // Mobile
  {
    path: "/api/mobile/dashboard",
    method: "GET",
    description: "Mobile dashboard data",
    auth_required: true,
  },
  {
    path: "/api/mobile/leads",
    method: "GET",
    description: "Mobile leads list",
    auth_required: true,
  },
  {
    path: "/api/mobile/wallet",
    method: "GET",
    description: "Mobile wallet balance and history",
    auth_required: true,
  },
  {
    path: "/api/mobile/payouts",
    method: "GET | POST",
    description: "Mobile payout history and withdrawal",
    auth_required: true,
  },
  {
    path: "/api/mobile/pix-accounts",
    method: "GET | POST | DELETE",
    description: "Manage PIX accounts for payouts",
    auth_required: true,
  },
  {
    path: "/api/mobile/splits",
    method: "GET",
    description: "Mobile split fee details",
    auth_required: true,
  },
  {
    path: "/api/mobile/chat",
    method: "POST",
    description: "Mobile AI chat assistant",
    auth_required: true,
  },

  // Misc
  {
    path: "/api/ab-tests",
    method: "GET | POST",
    description: "List or create A/B tests",
    auth_required: true,
  },
  {
    path: "/api/templates",
    method: "GET | POST",
    description: "List or create message templates",
    auth_required: true,
  },
  {
    path: "/api/funnel",
    method: "GET",
    description: "Get recovery funnel data",
    auth_required: true,
  },
  {
    path: "/api/funnel/snapshot",
    method: "GET",
    description: "Get recovery funnel snapshot",
    auth_required: true,
  },
  {
    path: "/api/import",
    method: "POST",
    description: "Import payment data from CSV/JSON",
    auth_required: true,
  },
  {
    path: "/api/export/contacts",
    method: "GET",
    description: "Export follow-up contacts as CSV",
    auth_required: true,
  },
  {
    path: "/api/followups/contacts",
    method: "GET",
    description: "Get follow-up contacts list",
    auth_required: true,
  },
  {
    path: "/api/marketing/scenarios",
    method: "GET | POST",
    description: "List or create marketing scenarios",
    auth_required: true,
  },
  {
    path: "/api/payments/retry",
    method: "POST",
    description: "Generate a payment retry link",
    auth_required: true,
  },
];

export function GET() {
  return NextResponse.json({
    name: "Shield Recovery API",
    version: "1.0",
    endpoints,
    total: endpoints.length,
  });
}
