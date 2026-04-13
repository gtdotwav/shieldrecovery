import { z } from "zod";
import { requireApiAuth } from "@/server/auth/request";
import { apiError, apiOk, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { hashPlatformPassword } from "@/server/auth/passwords";

const sellerSchema = z.object({
  email: z.string().email().min(1).max(255),
  displayName: z.string().min(1).max(255).optional(),
  agentName: z.string().min(1).max(255),
  password: z.string().min(1).max(255).optional(),
  active: z.boolean().optional(),
});

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function OPTIONS() {
  return corsOptions();
}

/**
 * GET /api/admin/sellers
 * Query params: page (default 1), limit (default 50, max 100)
 * Returns: { sellers: SellerUserRecord[], page, limit, total }
 */
export async function GET(request: Request) {
  const auth = await requireApiAuth(request, ["admin"]);
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const pageParam = Number(searchParams.get("page") ?? DEFAULT_PAGE);
    const limitParam = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : DEFAULT_PAGE;
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const allSellers = await getStorageService().listSellerUsers();
    const total = allSellers.length;
    const offset = (page - 1) * limit;
    const sellers = allSellers.slice(offset, offset + limit);

    return apiOk({ sellers, page, limit, total });
  } catch (error) {
    console.error("[GET /api/admin/sellers]", error instanceof Error ? error.message : error);
    return apiError("Failed to list sellers.", 500);
  }
}

/**
 * POST /api/admin/sellers
 * Body: { email, displayName?, agentName, password?, active? }
 * Returns: { seller: SellerUserSnapshot }
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

  const parsed = sellerSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid request body.", 400);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const agentName = parsed.data.agentName.trim();

  if (!email || !agentName) {
    return apiError("email and agentName are required.", 400);
  }

  const existing = await getStorageService().findSellerUserByEmail(email);
  const passwordHash = parsed.data.password
    ? hashPlatformPassword(parsed.data.password.trim())
    : existing?.passwordHash ?? "";

  if (!existing && !parsed.data.password) {
    return apiError("password is required for new sellers.", 400);
  }

  const service = getPaymentRecoveryService();

  try {
    const seller = await service.saveSellerUser({
      email,
      displayName: parsed.data.displayName?.trim() ?? agentName,
      agentName,
      passwordHash,
      active: parsed.data.active ?? true,
    });

    await service.saveSellerAdminControl({
      sellerKey: agentName.toLowerCase().replace(/\s+/g, "-"),
      sellerName: agentName,
      sellerEmail: email,
      active: parsed.data.active ?? true,
    });

    return apiOk({ seller }, 201);
  } catch (error) {
    console.error("[POST /api/admin/sellers]", error instanceof Error ? error.message : error);
    return apiError("Failed to save seller.", 500);
  }
}
