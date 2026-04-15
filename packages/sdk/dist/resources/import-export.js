export class ImportExportResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Import payment data from a structured payload. */
    async importData(data) {
        return this.client.post("/api/import", { records: data });
    }
    /** Export follow-up contacts. */
    async exportContacts(params) {
        return this.client.get("/api/export/contacts", params);
    }
    /** Get follow-up contacts list. */
    async getFollowUpContacts() {
        return this.client.get("/api/followups/contacts");
    }
}
//# sourceMappingURL=import-export.js.map