import type { HttpClient } from "../client.js";
import type { FunnelData, FunnelParams, FunnelSnapshot } from "../types.js";
export declare class FunnelResource {
    private readonly client;
    constructor(client: HttpClient);
    /** Get recovery funnel data. */
    get(params?: FunnelParams): Promise<FunnelData>;
    /** Get recovery funnel snapshot. */
    snapshot(params?: FunnelParams): Promise<FunnelSnapshot>;
}
//# sourceMappingURL=funnel.d.ts.map