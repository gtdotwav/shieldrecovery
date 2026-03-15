import { handleFollowUpContacts } from "@/server/recovery/controllers/followup-controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handleFollowUpContacts();
}
