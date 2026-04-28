import { z } from "zod";

import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import {
  getInvoiceById,
  updateInvoiceStatus,
} from "@/server/recovery/services/partner-billing-service";
import type { InvoiceStatus } from "@/server/recovery/services/partner-billing-service";

const VALID_STATUSES: InvoiceStatus[] = ["draft", "pending", "paid", "overdue", "cancelled"];

const updateSchema = z.object({
  status: z.enum(["draft", "pending", "paid", "overdue", "cancelled"]),
});

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

/**
 * GET /api/admin/billing/[invoiceId]
 * Returns: { invoice: InvoiceRow }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { invoiceId } = await params;
  if (!invoiceId) {
    return apiError("Missing invoiceId.", 400, request);
  }

  try {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return apiError("Invoice not found.", 404, request);
    }
    return apiOk({ invoice }, 200, request);
  } catch (error) {
    console.error("[GET /api/admin/billing/:id]", error instanceof Error ? error.message : error);
    return apiError("Failed to get invoice.", 500, request);
  }
}

/**
 * PUT /api/admin/billing/[invoiceId]
 * Body: { status: InvoiceStatus }
 * Returns: { invoice: InvoiceRow }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { invoiceId } = await params;
  if (!invoiceId) {
    return apiError("Missing invoiceId.", 400, request);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400, request);
  }

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400,
      request,
    );
  }

  try {
    const invoice = await updateInvoiceStatus(invoiceId, parsed.data.status);
    return apiOk({ invoice }, 200, request);
  } catch (error) {
    console.error("[PUT /api/admin/billing/:id]", error instanceof Error ? error.message : error);
    return apiError("Failed to update invoice.", 500, request);
  }
}
