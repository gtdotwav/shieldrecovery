import { handleHealthCheck } from "@/server/recovery/controllers/health-controller";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleHealthCheck(request);
}
