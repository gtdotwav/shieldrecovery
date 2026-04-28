import {
  handlePartnerIngest,
  handlePartnerIngestHealth,
} from "@/server/recovery/controllers/partner-controller";
import { checkRateLimit, partnerApiLimiter } from "@/server/recovery/utils/rate-limiter";

export const maxDuration = 60;

export async function POST(request: Request) {
  const rateLimited = checkRateLimit(request, partnerApiLimiter);
  if (rateLimited) return rateLimited;

  return handlePartnerIngest(request);
}

export async function GET(request: Request) {
  const rateLimited = checkRateLimit(request, partnerApiLimiter);
  if (rateLimited) return rateLimited;

  return handlePartnerIngestHealth(request);
}
