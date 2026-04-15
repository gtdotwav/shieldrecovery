export class MarketingResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List marketing scenarios. */
    async listScenarios() {
        return this.client.get("/api/marketing/scenarios");
    }
    /** Create a new marketing scenario. */
    async createScenario(input) {
        return this.client.post("/api/marketing/scenarios", input);
    }
}
//# sourceMappingURL=marketing.js.map