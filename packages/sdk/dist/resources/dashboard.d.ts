import type { HttpClient } from "../client.js";
import type { DashboardData } from "../types.js";
export declare class DashboardResource {
    private readonly client;
    constructor(client: HttpClient);
    /** Get dashboard analytics and metrics. */
    get(): Promise<DashboardData>;
}
//# sourceMappingURL=dashboard.d.ts.map