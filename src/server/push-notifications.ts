import { getStorageService } from "@/server/recovery/services/storage";

// ── Expo Push Notification Service ──────────────────────────────
// Sends push notifications to mobile app via Expo Push API.
// Tokens are Expo push tokens stored in the push_tokens table.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

interface PushTicket {
  id?: string;
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<PushTicket[]> {
  if (tokens.length === 0) return [];

  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
    channelId: "default",
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error("[push] Expo Push API error:", response.status);
      return [];
    }

    const result = await response.json();
    const tickets: PushTicket[] = result.data || [];

    // Deactivate invalid tokens
    const invalidTokens: string[] = [];
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        invalidTokens.push(tokens[i]);
      }
    }

    if (invalidTokens.length > 0) {
      deactivateTokens(invalidTokens).catch((err) =>
        console.error("[push] Failed to deactivate tokens:", err),
      );
    }

    return tickets;
  } catch (err) {
    console.error("[push] Send error:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Convenience: send to all tokens for a user ──────────────────

export async function notifyUser(
  userEmail: string,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const tokens = await getActiveTokensForUser(userEmail);
  if (tokens.length === 0) return;
  return sendPushNotification(tokens, title, body, data);
}

// ── Convenience: send to ALL registered users ───────────────────

export async function notifyAllUsers(
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const tokens = await getAllActiveTokens();
  if (tokens.length === 0) return;
  return sendPushNotification(tokens, title, body, data);
}

// ── Recovery-specific notifications ─────────────────────────────

export async function notifyPaymentRecovered(
  customerName: string,
  amount: number,
) {
  const amountFormatted = (amount / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return notifyAllUsers(
    "Pagamento recuperado!",
    `${customerName} pagou ${amountFormatted}`,
    { type: "recovery" },
  );
}

export async function notifyPayoutCompleted(
  userEmail: string,
  amount: number,
) {
  const amountFormatted = (amount / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return notifyUser(
    userEmail,
    "Saque processado!",
    `Seu saque de ${amountFormatted} foi concluido.`,
    { type: "payout" },
  );
}

export async function notifyNewLead(customerName: string, amount: number) {
  const amountFormatted = (amount / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return notifyAllUsers(
    "Novo lead de recuperacao",
    `${customerName} - ${amountFormatted} falhou`,
    { type: "lead" },
  );
}

// ── Token management (direct Supabase) ──────────────────────────

async function getActiveTokensForUser(userEmail: string): Promise<string[]> {
  const storage = getStorageService();
  const db = storage.getClient();
  const { data } = await db
    .from("push_tokens")
    .select("token")
    .eq("user_email", userEmail)
    .eq("active", true);
  return (data || []).map((row: { token: string }) => row.token);
}

async function getAllActiveTokens(): Promise<string[]> {
  const storage = getStorageService();
  const db = storage.getClient();
  const { data } = await db
    .from("push_tokens")
    .select("token")
    .eq("active", true);
  return (data || []).map((row: { token: string }) => row.token);
}

async function deactivateTokens(tokens: string[]) {
  const storage = getStorageService();
  const db = storage.getClient();
  await db
    .from("push_tokens")
    .update({ active: false, updated_at: new Date().toISOString() })
    .in("token", tokens);
}
