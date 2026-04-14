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

/** Context resolved from the authenticated session — passed into every CFO method. */
export type CfoSellerContext = {
  email: string;
  role: string;
  sellerAgentName?: string;
  sellerDisplayName?: string;
  sellerKey?: string;
};

export class CfoAgentService {
  private supabase: UntypedSupabaseClient = null;

  private getDb(): UntypedSupabaseClient {
    if (!this.supabase && appEnv.databaseConfigured) {
      const { createClient } = require("@supabase/supabase-js");
      this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
    }
    return this.supabase;
  }

  /* ═══════════════════════════════════════════════════════
   *  Financial Snapshot — scoped to seller when provided
   * ═══════════════════════════════════════════════════════ */

  async getFinancialSnapshot(ctx?: CfoSellerContext): Promise<FinancialSnapshot> {
    const recovery = getPaymentRecoveryService();
    const storage = getStorageService();
    const agentName = ctx?.sellerAgentName;

    const [analytics, contacts, callAnalytics] = await Promise.all([
      recovery.getRecoveryAnalytics(agentName),
      recovery.getFollowUpContacts(agentName),
      storage.getCallAnalytics(),
    ]);

    const activeContacts = contacts.filter(c => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST");
    const recoveredContacts = contacts.filter(c => c.lead_status === "RECOVERED");

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
        outbound: 0,
        net: recoveredRevenue,
        projectedWeek: recoveredRevenue * 0.3,
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

  /* ═══════════════════════════════════════════════════════
   *  Quick Action Chips — scoped to seller
   * ═══════════════════════════════════════════════════════ */

  async processQuickAction(chipId: CfoChipId, ctx?: CfoSellerContext): Promise<CfoMessage> {
    const snapshot = await this.getFinancialSnapshot(ctx);
    const now = new Date().toISOString();
    const sellerLabel = ctx?.sellerDisplayName ? ` (${ctx.sellerDisplayName})` : "";

    switch (chipId) {
      case "daily_summary": {
        const chart: CfoChartPayload = {
          type: "metric_cards",
          title: `Resumo do Dia${sellerLabel}`,
          labels: ["Recuperados", "Em andamento", "Taxa", "Receita"],
          datasets: [{
            label: "Hoje",
            data: [snapshot.recovery.recovered, snapshot.recovery.activeRecoveries, Math.round(snapshot.recovery.recoveryRate), snapshot.recovery.recoveredRevenue / 100],
          }],
        };
        return {
          role: "assistant",
          content: `**Resumo do dia${sellerLabel}:**\n\n• ${snapshot.recovery.recovered} pagamentos recuperados (R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)})\n• ${snapshot.recovery.activeRecoveries} em recuperação ativa\n• Taxa de recuperação: ${snapshot.recovery.recoveryRate.toFixed(1)}%\n• ${snapshot.activeLeads} leads ativos na carteira\n• ${snapshot.channels.whatsapp} contatos via WhatsApp, ${snapshot.channels.email} via email, ${snapshot.channels.voice} ligações\n\nTempo médio de recuperação: ${snapshot.recovery.avgRecoveryTimeHours > 0 ? `${snapshot.recovery.avgRecoveryTimeHours.toFixed(1)}h` : "n/d"}`,
          timestamp: now,
          chipId: "daily_summary",
          chartData: chart,
        };
      }

      case "cash_health": {
        const net = snapshot.cashFlow.net / 100;
        return {
          role: "assistant",
          content: `**Saúde do caixa${sellerLabel}:**\n\n• Receita recuperada: R$ ${(snapshot.cashFlow.inbound / 100).toFixed(2)}\n• Valor líquido: R$ ${net.toFixed(2)}\n• Projeção próximos 7 dias: R$ ${(snapshot.cashFlow.projectedWeek / 100).toFixed(2)}\n• Receita em risco (inadimplência ativa): R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)}\n\n${net > 0 ? "Fluxo positivo. Operação saudável." : "⚠️ Atenção: fluxo precisa de acompanhamento."}`,
          timestamp: now,
          chipId: "cash_health",
        };
      }

      case "recovery_performance": {
        const chart: CfoChartPayload = {
          type: "bar",
          title: `Performance de Recuperação${sellerLabel}`,
          labels: ["WhatsApp", "Email", "Voz"],
          datasets: [{
            label: "Contatos",
            data: [snapshot.channels.whatsapp, snapshot.channels.email, snapshot.channels.voice],
          }],
        };
        return {
          role: "assistant",
          content: `**Performance de recuperação${sellerLabel}:**\n\n• ${snapshot.recovery.recovered} de ${snapshot.recovery.totalFailed} pagamentos recuperados\n• Taxa: ${snapshot.recovery.recoveryRate.toFixed(1)}%\n• Tempo médio: ${snapshot.recovery.avgRecoveryTimeHours > 0 ? `${snapshot.recovery.avgRecoveryTimeHours.toFixed(1)}h` : "n/d"}\n• Canais: ${snapshot.channels.whatsapp} WhatsApp, ${snapshot.channels.email} email, ${snapshot.channels.voice} voz`,
          timestamp: now,
          chipId: "recovery_performance",
          chartData: chart,
        };
      }

      case "week_forecast":
        return {
          role: "assistant",
          content: `**Previsão da semana${sellerLabel}:**\n\n• Projeção de receita recuperada: R$ ${(snapshot.cashFlow.projectedWeek / 100).toFixed(2)}\n• ${snapshot.recovery.activeRecoveries} leads em processo ativo\n• ${snapshot.delinquency.byAge["0-7d"] || 0} leads recentes (< 7 dias) — maior probabilidade de conversão\n• ${snapshot.delinquency.byAge["30d+"] || 0} leads antigos (> 30 dias) — considerar negativação\n\nRecomendação: Priorizar os ${snapshot.delinquency.byAge["0-7d"] || 0} leads recentes para maximizar taxa de recuperação.`,
          timestamp: now,
          chipId: "week_forecast",
        };

      case "delinquency": {
        const chart: CfoChartPayload = {
          type: "bar",
          title: `Inadimplência por Idade${sellerLabel}`,
          labels: Object.keys(snapshot.delinquency.byAge),
          datasets: [{ label: "Leads", data: Object.values(snapshot.delinquency.byAge) }],
        };
        return {
          role: "assistant",
          content: `**Inadimplência atual${sellerLabel}:**\n\n• Total: ${snapshot.delinquency.total} leads inadimplentes\n• Valor em risco: R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)}\n\n**Por faixa de atraso:**\n• 0-7 dias: ${snapshot.delinquency.byAge["0-7d"] || 0}\n• 8-15 dias: ${snapshot.delinquency.byAge["8-15d"] || 0}\n• 16-30 dias: ${snapshot.delinquency.byAge["16-30d"] || 0}\n• 30+ dias: ${snapshot.delinquency.byAge["30d+"] || 0}`,
          timestamp: now,
          chipId: "delinquency",
          chartData: chart,
        };
      }

      case "urgent_actions":
        return {
          role: "assistant",
          content: `**Ações urgentes${sellerLabel}:**\n\n${snapshot.recovery.activeRecoveries > 0 ? `• ${snapshot.recovery.activeRecoveries} leads aguardam ação de recuperação` : "• Nenhuma recuperação pendente"}\n${snapshot.delinquency.byAge["0-7d"] ? `• ${snapshot.delinquency.byAge["0-7d"]} leads novos sem contato — prioridade máxima` : ""}\n${snapshot.delinquency.byAge["30d+"] ? `• ${snapshot.delinquency.byAge["30d+"]} leads > 30 dias — avaliar negativação` : ""}\n${snapshot.channels.voice === 0 ? "• Canal de voz sem uso — ativar para leads de alto valor" : ""}\n\nO agente autônomo está operando ${snapshot.recovery.activeRecoveries > 0 ? "e processando a fila." : "sem pendências no momento."}`,
          timestamp: now,
          chipId: "urgent_actions",
        };

      case "channel_performance": {
        const total = snapshot.channels.whatsapp + snapshot.channels.email + snapshot.channels.voice + snapshot.channels.sms;
        const chart: CfoChartPayload = {
          type: "donut",
          title: `Distribuição por Canal${sellerLabel}`,
          labels: ["WhatsApp", "Email", "Voz", "SMS"],
          datasets: [{
            label: "Contatos",
            data: [snapshot.channels.whatsapp, snapshot.channels.email, snapshot.channels.voice, snapshot.channels.sms],
          }],
        };
        return {
          role: "assistant",
          content: `**Performance por canal${sellerLabel}:**\n\n• WhatsApp: ${snapshot.channels.whatsapp} contatos (${total > 0 ? Math.round(snapshot.channels.whatsapp / total * 100) : 0}%)\n• Email: ${snapshot.channels.email} contatos (${total > 0 ? Math.round(snapshot.channels.email / total * 100) : 0}%)\n• Voz: ${snapshot.channels.voice} contatos (${total > 0 ? Math.round(snapshot.channels.voice / total * 100) : 0}%)\n• SMS: ${snapshot.channels.sms} contatos\n\nTotal: ${total} pontos de contato`,
          timestamp: now,
          chipId: "channel_performance",
          chartData: chart,
        };
      }

      case "month_comparison":
        return {
          role: "assistant",
          content: `**Comparação mensal${sellerLabel}:**\n\n• Recuperações: ${snapshot.recovery.recovered}\n• Receita recuperada: R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)}\n• Taxa de recuperação: ${snapshot.recovery.recoveryRate.toFixed(1)}%\n• Leads ativos: ${snapshot.activeLeads}\n\n_Dados comparativos com mês anterior serão disponibilizados quando houver histórico suficiente._`,
          timestamp: now,
          chipId: "month_comparison",
        };

      default:
        return { role: "assistant", content: "Comando não reconhecido.", timestamp: now };
    }
  }

  /* ═══════════════════════════════════════════════════════
   *  Free-form Chat — scoped to seller
   * ═══════════════════════════════════════════════════════ */

  async chat(
    userMessage: string,
    ctx: CfoSellerContext,
    conversationId?: string,
  ): Promise<{ reply: CfoMessage; conversationId: string }> {
    const db = this.getDb();
    const id = conversationId || randomUUID();
    const now = new Date().toISOString();
    const sellerKey = ctx.sellerAgentName || ctx.sellerKey;

    // Load existing messages (scoped to seller via conversation ownership)
    let existingMessages: CfoMessage[] = [];
    if (conversationId && db) {
      const query = db.from("cfo_conversations").select("messages, seller_key").eq("id", conversationId);
      const { data } = await query.single();
      // Verify conversation belongs to this seller (or is admin)
      if (data) {
        if (ctx.role === "admin" || !data.seller_key || data.seller_key === sellerKey) {
          existingMessages = data.messages || [];
        }
      }
    }

    const userMsg: CfoMessage = { role: "user", content: userMessage, timestamp: now };
    existingMessages.push(userMsg);

    // Get seller-scoped financial context
    const snapshot = await this.getFinancialSnapshot(ctx);
    const systemPrompt = this.buildSystemPrompt(snapshot, ctx);

    const apiKey = appEnv.openAiApiKey;
    let replyContent = "Desculpe, não consegui processar sua pergunta no momento.";

    if (apiKey) {
      try {
        const aiMessages = [
          { role: "system", content: systemPrompt },
          ...existingMessages.slice(-20).map(m => ({
            role: m.role === "assistant" ? "assistant" as const : "user" as const,
            content: m.content,
          })),
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: aiMessages, max_tokens: 1500, temperature: 0.7 }),
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

    // Persist conversation scoped to seller
    if (db) {
      const title = existingMessages.find(m => m.role === "user")?.content.slice(0, 60) || "Conversa CFO";
      await db.from("cfo_conversations").upsert({
        id,
        user_email: ctx.email,
        user_role: ctx.role,
        seller_key: sellerKey || null,
        title,
        messages: existingMessages,
        updated_at: new Date().toISOString(),
      });
    }

    return { reply: assistantMsg, conversationId: id };
  }

  /* ═══════════════════════════════════════════════════════
   *  Insights — already seller-aware
   * ═══════════════════════════════════════════════════════ */

  async getUnreadInsightsCount(sellerKey?: string): Promise<number> {
    const db = this.getDb();
    if (!db) return 0;
    let query = db.from("cfo_insights").select("id", { count: "exact", head: true }).eq("read", false);
    if (sellerKey) query = query.or(`seller_key.eq.${sellerKey},seller_key.is.null`);
    const { count } = await query;
    return count || 0;
  }

  async listInsights(sellerKey?: string, limit = 10): Promise<CfoInsightRecord[]> {
    const db = this.getDb();
    if (!db) return [];
    let query = db.from("cfo_insights").select("*").order("created_at", { ascending: false }).limit(limit);
    if (sellerKey) query = query.or(`seller_key.eq.${sellerKey},seller_key.is.null`);
    const { data } = await query;
    return (data || []).map(this.mapInsightRow);
  }

  async markInsightRead(id: string): Promise<void> {
    const db = this.getDb();
    if (!db) return;
    await db.from("cfo_insights").update({ read: true, read_at: new Date().toISOString() }).eq("id", id);
  }

  /* ═══════════════════════════════════════════════════════
   *  Voice Session — seller-scoped
   * ═══════════════════════════════════════════════════════ */

  async generateVoiceSessionUrl(ctx?: CfoSellerContext): Promise<{
    wsUrl: string;
    systemPrompt: string;
    firstMessage: string;
  } | null> {
    const apiKey = appEnv.elevenLabsApiKey;
    const agentId = appEnv.elevenLabsAgentId;
    if (!apiKey || !agentId) {
      console.error(`[cfo-voice] Missing env: apiKey=${!!apiKey}, agentId=${!!agentId}`);
      return null;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      { method: "GET", headers: { "xi-api-key": apiKey } },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`ElevenLabs API ${response.status}: ${body}`);
    }

    const data = await response.json();
    if (!data.signed_url) throw new Error("ElevenLabs returned no signed_url");

    let systemPrompt: string;
    try {
      const snapshot = await this.getFinancialSnapshot(ctx);
      systemPrompt = this.buildVoiceSystemPrompt(snapshot, ctx);
    } catch {
      systemPrompt = `Você é o CFO Autônomo da PagRecovery — um diretor financeiro virtual.
Fale em português brasileiro, de forma natural e direta. Os dados financeiros detalhados não estão disponíveis neste momento, mas você pode conversar sobre gestão, estratégia e responder perguntas gerais.`;
    }

    const sellerName = ctx?.sellerDisplayName || "parceiro";
    const firstMessage =
      `Oi${ctx?.sellerDisplayName ? `, ${ctx.sellerDisplayName}` : ""}! Sou seu CFO autônomo e estou aqui para nossa reunião. ` +
      "Gostaria de recapitular como está a sua operação ou tem algum assunto específico para começarmos?";

    return { wsUrl: data.signed_url, systemPrompt, firstMessage };
  }

  /* ═══════════════════════════════════════════════════════
   *  Prompt Builders — personalized per seller
   * ═══════════════════════════════════════════════════════ */

  private buildSystemPrompt(snapshot: FinancialSnapshot, ctx?: CfoSellerContext): string {
    const sellerIntro = ctx?.sellerDisplayName
      ? `Você está conversando com ${ctx.sellerDisplayName} (${ctx.email}), um ${ctx.role === "admin" ? "administrador" : "lojista"} da plataforma.`
      : "Você está conversando com o administrador da plataforma.";

    const scopeNote = ctx?.sellerAgentName
      ? `\nIMPORTANTE: Todos os dados abaixo são exclusivos deste lojista (${ctx.sellerDisplayName || ctx.sellerAgentName}). NÃO misture com dados de outros lojistas.`
      : "\nVocê tem visão global de todos os lojistas.";

    return `Você é o CFO Autônomo da PagRecovery — um agente de inteligência financeira pessoal.

${sellerIntro}${scopeNote}

Responda em português brasileiro, de forma direta e acionável.

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
- Formate com markdown (bold, listas, etc.)
- Valores monetários sempre em R$ com 2 casas decimais
- Nunca exponha dados sensíveis de clientes individuais
- Se o lojista perguntar sobre dados de outros lojistas, recuse educadamente`;
  }

  private buildVoiceSystemPrompt(snapshot: FinancialSnapshot, ctx?: CfoSellerContext): string {
    const sellerIntro = ctx?.sellerDisplayName
      ? `Você está em reunião com ${ctx.sellerDisplayName}, um ${ctx.role === "admin" ? "administrador" : "lojista"} da PagRecovery.`
      : "Você está em reunião com o responsável pela operação.";

    const scopeNote = ctx?.sellerAgentName
      ? ` Todos os dados são exclusivos deste lojista.`
      : " Você tem visão global da plataforma.";

    return `Você é o CFO Autônomo da PagRecovery — um diretor financeiro virtual que conduz reuniões de gestão.

${sellerIntro}${scopeNote}

PERSONALIDADE:
- Fale de forma natural e fluida, como um CFO real em uma reunião
- Seja direto mas amigável, use linguagem coloquial brasileira
- Chame o usuário de "você"${ctx?.sellerDisplayName ? ` ou "${ctx.sellerDisplayName}"` : ""}
- Quando apresentar números, arredonde para facilitar a compreensão oral
- Use pausas naturais e organize as informações em blocos curtos
- NUNCA use stage directions entre colchetes como [Com paciência], [pausado], [Com confiança] — essas marcações são lidas em voz alta e soam artificiais. Apenas fale naturalmente.

DADOS ATUAIS DA OPERAÇÃO:
- Pagamentos recuperados: ${snapshot.recovery.recovered} de ${snapshot.recovery.totalFailed} (taxa de ${snapshot.recovery.recoveryRate.toFixed(1)}%)
- Receita recuperada: R$ ${(snapshot.recovery.recoveredRevenue / 100).toFixed(2)}
- Recuperações em andamento: ${snapshot.recovery.activeRecoveries}
- Tempo médio de recuperação: ${snapshot.recovery.avgRecoveryTimeHours.toFixed(1)} horas
- Leads ativos: ${snapshot.activeLeads}
- Inadimplência total: ${snapshot.delinquency.total} leads, R$ ${(snapshot.delinquency.totalValue / 100).toFixed(2)} em risco
- Inadimplência por idade: 0-7d: ${snapshot.delinquency.byAge["0-7d"] || 0}, 8-15d: ${snapshot.delinquency.byAge["8-15d"] || 0}, 16-30d: ${snapshot.delinquency.byAge["16-30d"] || 0}, 30d+: ${snapshot.delinquency.byAge["30d+"] || 0}
- Canais: WhatsApp ${snapshot.channels.whatsapp}, Email ${snapshot.channels.email}, Voz ${snapshot.channels.voice}
- Fluxo de caixa líquido: R$ ${(snapshot.cashFlow.net / 100).toFixed(2)}

REGRAS:
- Sempre use dados reais, nunca invente números
- Sugira ações específicas e acionáveis
- Valores em reais, arredondados para facilitar compreensão oral
- Mantenha respostas concisas — é uma conversa, não um relatório
- Nunca revele dados de outros lojistas`;
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
