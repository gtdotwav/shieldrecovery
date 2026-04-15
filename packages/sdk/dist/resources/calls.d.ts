import type { HttpClient } from "../client.js";
import type { Call, CallCampaign, CallCampaignCreateInput, CallCreateInput, CallListParams, CallStats } from "../types.js";
export declare class CallsResource {
    private readonly client;
    constructor(client: HttpClient);
    /** List voice calls with optional filters. */
    list(params?: CallListParams): Promise<{
        calls: Call[];
    }>;
    /** Initiate a new voice call. */
    create(input: CallCreateInput): Promise<Call>;
    /** Get call details by ID. */
    get(callId: string): Promise<Call>;
    /** Get call center statistics. */
    stats(): Promise<CallStats>;
    /** List call campaigns. */
    listCampaigns(): Promise<{
        campaigns: CallCampaign[];
    }>;
    /** Create a call campaign. */
    createCampaign(input: CallCampaignCreateInput): Promise<CallCampaign>;
}
//# sourceMappingURL=calls.d.ts.map