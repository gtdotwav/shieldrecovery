import type { HttpClient } from "../client.js";
import type { Lead, LeadListParams, LeadTransitionInput, LeadUpdateInput } from "../types.js";
export declare class LeadsResource {
    private readonly client;
    constructor(client: HttpClient);
    /** List recovery leads with optional filters. */
    list(params?: LeadListParams): Promise<{
        leads: Lead[];
    }>;
    /** Get a specific lead by ID. */
    get(id: string): Promise<Lead>;
    /** Update a lead (status, assigned agent, etc.). */
    update(id: string, input: LeadUpdateInput): Promise<Lead>;
    /** Transition a lead to a new status. */
    transition(id: string, input: LeadTransitionInput): Promise<Lead>;
}
//# sourceMappingURL=leads.d.ts.map