import { LeadsResource } from "./resources/leads.js";
import { InboxResource } from "./resources/inbox.js";
import { DashboardResource } from "./resources/dashboard.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { CallsResource } from "./resources/calls.js";
import { CheckoutResource } from "./resources/checkout.js";
import { TemplatesResource, ABTestsResource } from "./resources/templates.js";
import { FunnelResource } from "./resources/funnel.js";
import { ImportExportResource } from "./resources/import-export.js";
import { MarketingResource } from "./resources/marketing.js";
import type { PagRecoveryConfig } from "./types.js";
/**
 * PagRecovery SDK client.
 *
 * @example
 * ```ts
 * import { PagRecovery } from '@pagrecovery/sdk';
 *
 * const pr = new PagRecovery({ apiKey: 'sk_live_xxx' });
 *
 * const { leads } = await pr.leads.list({ status: 'CONTACTING' });
 * const lead = await pr.leads.get('lead_123');
 * await pr.leads.transition('lead_123', { status: 'RECOVERED' });
 *
 * const { conversations } = await pr.inbox.list();
 * await pr.inbox.reply('conv_123', { message: 'Olá!' });
 * await pr.inbox.aiReply('conv_123');
 *
 * const dashboard = await pr.dashboard.get();
 * const analytics = await pr.analytics.recovery();
 *
 * await pr.calls.create({ toNumber: '+5511999999999' });
 * ```
 */
export declare class PagRecovery {
    readonly leads: LeadsResource;
    readonly inbox: InboxResource;
    readonly dashboard: DashboardResource;
    readonly analytics: AnalyticsResource;
    readonly calls: CallsResource;
    readonly checkout: CheckoutResource;
    readonly templates: TemplatesResource;
    readonly abTests: ABTestsResource;
    readonly funnel: FunnelResource;
    readonly importExport: ImportExportResource;
    readonly marketing: MarketingResource;
    private readonly client;
    constructor(config: PagRecoveryConfig);
}
export * from "./types.js";
export * from "./errors.js";
export { verifyWebhookSignature, computeWebhookSignature } from "./webhooks.js";
//# sourceMappingURL=index.d.ts.map