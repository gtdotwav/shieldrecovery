import type { HttpClient } from "../client.js";
import type { ABTest, ABTestCreateInput, MessageTemplate, TemplateCreateInput, TemplateListParams } from "../types.js";
export declare class TemplatesResource {
    private readonly client;
    constructor(client: HttpClient);
    /** List message templates. */
    list(params?: TemplateListParams): Promise<{
        templates: MessageTemplate[];
    }>;
    /** Create a new message template. */
    create(input: TemplateCreateInput): Promise<MessageTemplate>;
}
export declare class ABTestsResource {
    private readonly client;
    constructor(client: HttpClient);
    /** List A/B tests. */
    list(): Promise<{
        tests: ABTest[];
    }>;
    /** Create a new A/B test. */
    create(input: ABTestCreateInput): Promise<ABTest>;
}
//# sourceMappingURL=templates.d.ts.map