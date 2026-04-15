import type { HttpClient } from "../client.js";
import type { ExportParams, ImportResult } from "../types.js";
export declare class ImportExportResource {
    private readonly client;
    constructor(client: HttpClient);
    /** Import payment data from a structured payload. */
    importData(data: Record<string, unknown>[]): Promise<ImportResult>;
    /** Export follow-up contacts. */
    exportContacts(params?: ExportParams): Promise<string>;
    /** Get follow-up contacts list. */
    getFollowUpContacts(): Promise<{
        contacts: Record<string, unknown>[];
    }>;
}
//# sourceMappingURL=import-export.d.ts.map