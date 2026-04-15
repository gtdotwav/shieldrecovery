export class InboxResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List conversations in the messaging inbox. */
    async list(params) {
        return this.client.get("/api/inbox", params);
    }
    /** Get a specific conversation with its messages. */
    async get(id) {
        return this.client.get(`/api/inbox/${encodeURIComponent(id)}`);
    }
    /** Send a reply in a conversation. */
    async reply(id, input) {
        return this.client.post(`/api/inbox/${encodeURIComponent(id)}/reply`, input);
    }
    /** Generate and send an AI-powered reply. */
    async aiReply(id) {
        return this.client.post(`/api/inbox/${encodeURIComponent(id)}/ai-reply`);
    }
    /** Update conversation status (open/closed/pending). */
    async setStatus(id, input) {
        return this.client.put(`/api/inbox/${encodeURIComponent(id)}/status`, input);
    }
    /** Update conversation metadata. */
    async update(id, input) {
        return this.client.patch(`/api/inbox/${encodeURIComponent(id)}`, input);
    }
}
//# sourceMappingURL=inbox.js.map