import { NextResponse } from "next/server";

import {
  handlePartnerIngest,
  handlePartnerIngestHealth,
} from "@/server/recovery/controllers/partner-controller";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handlePartnerIngest(request);
}

export async function GET(request: Request) {
  return handlePartnerIngestHealth(request);
}
