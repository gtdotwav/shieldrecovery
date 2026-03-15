import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handleShieldTransactionImport } from "@/server/recovery/controllers/import-controller";
import { markAsLegacyRoute } from "@/server/recovery/controllers/route-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return markAsLegacyRoute(
    await handleShieldTransactionImport(request),
    "/api/import",
  );
}
