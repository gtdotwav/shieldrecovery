export class FunnelResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Get recovery funnel data. */
    async get(params) {
        return this.client.get("/api/funnel", params);
    }
    /** Get recovery funnel snapshot. */
    async snapshot(params) {
        return this.client.get("/api/funnel/snapshot", params);
    }
}
//# sourceMappingURL=funnel.js.map