import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getStorageService } from "@/server/recovery/services/storage";

export function OPTIONS() {
  return corsOptions();
}

/**
 * POST /api/push/register
 * Body: { token: string, platform: "ios" | "android" }
 * Register an Expo push token for push notifications.
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const platform = String(body.platform || "").trim();

    if (!token) {
      return apiError("Push token is required", 400);
    }
    if (!["ios", "android"].includes(platform)) {
      return apiError("Platform must be ios or android", 400);
    }
    if (!token.startsWith("ExponentPushToken[")) {
      return apiError("Invalid Expo push token format", 400);
    }

    const storage = getStorageService();
    const db = storage.getClient();

    await db.from("push_tokens").upsert(
      {
        user_email: auth.email,
        token,
        platform,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

    return apiOk({ registered: true });
  } catch (err) {
    console.error("[push/register]", err);
    return apiError("Failed to register push token", 500);
  }
}
