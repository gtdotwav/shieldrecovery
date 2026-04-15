export class AnalyticsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Get recovery analytics data. */
    async recovery(params) {
        return this.client.get("/api/analytics/recovery", params);
    }
}
//# sourceMappingURL=analytics.js.map