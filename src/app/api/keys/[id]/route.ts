import { requireApiAuth } from "@/server/auth/request";
import { revokeApiKey } from "@/server/auth/api-keys";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

/** Revoke (deactivate) an API key by ID (admin only). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  if (!id) {
    return apiError("API key ID is required.", 400, request);
  }

  try {
    const revoked = await revokeApiKey(id);

    if (!revoked) {
      return apiError("API key not found.", 404, request);
    }

    return apiOk({ revoked: true, id }, 200, request);
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Failed to revoke API key.",
      500,
      request,
    );
  }
}
