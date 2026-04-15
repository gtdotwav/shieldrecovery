import { HttpClient } from "./client.js";
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

const DEFAULT_BASE_URL = "https://pagrecovery.com";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;

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
export class PagRecovery {
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

  private readonly client: HttpClient;

  constructor(config: PagRecoveryConfig) {
    if (!config.apiKey) {
      throw new Error("PagRecovery: apiKey is required.");
    }

    this.client = new HttpClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
    });

    this.leads = new LeadsResource(this.client);
    this.inbox = new InboxResource(this.client);
    this.dashboard = new DashboardResource(this.client);
    this.analytics = new AnalyticsResource(this.client);
    this.calls = new CallsResource(this.client);
    this.checkout = new CheckoutResource(this.client);
    this.templates = new TemplatesResource(this.client);
    this.abTests = new ABTestsResource(this.client);
    this.funnel = new FunnelResource(this.client);
    this.importExport = new ImportExportResource(this.client);
    this.marketing = new MarketingResource(this.client);
  }
}

// Re-export everything
export * from "./types.js";
export * from "./errors.js";
export { verifyWebhookSignature, computeWebhookSignature } from "./webhooks.js";
