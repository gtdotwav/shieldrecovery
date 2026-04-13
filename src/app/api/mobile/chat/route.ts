import { requireApiAuth } from "@/server/auth/request";
import { apiOk, apiError, corsOptions, isErrorResponse } from "@/server/recovery/utils/api-response";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { appEnv } from "@/server/recovery/config";

export function OPTIONS() {
  return corsOptions();
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * POST /api/mobile/chat
 * AI chat for the seller.
 * Body: { message: string, history?: ChatMessage[] }
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(request, ["admin", "seller"]);
  if (isErrorResponse(auth)) return auth;

  if (!appEnv.aiConfigured) {
    return apiError("AI not configured", 503);
  }

  try {
    const body = await request.json();
    const userMessage = String(body.message || "").trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return apiError("Message is required", 400);
    }

    // Gather seller metrics for context
    const service = getPaymentRecoveryService();
    const [analytics, contacts] = await Promise.all([
      service.getRecoveryAnalytics(),
      service.getFollowUpContacts(),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const recovered = contacts.filter((c) => c.lead_status === "RECOVERED");
    const active = contacts.filter(
      (c) => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST",
    );

    const todayRecovered = recovered.filter(
      (c) => c.updated_at && new Date(c.updated_at) >= todayStart,
    );
    const weekRecovered = recovered.filter(
      (c) => c.updated_at && new Date(c.updated_at) >= weekStart,
    );

    const todayAmount = todayRecovered.reduce((s, c) => s + (c.payment_value || 0), 0);
    const weekAmount = weekRecovered.reduce((s, c) => s + (c.payment_value || 0), 0);
    const totalLeads = contacts.length || 1;
    const conversionRate = ((recovered.length / totalLeads) * 100).toFixed(1);

    const leadsByStatus: Record<string, number> = {};
    for (const c of contacts) {
      leadsByStatus[c.lead_status] = (leadsByStatus[c.lead_status] || 0) + 1;
    }

    const systemPrompt = `You are a helpful AI assistant for PagRecovery, a payment recovery platform.
You help sellers understand their recovery metrics, give tips on improving conversion, and answer questions about the platform.

Current seller metrics:
- Total recovered all time: ${recovered.length} payments (R$ ${recovered.reduce((s, c) => s + (c.payment_value || 0), 0).toFixed(2)})
- Recovered today: ${todayRecovered.length} payments (R$ ${todayAmount.toFixed(2)})
- Recovered this week: ${weekRecovered.length} payments (R$ ${weekAmount.toFixed(2)})
- Active leads: ${active.length}
- Conversion rate: ${conversionRate}%
- Pipeline breakdown: ${JSON.stringify(leadsByStatus)}
- Total failed payments tracked: ${analytics.total_failed_payments}
- Average recovery time: ${analytics.average_recovery_time_hours.toFixed(1)} hours

Respond in Portuguese (Brazilian). Be concise, helpful, and data-driven.
If the seller asks about features or actions you cannot perform, explain clearly what is and isn't possible.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-20), // Keep last 20 messages for context
      { role: "user", content: userMessage },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appEnv.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[mobile/chat] OpenAI error:", response.status, errorBody);
      return apiError("AI service unavailable", 502);
    }

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content || "Desculpe, nao consegui gerar uma resposta.";

    return apiOk({ reply });
  } catch (err) {
    console.error("[mobile/chat]", err);
    return apiError("Failed to generate AI response", 500);
  }
}
