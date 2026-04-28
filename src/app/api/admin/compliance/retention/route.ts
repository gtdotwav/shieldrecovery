import { z } from "zod";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getComplianceService } from "@/server/recovery/services/compliance-service";

const updatePolicySchema = z.object({
  resourceType: z.string().min(1).max(100),
  retentionDays: z.number().int().min(1).max(3650),
  autoDelete: z.boolean(),
});

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/admin/compliance/retention
 * Returns all data retention policies.
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const service = getComplianceService();
    const policies = await service.getRetentionPolicies();

    return apiOk({ policies });
  } catch (error) {
    console.error("[GET /api/admin/compliance/retention]", error instanceof Error ? error.message : error);
    return apiError("Failed to load retention policies.", 500);
  }
}

/**
 * PUT /api/admin/compliance/retention
 * Body: { resourceType, retentionDays, autoDelete }
 * Update a specific retention policy.
 */
export async function PUT(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = updatePolicySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid request body.", 400);
  }

  try {
    const service = getComplianceService();
    const policy = await service.updateRetentionPolicy(
      parsed.data.resourceType,
      parsed.data.retentionDays,
      parsed.data.autoDelete,
    );

    await service.logDataAccess(
      auth.email,
      auth.role,
      "update_retention_policy",
      "data_retention_policies",
      parsed.data.resourceType,
      { retentionDays: parsed.data.retentionDays, autoDelete: parsed.data.autoDelete },
    );

    return apiOk({ policy });
  } catch (error) {
    console.error("[PUT /api/admin/compliance/retention]", error instanceof Error ? error.message : error);
    return apiError(
      error instanceof Error ? error.message : "Failed to update retention policy.",
      500,
    );
  }
}
