import type { HttpClient } from "../client.js";
import type { AnalyticsParams, RecoveryAnalytics } from "../types.js";

export class AnalyticsResource {
  constructor(private readonly client: HttpClient) {}

  /** Get recovery analytics data. */
  async recovery(params?: AnalyticsParams): Promise<RecoveryAnalytics> {
    return this.client.get(
      "/api/analytics/recovery",
      params as Record<string, string | number | boolean>,
    );
  }
}
