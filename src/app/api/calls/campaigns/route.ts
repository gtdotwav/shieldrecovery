import {
  handleListCampaigns,
  handleCreateCampaign,
} from "@/server/recovery/controllers/callcenter-controller";

export const maxDuration = 30;

export async function GET(request: Request) {
  return handleListCampaigns(request);
}

export async function POST(request: Request) {
  return handleCreateCampaign(request);
}
