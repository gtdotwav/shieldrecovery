import { randomUUID } from "node:crypto";
import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getPaymentRecoveryService } from "./payment-recovery-service";
import { getStorageService } from "./storage";
import type {
  CfoMessage,
  CfoConversationRecord,
  CfoInsightRecord,
  FinancialSnapshot,
  CfoChipId,
  CfoChartPayload,
} from "@/server/recovery/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabaseClient = any;

export class CfoAgentService {
  private supabase: UntypedSupabaseClient = null;

  private getDb(): UntypedSupabaseClient {
    if (!this.supabase && appEnv.databaseConfigured) {
      const { createClient } = require("@supabase/supabase-js");
      this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
    }
    return this.supabase;
  }

  // Get comprehensive financial snapshot from all services
  async getFinancialSnapshot(sellerAgentName?: string): Promise<FinancialSnapshot> {
    const recovery = getPaymentRecoveryService();
    const storage = getStorageService();

    const [analytics, contacts, callAnalytics] = await Promise.all([
      recovery.getRecoveryAnalytics(sellerAgentName),
      recovery.getFollowUpContacts(sellerAgentName),
      storage.getCallAnalytics(),
    ]);

    const activeContacts = contacts.filter(c => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST");
    const recoveredContacts = contacts.filter(c => c.lead_status === "RECOVERED");

    // Delinquency by age buckets
    const now = Date.now();
    const byAge: Record<string, number> = { "0-7d": 0, "8-15d": 0, "16-30d": 0, "30d+": 0 };
    for (const c of activeContacts) {
      const days = (now - new Date(c.updated_at).getTime()) / 86_400_000;
      if (days <= 7) byAge["0-7d"]++;
      else if (days <= 15) byAge["8-15d"]++;
      else if (days <= 30) byAge["16-30d"]++;
      else byAge["30d+"]++;
    }

    const recoveredRevenue = recoveredContacts.reduce((s, c) => s + c.payment_value, 0);
    const activeRevenue = activeContacts.reduce((s, c) => s + c.payment_value, 0);
    const whatsappCount = contacts.filter(c => c.phone && c.phone.length > 8).length;
    const emailCount = contacts.filter(c => c.email && c.email.includes("@")).length;

    return {
      recovery: {
        totalFailed: analytics.total_failed_payments,
        recovered: analytics.recovered_payments,
        recoveryRate: analytics.recovery_rate,
        recoveredRevenue: analytics.recovered_revenue,
        avgRecoveryTimeHours: analytics.average_recovery_time_hours,
        activeRecoveries: analytics.active_recoveries,
      },
      activeLeads: activeContacts.length,
      cashFlow: {
        inbound: recoveredRevenue,
        outbound: 0, // placeholder — would come from split/payout data
        net: recoveredRevenue,
        projectedWeek: recoveredRevenue * 0.3, // simple projection
      },
      subscriptions: { active: 0, pastDue: 0, mrr: 0, churnRate: 0 },
      cartAbandonment: { detected: 0, recovered: 0, rate: 0, recoveredValue: 0 },
      upsell: { offered: 0, accepted: 0, conversionRate: 0, revenue: 0 },
      delinquency: { total: activeContacts.length, totalValue: activeRevenue, byAge },
      channels: {
        whatsapp: whatsappCount,
        email: emailCount,
        voice: callAnalytics.totalCalls,
        sms: 0,
      },
      inbox: { open: 0, pending: 0, unread: 0 },
    };
  }

  // Process a quick action chip
  async processQuickAction(chipId: CfoChipId, sellerAgentName?: string): Promise<CfoMessage> {
    const snapshot = await this.getFinancialSnapshot(sellerAgentName);
    const now = new Date().toISOString();

    switch (chipId) {
      case "daily_summary": {
        const chart: CfoChartPayload = {
          type: "metric_cards",
          title: "Resumo do Dia",
          labels: ["Recuperados", "Em andamento", "Taxa", "Receita"],
          datasets: [{
            label: "Hoje",
            data: [snapshot.recovery.recovered, snapshot.recovery.activeRecoveries, Math.round(snapshot.recovery.recoveryRate), snapshot.recovery.recoveredRevenue / 100],
          }],
        };
        return {
          role: "assistant",
          content: `**Resumo do dia:**\n\n• ${snapshot.recovery.recovered} pagamentos recuperados (R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)})\n• ${snapshot.recovery.activeRecoveries} em recuperação ativa\n• Taxa de recuperação: ${snapshot.recovery.recoveryRate.toFixed(1)}%\n• ${snapshot.activeLeads} leads ativos na carteira\n• ${snapshot.channels.whatsapp} contatos via WhatsApp, ${snapshot.channels.email} via email, ${snapshot.channels.voice} ligações\n\nTempo médio de recuperação: ${snapshot.recovery.avgRecoveryTimeHours > 0 ? `${snapshot.recovery.avgRecoveryTimeHours.toFixed(1)}h` : "n/d"}`,
          timestamp: now,
          chipId: "daily_summary",
          chartData: chart,
        };
      }

      case "cash_health": {
        const net = snapshot.cashFlow.net / 100;
        return {
          role: "assistant",
          content: `**Saúde do caixa:**\n\n• Receita recuperada: R$ ${(snapshot.cashFlow.inbound / 100).toFixed(2)}\n• Valor líquido: R$ ${net.toFixed(2)}\n• Projeção próximos 7 dias: R$ ${(snapshot.cashFlow.projectedWeek / 100).toFixed(2)}\n• Receita em risco (inadimplência ativa): R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)}\n\n${net > 0 ? "Fluxo positivo. Operação saudável." : "⚠️ Atenção: fluxo precisa de acompanhamento."}`,
          timestamp: now,
          chipId: "cash_health",
        };
      }

      case "recovery_performance": {
        const chart: CfoChartPayload = {
          type: "bar",
          title: "Performance de Recuperação",
          labels: ["WhatsApp", "Email", "Voz"],
          datasets: [{
            label: "Contatos",
            data: [snapshot.channels.whatsapp, snapshot.channels.email, snapshot.channels.voice],
          }],
        };
        return {
          role: "assistant",
          content: `**Performance de recuperação:**\n\n• ${snapshot.recovery.recovered} de ${snapshot.recovery.totalFailed} pagamentos recuperados\n• Taxa: ${snapshot.recovery.recoveryRate.toFixed(1)}%\n• Tempo médio: ${snapshot.recovery.avgRecoveryTimeHours > 0 ? `${snapshot.recovery.avgRecoveryTimeHours.toFixed(1)}h` : "n/d"}\n• Canais: ${snapshot.channels.whatsapp} WhatsApp, ${snapshot.channels.email} email, ${snapshot.channels.voice} voz`,
          timestamp: now,
          chipId: "recovery_performance",
          chartData: chart,
        };
      }

      case "week_forecast": {
        return {
          role: "assistant",
          content: `**Previsão da semana:**\n\n• Projeção de receita recuperada: R$ ${(snapshot.cashFlow.projectedWeek / 100).toFixed(2)}\n• ${snapshot.recovery.activeRecoveries} leads em processo ativo\n• ${snapshot.delinquency.byAge["0-7d"] || 0} leads recentes (< 7 dias) — maior probabilidade de conversão\n• ${snapshot.delinquency.byAge["30d+"] || 0} leads antigos (> 30 dias) — considerar negativação\n\nRecomendação: Priorizar os ${snapshot.delinquency.byAge["0-7d"] || 0} leads recentes para maximizar taxa de recuperação.`,
          timestamp: now,
          chipId: "week_forecast",
        };
      }

      case "delinquency": {
        const chart: CfoChartPayload = {
          type: "bar",
          title: "Inadimplência por Idade",
          labels: Object.keys(snapshot.delinquency.byAge),
          datasets: [{
            label: "Leads",
            data: Object.values(snapshot.delinquency.byAge),
          }],
        };
        return {
          role: "assistant",
          content: `**Inadimplência atual:**\n\n• Total: ${snapshot.delinquency.total} leads inadimplentes\n• Valor em risco: R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)}\n\n**Por faixa de atraso:**\n• 0-7 dias: ${snapshot.delinquency.byAge["0-7d"] || 0}\n• 8-15 dias: ${snapshot.delinquency.byAge["8-15d"] || 0}\n• 16-30 dias: ${snapshot.delinquency.byAge["16-30d"] || 0}\n• 30+ dias: ${snapshot.delinquency.byAge["30d+"] || 0}`,
          timestamp: now,
          chipId: "delinquency",
          chartData: chart,
        };
      }

      case "urgent_actions": {
        return {
          role: "assistant",
          content: `**Ações urgentes:**\n\n${snapshot.recovery.activeRecoveries > 0 ? `• ${snapshot.recovery.activeRecoveries} leads aguardam ação de recuperação` : "• Nenhuma recuperação pendente"}\n${snapshot.delinquency.byAge["0-7d"] ? `• ${snapshot.delinquency.byAge["0-7d"]} leads novos sem contato — prioridade máxima` : ""}\n${snapshot.delinquency.byAge["30d+"] ? `• ${snapshot.delinquency.byAge["30d+"]} leads > 30 dias — avaliar negativação` : ""}\n${snapshot.channels.voice === 0 ? "• Canal de voz sem uso — ativar para leads de alto valor" : ""}\n\nO agente autônomo está operando ${snapshot.recovery.activeRecoveries > 0 ? "e processando a fila." : "sem pendências no momento."}`,
          timestamp: now,
          chipId: "urgent_actions",
        };
      }

      case "channel_performance": {
        const total = snapshot.channels.whatsapp + snapshot.channels.email + snapshot.channels.voice + snapshot.channels.sms;
        const chart: CfoChartPayload = {
          type: "donut",
          title: "Distribuição por Canal",
          labels: ["WhatsApp", "Email", "Voz", "SMS"],
          datasets: [{
            label: "Contatos",
            data: [snapshot.channels.whatsapp, snapshot.channels.email, snapshot.channels.voice, snapshot.channels.sms],
          }],
        };
        return {
          role: "assistant",
          content: `**Performance por canal:**\n\n• WhatsApp: ${snapshot.channels.whatsapp} contatos (${total > 0 ? Math.round(snapshot.channels.whatsapp / total * 100) : 0}%)\n• Email: ${snapshot.channels.email} contatos (${total > 0 ? Math.round(snapshot.channels.email / total * 100) : 0}%)\n• Voz: ${snapshot.channels.voice} contatos (${total > 0 ? Math.round(snapshot.channels.voice / total * 100) : 0}%)\n• SMS: ${snapshot.channels.sms} contatos\n\nTotal: ${total} pontos de contato`,
          timestamp: now,
          chipId: "channel_performance",
          chartData: chart,
        };
      }

      case "month_comparison": {
        return {
          role: "assistant",
          content: `**Comparação mensal:**\n\n• Recuperações: ${snapshot.recovery.recovered}\n• Receita recuperada: R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)}\n• Taxa de recuperação: ${snapshot.recovery.recoveryRate.toFixed(1)}%\n• Leads ativos: ${snapshot.activeLeads}\n\n_Dados comparativos com mês anterior serão disponibilizados quando houver histórico suficiente._`,
          timestamp: now,
          chipId: "month_comparison",
        };
      }

      default:
        return { role: "assistant", content: "Comando não reconhecido.", timestamp: now };
    }
  }

  // Free-form chat with AI
  async chat(userMessage: string, conversationId?: string, userEmail?: string, userRole?: string): Promise<{ reply: CfoMessage; conversationId: string }> {
    const db = this.getDb();
    const id = conversationId || randomUUID();
    const now = new Date().toISOString();

    // Load existing messages
    let existingMessages: CfoMessage[] = [];
    if (conversationId && db) {
      const { data } = await db.from("cfo_conversations").select("messages").eq("id", conversationId).single();
      if (data) existingMessages = data.messages || [];
    }

    // Add user message
    const userMsg: CfoMessage = { role: "user", content: userMessage, timestamp: now };
    existingMessages.push(userMsg);

    // Get financial context
    const snapshot = await this.getFinancialSnapshot();
    const systemPrompt = this.buildSystemPrompt(snapshot);

    // Call AI
    const apiKey = appEnv.openAiApiKey;
    let replyContent = "Desculpe, não consegui processar sua pergunta no momento.";

    if (apiKey) {
      try {
        const aiMessages = [
          { role: "system", content: systemPrompt },
          ...existingMessages.slice(-20).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: aiMessages,
            max_tokens: 1500,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          replyContent = data.choices?.[0]?.message?.content || replyContent;
        }
      } catch (error) {
        createStructuredLog({
          eventType: "unsupported",
          level: "warn",
          message: `[cfo-agent] AI call failed: ${error instanceof Error ? error.message : "unknown"}`,
          context: { error: error instanceof Error ? error.message : "unknown" },
        });
      }
    }

    const assistantMsg: CfoMessage = { role: "assistant", content: replyContent, timestamp: new Date().toISOString() };
    existingMessages.push(assistantMsg);

    // Persist conversation
    if (db) {
      const title = existingMessages.find(m => m.role === "user")?.content.slice(0, 60) || "Conversa CFO";
      await db.from("cfo_conversations").upsert({
        id,
        user_email: userEmail || "unknown",
        user_role: userRole || "admin",
        title,
        messages: existingMessages,
        updated_at: new Date().toISOString(),
      });
    }

    return { reply: assistantMsg, conversationId: id };
  }

  // Get unread insights count
  async getUnreadInsightsCount(sellerKey?: string): Promise<number> {
    const db = this.getDb();
    if (!db) return 0;

    let query = db.from("cfo_insights").select("id", { count: "exact", head: true }).eq("read", false);
    if (sellerKey) query = query.or(`seller_key.eq.${sellerKey},seller_key.is.null`);

    const { count } = await query;
    return count || 0;
  }

  // List insights
  async listInsights(sellerKey?: string, limit = 10): Promise<CfoInsightRecord[]> {
    const db = this.getDb();
    if (!db) return [];

    let query = db.from("cfo_insights").select("*").order("created_at", { ascending: false }).limit(limit);
    if (sellerKey) query = query.or(`seller_key.eq.${sellerKey},seller_key.is.null`);

    const { data } = await query;
    return (data || []).map(this.mapInsightRow);
  }

  // Mark insight as read
  async markInsightRead(id: string): Promise<void> {
    const db = this.getDb();
    if (!db) return;
    await db.from("cfo_insights").update({ read: true, read_at: new Date().toISOString() }).eq("id", id);
  }

  // Generate ElevenLabs voice session URL
  async generateVoiceSessionUrl(): Promise<{ wsUrl: string } | null> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey || !agentId) return null;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return { wsUrl: data.signed_url };
    } catch {
      return null;
    }
  }

  // Build system prompt with financial context
  private buildSystemPrompt(snapshot: FinancialSnapshot): string {
    return `Você é o CFO Autônomo da PagRecovery — um agente de inteligência financeira que opera a receita da empresa.

Você tem acesso em tempo real aos dados financeiros da operação. Responda em português brasileiro, de forma direta e acionável.

DADOS ATUAIS DA OPERAÇÃO:
- Pagamentos recuperados: ${snapshot.recovery.recovered} de ${snapshot.recovery.totalFailed} (${snapshot.recovery.recoveryRate.toFixed(1)}%)
- Receita recuperada: R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)}
- Recuperações ativas: ${snapshot.recovery.activeRecoveries}
- Tempo médio de recuperação: ${snapshot.recovery.avgRecoveryTimeHours.toFixed(1)}h
- Leads ativos: ${snapshot.activeLeads}
- Inadimplência total: ${snapshot.delinquency.total} leads (R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)})
- Inadimplência por idade: ${JSON.stringify(snapshot.delinquency.byAge)}
- Canais: WhatsApp ${snapshot.channels.whatsapp}, Email ${snapshot.channels.email}, Voz ${snapshot.channels.voice}
- Fluxo de caixa líquido: R$ ${(snapshot.cashFlow.net / 100).toFixed(2)}

REGRAS:
- Seja direto e conciso
- Use dados reais, nunca invente números
- Quando relevante, sugira ações específicas
- Para perguntas fora do escopo financeiro, redirecione educadamente
- Formate com markdown (bold, listas, etc.)
- Valores monetários sempre em R$ com 2 casas decimais
- Nunca exponha dados sensíveis de clientes individuais`;
  }

  private mapInsightRow(row: Record<string, unknown>): CfoInsightRecord {
    return {
      id: row.id as string,
      sellerKey: row.seller_key as string | undefined,
      category: row.category as CfoInsightRecord["category"],
      severity: row.severity as CfoInsightRecord["severity"],
      title: row.title as string,
      body: row.body as string,
      data: (row.data || {}) as Record<string, unknown>,
      read: row.read as boolean,
      readAt: row.read_at as string | undefined,
      expiresAt: row.expires_at as string | undefined,
      createdAt: row.created_at as string,
    };
  }
}

// Singleton
declare global {
  var __cfoAgentService__: CfoAgentService | undefined;
}

export function getCfoAgentService(): CfoAgentService {
  if (!globalThis.__cfoAgentService__) {
    globalThis.__cfoAgentService__ = new CfoAgentService();
  }
  return globalThis.__cfoAgentService__;
}
