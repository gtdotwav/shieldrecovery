import type { HttpClient } from "../client.js";
import type { DashboardData } from "../types.js";

export class DashboardResource {
  constructor(private readonly client: HttpClient) {}

  /** Get dashboard analytics and metrics. */
  async get(): Promise<DashboardData> {
    return this.client.get("/api/dashboard");
  }
}
