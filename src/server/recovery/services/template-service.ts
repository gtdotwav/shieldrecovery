import { getStorageService } from "@/server/recovery/services/storage";
import type {
  MessageTemplateInput,
  MessageTemplateRecord,
  RenderedTemplate,
  ABTestRecord,
} from "@/server/recovery/types";

/* ── Variable substitution ── */

/**
 * Render a template body by replacing {{variable}} placeholders with values.
 * Unknown variables are left as empty strings.
 */
export function renderBody(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] ?? "";
  });
}

/**
 * Render a full template for a specific channel, returning the appropriate body.
 */
export function renderTemplate(
  template: MessageTemplateRecord,
  variables: Record<string, string>,
  channel: string,
): RenderedTemplate {
  let body: string;

  switch (channel) {
    case "sms":
      body = template.bodySms ?? template.bodyWhatsapp;
      break;
    case "email":
      body = template.bodyEmailText ?? template.bodyWhatsapp;
      break;
    default:
      body = template.bodyWhatsapp;
  }

  return {
    channel,
    subject: template.subject ? renderBody(template.subject, variables) : undefined,
    body: renderBody(body, variables),
    templateId: template.id,
    templateSlug: template.slug,
  };
}

/**
 * Find the best matching template for a given context.
 * Priority: exact vertical match > general vertical > first active match.
 */
export async function findBestTemplate(input: {
  category?: string;
  vertical?: string;
  channel?: string;
  sellerKey?: string;
  slug?: string;
}): Promise<MessageTemplateRecord | undefined> {
  const storage = getStorageService();

  // If a specific slug is requested, use it directly
  if (input.slug) {
    return storage.getMessageTemplate(input.slug);
  }

  const templates = await storage.listMessageTemplates({
    category: input.category,
    channel: input.channel,
    sellerKey: input.sellerKey,
    active: true,
  });

  if (templates.length === 0) return undefined;

  // Prefer exact vertical match
  if (input.vertical) {
    const exactMatch = templates.find((t) => t.vertical === input.vertical);
    if (exactMatch) return exactMatch;
  }

  // Fallback to general vertical
  const generalMatch = templates.find((t) => t.vertical === "general");
  if (generalMatch) return generalMatch;

  // Last resort: first available
  return templates[0];
}

/**
 * Select a template variant for A/B testing.
 * If an active AB test exists for the templates, assigns the contact to a variant.
 * Returns the selected template and variant info.
 */
export async function selectABVariant(input: {
  contactValue: string;
  category?: string;
  vertical?: string;
  channel?: string;
  sellerKey?: string;
}): Promise<{
  template: MessageTemplateRecord;
  abTest?: ABTestRecord;
  variant?: "a" | "b";
} | null> {
  const storage = getStorageService();

  // Check for running AB tests
  const abTests = await storage.listABTests({
    status: "running",
    sellerKey: input.sellerKey,
  });

  if (abTests.length > 0) {
    const test = abTests[0];

    // Check existing assignment
    const existing = await storage.getABTestAssignment(
      test.id,
      input.contactValue,
    );

    if (existing) {
      const templateId =
        existing.variant === "a" ? test.templateAId : test.templateBId;
      const template = await storage.getMessageTemplate(templateId);
      if (template) {
        return { template, abTest: test, variant: existing.variant };
      }
    }

    // Assign new variant (roughly 50/50 based on total sent)
    const totalA = test.totalSentA;
    const totalB = test.totalSentB;
    const variant: "a" | "b" = totalA <= totalB ? "a" : "b";

    const templateId =
      variant === "a" ? test.templateAId : test.templateBId;
    const template = await storage.getMessageTemplate(templateId);

    if (template) {
      await storage.createABTestAssignment({
        abTestId: test.id,
        contactValue: input.contactValue,
        variant,
      });

      // Update sent count
      const update: Partial<ABTestRecord> =
        variant === "a"
          ? { totalSentA: totalA + 1 }
          : { totalSentB: totalB + 1 };
      await storage.updateABTest(test.id, update);

      return { template, abTest: test, variant };
    }
  }

  // No AB test — use regular template selection
  const template = await findBestTemplate(input);
  if (!template) return null;

  return { template };
}

/**
 * Record that a template was used (and optionally converted).
 */
export async function trackTemplateUsage(
  templateId: string,
  converted?: boolean,
): Promise<void> {
  const storage = getStorageService();
  await storage.incrementTemplateUsage(templateId, converted);
}

/**
 * Build common recovery variables from lead/payment data.
 */
export function buildRecoveryVariables(input: {
  customerName: string;
  product?: string;
  amount?: string;
  paymentUrl?: string;
  paymentMethod?: string;
  discountPct?: number;
}): Record<string, string> {
  return {
    customer_name: input.customerName || "Cliente",
    product: input.product || "seu produto",
    amount: input.amount || "",
    payment_url: input.paymentUrl || "",
    payment_method: input.paymentMethod || "",
    discount_pct: input.discountPct ? String(input.discountPct) : "",
  };
}

/* ── CRUD wrappers ── */

export async function createTemplate(
  input: MessageTemplateInput,
): Promise<MessageTemplateRecord> {
  const storage = getStorageService();
  return storage.createMessageTemplate(input);
}

export async function updateTemplate(
  id: string,
  input: Partial<MessageTemplateInput>,
): Promise<MessageTemplateRecord> {
  const storage = getStorageService();
  return storage.updateMessageTemplate(id, input);
}

export async function listTemplates(
  options?: Parameters<typeof getStorageService extends () => infer S ? S extends { listMessageTemplates: (...args: infer A) => unknown } ? (...args: A) => void : never : never>[0],
): Promise<MessageTemplateRecord[]> {
  const storage = getStorageService();
  return storage.listMessageTemplates(options);
}

/* ── Singleton ── */

let _instance: TemplateService | undefined;

export function getTemplateService(): TemplateService {
  if (!_instance) {
    _instance = new TemplateService();
  }
  return _instance;
}

export class TemplateService {
  renderBody = renderBody;
  renderTemplate = renderTemplate;
  findBestTemplate = findBestTemplate;
  selectABVariant = selectABVariant;
  trackTemplateUsage = trackTemplateUsage;
  buildRecoveryVariables = buildRecoveryVariables;
  createTemplate = createTemplate;
  updateTemplate = updateTemplate;
}
