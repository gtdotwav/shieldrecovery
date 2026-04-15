import type { HttpClient } from "../client.js";
import type { MarketingScenario, MarketingScenarioCreateInput } from "../types.js";

export class MarketingResource {
  constructor(private readonly client: HttpClient) {}

  /** List marketing scenarios. */
  async listScenarios(): Promise<{ scenarios: MarketingScenario[] }> {
    return this.client.get("/api/marketing/scenarios");
  }

  /** Create a new marketing scenario. */
  async createScenario(input: MarketingScenarioCreateInput): Promise<MarketingScenario> {
    return this.client.post("/api/marketing/scenarios", input);
  }
}
