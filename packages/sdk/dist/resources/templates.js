export class TemplatesResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List message templates. */
    async list(params) {
        return this.client.get("/api/templates", params);
    }
    /** Create a new message template. */
    async create(input) {
        return this.client.post("/api/templates", input);
    }
}
export class ABTestsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List A/B tests. */
    async list() {
        return this.client.get("/api/ab-tests");
    }
    /** Create a new A/B test. */
    async create(input) {
        return this.client.post("/api/ab-tests", input);
    }
}
//# sourceMappingURL=templates.js.map