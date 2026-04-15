import type { HttpClient } from "../client.js";
import type { CheckoutProcessInput, CheckoutSession, CheckoutSessionCreateInput } from "../types.js";
export declare class CheckoutResource {
    private readonly client;
    constructor(client: HttpClient);
    /** Create a new checkout session. */
    createSession(input: CheckoutSessionCreateInput): Promise<CheckoutSession>;
    /** Get a checkout session by short ID. */
    getSession(shortId: string): Promise<CheckoutSession>;
    /** Process a checkout payment. */
    process(input: CheckoutProcessInput): Promise<{
        success: boolean;
        [key: string]: unknown;
    }>;
}
//# sourceMappingURL=checkout.d.ts.map