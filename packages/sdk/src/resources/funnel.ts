import type { HttpClient } from "../client.js";
import type { FunnelData, FunnelParams, FunnelSnapshot } from "../types.js";

export class FunnelResource {
  constructor(private readonly client: HttpClient) {}

  /** Get recovery funnel data. */
  async get(params?: FunnelParams): Promise<FunnelData> {
    return this.client.get(
      "/api/funnel",
      params as Record<string, string | number | boolean>,
    );
  }

  /** Get recovery funnel snapshot. */
  async snapshot(params?: FunnelParams): Promise<FunnelSnapshot> {
    return this.client.get(
      "/api/funnel/snapshot",
      params as Record<string, string | number | boolean>,
    );
  }
}
