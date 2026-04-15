export class LeadsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List recovery leads with optional filters. */
    async list(params) {
        return this.client.get("/api/leads", params);
    }
    /** Get a specific lead by ID. */
    async get(id) {
        return this.client.get(`/api/leads/${encodeURIComponent(id)}`);
    }
    /** Update a lead (status, assigned agent, etc.). */
    async update(id, input) {
        return this.client.patch(`/api/leads/${encodeURIComponent(id)}`, input);
    }
    /** Transition a lead to a new status. */
    async transition(id, input) {
        return this.client.post(`/api/leads/${encodeURIComponent(id)}/transition`, input);
    }
}
//# sourceMappingURL=leads.js.map