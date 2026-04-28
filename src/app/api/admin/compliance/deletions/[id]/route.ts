import { z } from "zod";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getComplianceService } from "@/server/recovery/services/compliance-service";

const updateStatusSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "denied"]),
  denialReason: z.string().max(1000).optional(),
});

export function OPTIONS() {
  return corsOptions();
}

/**
 * PUT /api/admin/compliance/deletions/:id
 * Body: { status, denialReason? }
 * Update the status of a deletion request.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  if (!id) {
    return apiError("Deletion request ID is required.", 400);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = updateStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid request body.", 400);
  }

  if (parsed.data.status === "denied" && !parsed.data.denialReason) {
    return apiError("denialReason is required when denying a request.", 400);
  }

  try {
    const service = getComplianceService();
    const deletion = await service.updateDeletionStatus(
      id,
      parsed.data.status,
      parsed.data.denialReason,
    );

    await service.logDataAccess(
      auth.email,
      auth.role,
      "update_deletion_status",
      "data_deletion_requests",
      id,
      { newStatus: parsed.data.status },
    );

    return apiOk({ deletion });
  } catch (error) {
    console.error("[PUT /api/admin/compliance/deletions/:id]", error instanceof Error ? error.message : error);
    return apiError(
      error instanceof Error ? error.message : "Failed to update deletion request.",
      500,
    );
  }
}

/**
 * POST /api/admin/compliance/deletions/:id
 * Process (execute) a pending data deletion request.
 * Anonymizes customer data, removes message content, marks leads as LOST.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  if (!id) {
    return apiError("Deletion request ID is required.", 400);
  }

  try {
    const service = getComplianceService();
    const result = await service.processDataDeletion(id);

    await service.logDataAccess(
      auth.email,
      auth.role,
      "process_data_deletion",
      "data_deletion_requests",
      id,
      { tablesAffected: result.tablesAffected, recordsDeleted: result.recordsDeleted },
    );

    return apiOk({ processed: true, ...result });
  } catch (error) {
    console.error("[POST /api/admin/compliance/deletions/:id]", error instanceof Error ? error.message : error);
    return apiError(
      error instanceof Error ? error.message : "Failed to process deletion.",
      500,
    );
  }
}
