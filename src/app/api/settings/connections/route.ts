import {
  handleGetConnectionSettings,
  handleSaveConnectionSettings,
} from "@/server/recovery/controllers/connection-settings-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handleGetConnectionSettings();
}

export async function POST(request: Request) {
  return handleSaveConnectionSettings(request);
}
