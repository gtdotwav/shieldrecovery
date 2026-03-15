import { handleShieldTransactionImport } from "@/server/recovery/controllers/import-controller";

export async function POST(request: Request) {
  return handleShieldTransactionImport(request);
}
