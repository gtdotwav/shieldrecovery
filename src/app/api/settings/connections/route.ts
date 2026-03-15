import { ensureAuthenticatedRequest } from "@/server/auth/request";
import {
  handleGetConnectionSettings,
  handleSaveConnectionSettings,
} from "@/server/recovery/controllers/connection-settings-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return handleGetConnectionSettings();
}

export async function POST(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }
  return handleSaveConnectionSettings(request);
}
