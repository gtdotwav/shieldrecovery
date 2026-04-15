import type { HttpClient } from "../client.js";
import type { MarketingScenario, MarketingScenarioCreateInput } from "../types.js";
export declare class MarketingResource {
    private readonly client;
    constructor(client: HttpClient);
    /** List marketing scenarios. */
    listScenarios(): Promise<{
        scenarios: MarketingScenario[];
    }>;
    /** Create a new marketing scenario. */
    createScenario(input: MarketingScenarioCreateInput): Promise<MarketingScenario>;
}
//# sourceMappingURL=marketing.d.ts.map