export class DashboardResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Get dashboard analytics and metrics. */
    async get() {
        return this.client.get("/api/dashboard");
    }
}
//# sourceMappingURL=dashboard.js.map