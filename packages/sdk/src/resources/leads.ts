import type { HttpClient } from "../client.js";
import type { Lead, LeadListParams, LeadTransitionInput, LeadUpdateInput } from "../types.js";

export class LeadsResource {
  constructor(private readonly client: HttpClient) {}

  /** List recovery leads with optional filters. */
  async list(params?: LeadListParams): Promise<{ leads: Lead[] }> {
    return this.client.get("/api/leads", params as Record<string, string | number | boolean>);
  }

  /** Get a specific lead by ID. */
  async get(id: string): Promise<Lead> {
    return this.client.get(`/api/leads/${encodeURIComponent(id)}`);
  }

  /** Update a lead (status, assigned agent, etc.). */
  async update(id: string, input: LeadUpdateInput): Promise<Lead> {
    return this.client.patch(`/api/leads/${encodeURIComponent(id)}`, input);
  }

  /** Transition a lead to a new status. */
  async transition(id: string, input: LeadTransitionInput): Promise<Lead> {
    return this.client.post(`/api/leads/${encodeURIComponent(id)}/transition`, input);
  }
}
