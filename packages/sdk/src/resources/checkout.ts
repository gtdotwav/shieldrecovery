import type { HttpClient } from "../client.js";
import type {
  CheckoutProcessInput,
  CheckoutSession,
  CheckoutSessionCreateInput,
} from "../types.js";

export class CheckoutResource {
  constructor(private readonly client: HttpClient) {}

  /** Create a new checkout session. */
  async createSession(input: CheckoutSessionCreateInput): Promise<CheckoutSession> {
    return this.client.post("/api/checkout/session", input);
  }

  /** Get a checkout session by short ID. */
  async getSession(shortId: string): Promise<CheckoutSession> {
    return this.client.get(`/api/checkout/session/${encodeURIComponent(shortId)}`);
  }

  /** Process a checkout payment. */
  async process(input: CheckoutProcessInput): Promise<{ success: boolean; [key: string]: unknown }> {
    return this.client.post("/api/checkout/process", input);
  }
}
