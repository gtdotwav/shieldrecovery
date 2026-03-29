import { handleCallcenterWebhook } from "@/server/recovery/controllers/callcenter-controller";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handleCallcenterWebhook(request);
}
