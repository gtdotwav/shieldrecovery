import { authenticatePlatformUser, registerSellerLogin } from "@/server/auth/identities";
import { createSessionToken, isAuthConfigured } from "@/server/auth/core";
import { apiError, apiOk, corsOptions } from "@/server/recovery/utils/api-response";

export function OPTIONS() {
  return corsOptions();
}

/**
 * POST /api/auth/token
 * Body: { email: string; password: string }
 * Returns: { token: string; role: string; email: string; expiresIn: number }
 */
export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return apiError("Platform authentication is not configured.", 503);
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";

  if (!email || !password) {
    return apiError("Email and password are required.", 400);
  }

  const identity = await authenticatePlatformUser({ email, password });

  if (!identity) {
    return apiError("Invalid credentials.", 401);
  }

  const token = await createSessionToken(identity.email, identity.role);

  if (identity.role === "seller") {
    await registerSellerLogin(identity.email);
  }

  return apiOk({
    token,
    role: identity.role,
    email: identity.email,
    expiresIn: 60 * 60 * 24 * 7,
  });
}
