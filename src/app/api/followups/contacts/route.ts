import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { handleFollowUpContacts } from "@/server/recovery/controllers/followup-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return handleFollowUpContacts();
}
