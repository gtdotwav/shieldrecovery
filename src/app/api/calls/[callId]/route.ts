import { handleGetCall } from "@/server/recovery/controllers/callcenter-controller";

export const maxDuration = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  return handleGetCall(request, callId);
}
