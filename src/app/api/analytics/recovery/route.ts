import { handleRecoveryAnalytics } from "@/server/recovery/controllers/analytics-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handleRecoveryAnalytics();
}
