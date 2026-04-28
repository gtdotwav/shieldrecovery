import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getComplianceService } from "@/server/recovery/services/compliance-service";

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/admin/compliance/export/:customerId
 * Export all data held about a customer (LGPD data portability — Art. 18, V).
 * Returns: { customer, payments, leads, conversations, messages, consents }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { customerId } = await params;
  if (!customerId) {
    return apiError("Customer ID is required.", 400);
  }

  try {
    const service = getComplianceService();
    const data = await service.exportCustomerData(customerId);

    await service.logDataAccess(
      auth.email,
      auth.role,
      "export_data",
      "customer",
      customerId,
    );

    return apiOk({
      customerId,
      exportedAt: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error("[GET /api/admin/compliance/export/:customerId]", error instanceof Error ? error.message : error);
    return apiError("Failed to export customer data.", 500);
  }
}
