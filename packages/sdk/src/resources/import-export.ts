import type { HttpClient } from "../client.js";
import type { ExportParams, ImportResult } from "../types.js";

export class ImportExportResource {
  constructor(private readonly client: HttpClient) {}

  /** Import payment data from a structured payload. */
  async importData(data: Record<string, unknown>[]): Promise<ImportResult> {
    return this.client.post("/api/import", { records: data });
  }

  /** Export follow-up contacts. */
  async exportContacts(params?: ExportParams): Promise<string> {
    return this.client.get(
      "/api/export/contacts",
      params as Record<string, string | number | boolean>,
    );
  }

  /** Get follow-up contacts list. */
  async getFollowUpContacts(): Promise<{ contacts: Record<string, unknown>[] }> {
    return this.client.get("/api/followups/contacts");
  }
}
