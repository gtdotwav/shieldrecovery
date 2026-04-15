import type { HttpClient } from "../client.js";
import type {
  Conversation,
  ConversationStatusInput,
  InboxListParams,
  Message,
  ReplyInput,
} from "../types.js";

export class InboxResource {
  constructor(private readonly client: HttpClient) {}

  /** List conversations in the messaging inbox. */
  async list(params?: InboxListParams): Promise<{ conversations: Conversation[] }> {
    return this.client.get("/api/inbox", params as Record<string, string | number | boolean>);
  }

  /** Get a specific conversation with its messages. */
  async get(id: string): Promise<Conversation & { messages: Message[] }> {
    return this.client.get(`/api/inbox/${encodeURIComponent(id)}`);
  }

  /** Send a reply in a conversation. */
  async reply(id: string, input: ReplyInput): Promise<{ message: Message }> {
    return this.client.post(`/api/inbox/${encodeURIComponent(id)}/reply`, input);
  }

  /** Generate and send an AI-powered reply. */
  async aiReply(id: string): Promise<{ message: Message }> {
    return this.client.post(`/api/inbox/${encodeURIComponent(id)}/ai-reply`);
  }

  /** Update conversation status (open/closed/pending). */
  async setStatus(id: string, input: ConversationStatusInput): Promise<Conversation> {
    return this.client.put(`/api/inbox/${encodeURIComponent(id)}/status`, input);
  }

  /** Update conversation metadata. */
  async update(id: string, input: Partial<Conversation>): Promise<Conversation> {
    return this.client.patch(`/api/inbox/${encodeURIComponent(id)}`, input);
  }
}
