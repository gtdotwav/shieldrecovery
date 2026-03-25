import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handleShieldTransactionImport } from "@/server/recovery/controllers/import-controller";

export const maxDuration = 60;

export async function POST(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return handleShieldTransactionImport(request);
}
