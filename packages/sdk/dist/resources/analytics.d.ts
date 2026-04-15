import type { HttpClient } from "../client.js";
import type { AnalyticsParams, RecoveryAnalytics } from "../types.js";
export declare class AnalyticsResource {
    private readonly client;
    constructor(client: HttpClient);
    /** Get recovery analytics data. */
    recovery(params?: AnalyticsParams): Promise<RecoveryAnalytics>;
}
//# sourceMappingURL=analytics.d.ts.map