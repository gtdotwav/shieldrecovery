import { handleFollowUpContacts } from "@/server/recovery/controllers/followup-controller";
import { markAsLegacyRoute } from "@/server/recovery/controllers/route-compat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return markAsLegacyRoute(
    await handleFollowUpContacts(),
    "/api/followups/contacts",
  );
}
