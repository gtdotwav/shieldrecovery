import { z } from "zod";

import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import {
  getAllInvoices,
  generateInvoice,
} from "@/server/recovery/services/partner-billing-service";
import type { InvoiceStatus } from "@/server/recovery/services/partner-billing-service";

const generateSchema = z.object({
  partner_id: z.string().min(1).max(255),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

/**
 * GET /api/admin/billing
 * Query params: status (optional)
 * Returns: { invoices: InvoiceRow[] }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as InvoiceStatus | null;

    const invoices = await getAllInvoices(status ?? undefined);
    return apiOk({ invoices }, 200, request);
  } catch (error) {
    console.error("[GET /api/admin/billing]", error instanceof Error ? error.message : error);
    return apiError("Failed to list invoices.", 500, request);
  }
}

/**
 * POST /api/admin/billing
 * Body: { partner_id, period_start, period_end }
 * Returns: { invoice: InvoiceRow }
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400, request);
  }

  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid request body. Required: partner_id, period_start (YYYY-MM-DD), period_end (YYYY-MM-DD).", 400, request);
  }

  try {
    const invoice = await generateInvoice(
      parsed.data.partner_id,
      parsed.data.period_start,
      parsed.data.period_end,
    );
    return apiOk({ invoice }, 201, request);
  } catch (error) {
    console.error("[POST /api/admin/billing]", error instanceof Error ? error.message : error);
    return apiError("Failed to generate invoice.", 500, request);
  }
}
