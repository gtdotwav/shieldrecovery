import { NextResponse } from "next/server";

import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";

export async function handleGetConnectionSettings() {
  const runtime = await getConnectionSettingsService().getPublicRuntimeSettings();
  return NextResponse.json(runtime, { status: 200 });
}

export async function handleSaveConnectionSettings(request: Request) {
  void request;
  return NextResponse.json(
    {
      error:
        "Direct updates are disabled on this public endpoint. Use the /connect interface.",
    },
    { status: 403 },
  );
}
