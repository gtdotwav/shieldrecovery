import type { HttpClient } from "../client.js";
import type {
  Call,
  CallCampaign,
  CallCampaignCreateInput,
  CallCreateInput,
  CallListParams,
  CallStats,
} from "../types.js";

export class CallsResource {
  constructor(private readonly client: HttpClient) {}

  /** List voice calls with optional filters. */
  async list(params?: CallListParams): Promise<{ calls: Call[] }> {
    return this.client.get("/api/calls", params as Record<string, string | number | boolean>);
  }

  /** Initiate a new voice call. */
  async create(input: CallCreateInput): Promise<Call> {
    return this.client.post("/api/calls", input);
  }

  /** Get call details by ID. */
  async get(callId: string): Promise<Call> {
    return this.client.get(`/api/calls/${encodeURIComponent(callId)}`);
  }

  /** Get call center statistics. */
  async stats(): Promise<CallStats> {
    return this.client.get("/api/calls/stats");
  }

  /** List call campaigns. */
  async listCampaigns(): Promise<{ campaigns: CallCampaign[] }> {
    return this.client.get("/api/calls/campaigns");
  }

  /** Create a call campaign. */
  async createCampaign(input: CallCampaignCreateInput): Promise<CallCampaign> {
    return this.client.post("/api/calls/campaigns", input);
  }
}
