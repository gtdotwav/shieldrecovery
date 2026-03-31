import { createClient } from "@supabase/supabase-js";

import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { appEnv } from "@/server/recovery/config";

export function OPTIONS() {
  return corsOptions();
}

/**
 * DELETE /api/push/unregister?token=ExponentPushToken[...]
 * Deactivate a push token.
 */
export async function DELETE(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token")?.trim();

    if (!token) {
      return apiError("Token parameter is required", 400);
    }

    const db = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);

    await db
      .from("push_tokens")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("token", token)
      .eq("user_email", auth.email);

    return apiOk({ unregistered: true });
  } catch (err) {
    console.error("[push/unregister]", err);
    return apiError("Failed to unregister push token", 500);
  }
}
