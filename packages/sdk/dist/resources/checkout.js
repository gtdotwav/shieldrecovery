export class CheckoutResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Create a new checkout session. */
    async createSession(input) {
        return this.client.post("/api/checkout/session", input);
    }
    /** Get a checkout session by short ID. */
    async getSession(shortId) {
        return this.client.get(`/api/checkout/session/${encodeURIComponent(shortId)}`);
    }
    /** Process a checkout payment. */
    async process(input) {
        return this.client.post("/api/checkout/process", input);
    }
}
//# sourceMappingURL=checkout.js.map