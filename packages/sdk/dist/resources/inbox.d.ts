import type { HttpClient } from "../client.js";
import type { Conversation, ConversationStatusInput, InboxListParams, Message, ReplyInput } from "../types.js";
export declare class InboxResource {
    private readonly client;
    constructor(client: HttpClient);
    /** List conversations in the messaging inbox. */
    list(params?: InboxListParams): Promise<{
        conversations: Conversation[];
    }>;
    /** Get a specific conversation with its messages. */
    get(id: string): Promise<Conversation & {
        messages: Message[];
    }>;
    /** Send a reply in a conversation. */
    reply(id: string, input: ReplyInput): Promise<{
        message: Message;
    }>;
    /** Generate and send an AI-powered reply. */
    aiReply(id: string): Promise<{
        message: Message;
    }>;
    /** Update conversation status (open/closed/pending). */
    setStatus(id: string, input: ConversationStatusInput): Promise<Conversation>;
    /** Update conversation metadata. */
    update(id: string, input: Partial<Conversation>): Promise<Conversation>;
}
//# sourceMappingURL=inbox.d.ts.map