import {
  handleListCalls,
  handleCreateCall,
} from "@/server/recovery/controllers/callcenter-controller";

export const maxDuration = 30;

export async function GET(request: Request) {
  return handleListCalls(request);
}

export async function POST(request: Request) {
  return handleCreateCall(request);
}
