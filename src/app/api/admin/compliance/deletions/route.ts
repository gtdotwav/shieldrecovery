import { z } from "zod";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getComplianceService } from "@/server/recovery/services/compliance-service";
import type { DeletionStatus } from "@/server/recovery/services/compliance-service";

const VALID_STATUSES: DeletionStatus[] = ["pending", "processing", "completed", "denied"];

const createDeletionSchema = z.object({
  requesterEmail: z.string().email().min(1).max(255),
  requesterPhone: z.string().max(30).optional(),
  reason: z.string().max(1000).optional(),
});

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/admin/compliance/deletions
 * Query params: status (optional filter)
 * Returns: { deletions: DeletionRequest[] }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") as DeletionStatus | null;

    const status =
      statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;

    const service = getComplianceService();
    const deletions = await service.getDeletionRequests(status);

    await service.logDataAccess(
      auth.email,
      auth.role,
      "view_deletion_requests",
      "data_deletion_requests",
    );

    return apiOk({ deletions });
  } catch (error) {
    console.error("[GET /api/admin/compliance/deletions]", error instanceof Error ? error.message : error);
    return apiError("Failed to list deletion requests.", 500);
  }
}

/**
 * POST /api/admin/compliance/deletions
 * Body: { requesterEmail, requesterPhone?, reason? }
 * Creates a new data deletion request (LGPD Art. 18).
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = createDeletionSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid request body.", 400);
  }

  try {
    const service = getComplianceService();
    const deletion = await service.requestDataDeletion(
      parsed.data.requesterEmail,
      parsed.data.requesterPhone,
      parsed.data.reason,
    );

    await service.logDataAccess(
      auth.email,
      auth.role,
      "create_deletion_request",
      "data_deletion_requests",
      deletion.id,
      { requesterEmail: parsed.data.requesterEmail },
    );

    return apiOk({ deletion }, 201);
  } catch (error) {
    console.error("[POST /api/admin/compliance/deletions]", error instanceof Error ? error.message : error);
    return apiError("Failed to create deletion request.", 500);
  }
}
