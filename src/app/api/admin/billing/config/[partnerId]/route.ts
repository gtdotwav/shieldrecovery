import { z } from "zod";

import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import {
  getBillingConfig,
  updateBillingConfig,
} from "@/server/recovery/services/partner-billing-service";

const configSchema = z.object({
  plan_name: z.string().min(1).max(100).optional(),
  price_per_lead: z.number().min(0).optional(),
  price_per_message: z.number().min(0).optional(),
  price_per_whatsapp_session: z.number().min(0).optional(),
  price_per_call_minute: z.number().min(0).optional(),
  recovery_fee_percent: z.number().min(0).max(100).optional(),
  min_monthly_amount: z.number().min(0).optional(),
  billing_day: z.number().int().min(1).max(28).optional(),
  payment_terms_days: z.number().int().min(1).max(90).optional(),
  active: z.boolean().optional(),
});

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

/**
 * GET /api/admin/billing/config/[partnerId]
 * Returns: { config: BillingConfigRow }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { partnerId } = await params;
  if (!partnerId) {
    return apiError("Missing partnerId.", 400, request);
  }

  try {
    const config = await getBillingConfig(partnerId);
    return apiOk({ config }, 200, request);
  } catch (error) {
    console.error("[GET /api/admin/billing/config/:partnerId]", error instanceof Error ? error.message : error);
    return apiError("Failed to get billing config.", 500, request);
  }
}

/**
 * PUT /api/admin/billing/config/[partnerId]
 * Body: Partial<BillingConfigInput>
 * Returns: { config: BillingConfigRow }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { partnerId } = await params;
  if (!partnerId) {
    return apiError("Missing partnerId.", 400, request);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400, request);
  }

  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid billing config.", 400, request);
  }

  try {
    const config = await updateBillingConfig(partnerId, parsed.data);
    return apiOk({ config }, 200, request);
  } catch (error) {
    console.error("[PUT /api/admin/billing/config/:partnerId]", error instanceof Error ? error.message : error);
    return apiError("Failed to update billing config.", 500, request);
  }
}
