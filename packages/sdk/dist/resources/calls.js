export class CallsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List voice calls with optional filters. */
    async list(params) {
        return this.client.get("/api/calls", params);
    }
    /** Initiate a new voice call. */
    async create(input) {
        return this.client.post("/api/calls", input);
    }
    /** Get call details by ID. */
    async get(callId) {
        return this.client.get(`/api/calls/${encodeURIComponent(callId)}`);
    }
    /** Get call center statistics. */
    async stats() {
        return this.client.get("/api/calls/stats");
    }
    /** List call campaigns. */
    async listCampaigns() {
        return this.client.get("/api/calls/campaigns");
    }
    /** Create a call campaign. */
    async createCampaign(input) {
        return this.client.post("/api/calls/campaigns", input);
    }
}
//# sourceMappingURL=calls.js.map