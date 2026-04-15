import type { HttpClient } from "../client.js";
import type {
  ABTest,
  ABTestCreateInput,
  MessageTemplate,
  TemplateCreateInput,
  TemplateListParams,
} from "../types.js";

export class TemplatesResource {
  constructor(private readonly client: HttpClient) {}

  /** List message templates. */
  async list(params?: TemplateListParams): Promise<{ templates: MessageTemplate[] }> {
    return this.client.get(
      "/api/templates",
      params as Record<string, string | number | boolean>,
    );
  }

  /** Create a new message template. */
  async create(input: TemplateCreateInput): Promise<MessageTemplate> {
    return this.client.post("/api/templates", input);
  }
}

export class ABTestsResource {
  constructor(private readonly client: HttpClient) {}

  /** List A/B tests. */
  async list(): Promise<{ tests: ABTest[] }> {
    return this.client.get("/api/ab-tests");
  }

  /** Create a new A/B test. */
  async create(input: ABTestCreateInput): Promise<ABTest> {
    return this.client.post("/api/ab-tests", input);
  }
}
