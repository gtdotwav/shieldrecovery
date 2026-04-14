import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

/* ── Types ── */

type CommerceSessionStatus = "active" | "cart" | "checkout" | "completed" | "abandoned";

type CommerceSessionRow = {
  id: string;
  seller_key: string;
  customer_phone: string;
  customer_name: string | null;
  status: string;
  cart: string; // JSON stringified CartItem[]
  messages_history: string; // JSON stringified ChatMessage[]
  checkout_url: string | null;
  total_value: number;
  created_at: string;
  updated_at: string;
};

type CommerceCatalogRow = {
  id: string;
  seller_key: string;
  items: string; // JSON stringified CatalogItem[]
  updated_at: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  price: number; // cents
  imageUrl?: string;
  available: boolean;
  category?: string;
};

type CartItem = {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
};

type ChatMessage = {
  role: "customer" | "assistant";
  content: string;
  timestamp: string;
};

export type CommerceSession = {
  id: string;
  sellerKey: string;
  customerPhone: string;
  customerName: string | null;
  status: CommerceSessionStatus;
  cart: CartItem[];
  messagesHistory: ChatMessage[];
  checkoutUrl: string | null;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
};

export type CommerceAnalytics = {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  conversionRate: number;
  totalRevenue: number;
};

/* ── Row mapping ── */

function rowToSession(row: CommerceSessionRow): CommerceSession {
  return {
    id: row.id,
    sellerKey: row.seller_key,
    customerPhone: row.customer_phone,
    customerName: row.customer_name,
    status: row.status as CommerceSessionStatus,
    cart: JSON.parse(row.cart || "[]") as CartItem[],
    messagesHistory: JSON.parse(row.messages_history || "[]") as ChatMessage[],
    checkoutUrl: row.checkout_url,
    totalValue: row.total_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCatalog(row: CommerceCatalogRow): { sellerKey: string; items: CatalogItem[] } {
  return {
    sellerKey: row.seller_key,
    items: JSON.parse(row.items || "[]") as CatalogItem[],
  };
}

/* ── Service ── */

export class CommerceAIService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async createSession(
    input: unknown,
  ): Promise<CommerceSession> {
    const body = input as { sellerKey: string; customerPhone: string; customerName?: string };
    return this.startSession(body.sellerKey, body.customerPhone, body.customerName);
  }

  async startSession(
    sellerKey: string,
    customerPhone: string,
    customerName?: string,
  ): Promise<CommerceSession> {
    const now = new Date().toISOString();
    const row: CommerceSessionRow = {
      id: randomUUID(),
      seller_key: sellerKey,
      customer_phone: customerPhone,
      customer_name: customerName ?? null,
      status: "active",
      cart: "[]",
      messages_history: "[]",
      checkout_url: null,
      total_value: 0,
      created_at: now,
      updated_at: now,
    };

    const { error } = await this.supabase.from("commerce_sessions").insert(row);
    if (error) throw new Error(`Failed to start commerce session: ${error.message}`);

    await this.supabase.from("system_logs").insert(
      createStructuredLog({
        eventType: "commerce",
        level: "info",
        message: `Commerce session started: ${row.id}`,
        context: { sessionId: row.id, sellerKey, customerPhone },
      }),
    );

    return rowToSession(row);
  }

  async processMessage(
    sessionId: string,
    message: string,
  ): Promise<{ reply: string; session: CommerceSession }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Commerce session not found: ${sessionId}`);

    const catalog = await this.getCatalog(session.sellerKey);
    const history = [...session.messagesHistory];

    history.push({ role: "customer", content: message, timestamp: new Date().toISOString() });

    const reply = await this.generateAIReply(session, catalog, history);

    history.push({ role: "assistant", content: reply, timestamp: new Date().toISOString() });

    const { error } = await this.supabase
      .from("commerce_sessions")
      .update({
        messages_history: JSON.stringify(history),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) console.error(`[CommerceAI] Failed to update session history: ${error.message}`);

    const updated = await this.getSession(sessionId);
    return { reply, session: updated! };
  }

  async getCatalog(sellerKey: string): Promise<CatalogItem[]> {
    const { data, error } = await this.supabase
      .from("commerce_catalogs")
      .select("*")
      .eq("seller_key", sellerKey)
      .single();

    if (error || !data) return [];

    return rowToCatalog(data as CommerceCatalogRow).items;
  }

  async updateCatalog(
    sellerKeyOrBody: string | unknown,
    items?: CatalogItem[],
  ): Promise<void> {
    if (typeof sellerKeyOrBody !== "string") {
      const body = sellerKeyOrBody as { sellerKey: string; items: CatalogItem[] };
      return this._updateCatalog(body.sellerKey, body.items);
    }
    return this._updateCatalog(sellerKeyOrBody, items!);
  }

  private async _updateCatalog(sellerKey: string, items: CatalogItem[]): Promise<void> {
    const payload = {
      seller_key: sellerKey,
      items: JSON.stringify(items),
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await this.supabase
      .from("commerce_catalogs")
      .select("id")
      .eq("seller_key", sellerKey)
      .single();

    if (existing) {
      const { error } = await this.supabase
        .from("commerce_catalogs")
        .update(payload)
        .eq("seller_key", sellerKey);
      if (error) throw new Error(`Failed to update catalog: ${error.message}`);
    } else {
      const { error } = await this.supabase
        .from("commerce_catalogs")
        .insert({ id: randomUUID(), ...payload });
      if (error) throw new Error(`Failed to create catalog: ${error.message}`);
    }
  }

  async addToCart(sessionId: string, itemId: string, quantity: number): Promise<CommerceSession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Commerce session not found: ${sessionId}`);

    const catalog = await this.getCatalog(session.sellerKey);
    const item = catalog.find((i) => i.id === itemId);
    if (!item) throw new Error(`Catalog item not found: ${itemId}`);
    if (!item.available) throw new Error(`Item not available: ${item.name}`);

    const cart = [...session.cart];
    const existing = cart.find((c) => c.itemId === itemId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ itemId, name: item.name, price: item.price, quantity });
    }

    const totalValue = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

    const { error } = await this.supabase
      .from("commerce_sessions")
      .update({
        cart: JSON.stringify(cart),
        total_value: totalValue,
        status: "cart",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw new Error(`Failed to update cart: ${error.message}`);

    return (await this.getSession(sessionId))!;
  }

  async generateCheckout(sessionId: string): Promise<{ checkoutUrl: string; session: CommerceSession }> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Commerce session not found: ${sessionId}`);
    if (session.cart.length === 0) throw new Error("Cart is empty");

    // Build checkout URL via the checkout platform
    const checkoutUrl = appEnv.checkoutPlatformConfigured
      ? `${appEnv.checkoutPlatformUrl}/c/${sessionId}`
      : `${appEnv.appBaseUrl}/checkout/${sessionId}`;

    const { error } = await this.supabase
      .from("commerce_sessions")
      .update({
        checkout_url: checkoutUrl,
        status: "checkout",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw new Error(`Failed to generate checkout: ${error.message}`);

    await this.supabase.from("system_logs").insert(
      createStructuredLog({
        eventType: "commerce",
        level: "info",
        message: `Checkout generated for session ${sessionId}`,
        context: { sessionId, totalValue: session.totalValue, itemCount: session.cart.length },
      }),
    );

    const updated = (await this.getSession(sessionId))!;
    return { checkoutUrl, session: updated };
  }

  async getCommerceAnalytics(sellerKey?: string): Promise<CommerceAnalytics> {
    let query = this.supabase.from("commerce_sessions").select("status, total_value");

    if (sellerKey) query = query.eq("seller_key", sellerKey);

    const { data } = await query;
    const sessions = data ?? [];

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s) => s.status === "active" || s.status === "cart").length;
    const completedSessions = sessions.filter((s) => s.status === "completed").length;
    const abandonedSessions = sessions.filter((s) => s.status === "abandoned").length;
    const totalRevenue = sessions
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.total_value ?? 0), 0);

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      abandonedSessions,
      conversionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
      totalRevenue,
    };
  }

  async listSessions(
    opts?: string | { sellerKey?: string; status?: CommerceSessionStatus; limit?: number },
  ): Promise<CommerceSession[]> {
    const sellerKey = typeof opts === "string" ? opts : opts?.sellerKey;
    const status = typeof opts === "object" ? opts?.status : undefined;
    const limit = typeof opts === "object" ? opts?.limit : undefined;

    let query = this.supabase
      .from("commerce_sessions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 100);

    if (sellerKey) query = query.eq("seller_key", sellerKey);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list commerce sessions: ${error.message}`);

    return (data as CommerceSessionRow[]).map(rowToSession);
  }

  async getAnalytics(opts?: { sellerKey?: string }): Promise<CommerceAnalytics> {
    return this.getCommerceAnalytics(opts?.sellerKey);
  }

  /* ── Private helpers ── */

  private async getSession(sessionId: string): Promise<CommerceSession | null> {
    const { data, error } = await this.supabase
      .from("commerce_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error || !data) return null;
    return rowToSession(data as CommerceSessionRow);
  }

  private async generateAIReply(
    session: CommerceSession,
    catalog: CatalogItem[],
    history: ChatMessage[],
  ): Promise<string> {
    if (!appEnv.aiConfigured) {
      return "Desculpe, nosso assistente esta temporariamente indisponivel. Um atendente humano vai te ajudar em breve!";
    }

    const catalogSummary = catalog
      .filter((i) => i.available)
      .map((i) => `- ${i.name}: ${this.formatCurrency(i.price)} — ${i.description}`)
      .join("\n");

    const cartSummary =
      session.cart.length > 0
        ? session.cart.map((c) => `- ${c.name} x${c.quantity}: ${this.formatCurrency(c.price * c.quantity)}`).join("\n")
        : "Carrinho vazio";

    const systemPrompt = [
      "Voce e um assistente de vendas por WhatsApp. Seja cordial, objetivo e persuasivo.",
      "Responda SEMPRE em portugues brasileiro.",
      "",
      "CATALOGO DISPONIVEL:",
      catalogSummary || "(nenhum produto cadastrado)",
      "",
      `CARRINHO ATUAL:\n${cartSummary}`,
      "",
      "REGRAS:",
      "- Sugira produtos baseado no que o cliente pede",
      "- Quando o cliente quiser finalizar, diga que vai gerar o link de pagamento",
      "- Respostas curtas (max 3 frases)",
      "- Use emojis moderadamente",
      "- Se nao entender, peca para reformular",
      "- Nunca invente produtos que nao estao no catalogo",
    ].join("\n");

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({
        role: (m.role === "customer" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
    ];

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appEnv.openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.7,
          max_tokens: 300,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        console.error(`[CommerceAI] OpenAI error ${response.status}`);
        return "Desculpe, tive um problema tecnico. Pode repetir?";
      }

      const result = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      return result.choices[0]?.message?.content ?? "Desculpe, nao consegui processar. Pode repetir?";
    } catch (err) {
      console.error(`[CommerceAI] AI reply failed: ${err}`);
      return "Desculpe, tive um problema tecnico. Um atendente vai te ajudar!";
    }
  }

  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }
}

/* ── Singleton ── */

declare global {
  var __commerceAIService__: CommerceAIService | undefined;
}

export function getCommerceAIService(): CommerceAIService {
  if (!globalThis.__commerceAIService__) {
    globalThis.__commerceAIService__ = new CommerceAIService();
  }
  return globalThis.__commerceAIService__;
}
