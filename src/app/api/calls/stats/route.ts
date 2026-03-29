import { handleCallAnalytics } from "@/server/recovery/controllers/callcenter-controller";

export const maxDuration = 30;

export async function GET(request: Request) {
  return handleCallAnalytics(request);
}
