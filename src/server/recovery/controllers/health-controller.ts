import { NextResponse } from "next/server";

import { appEnv } from "@/server/recovery/config";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { getStorageService } from "@/server/recovery/services/storage";

export async function handleHealthCheck(request: Request) {
  const baseUrl = new URL(request.url).origin;
  const runtime = await getConnectionSettingsService().getRuntimeSettings();

  let counts: Record<string, number> = {};
  let storageMode = "unknown";

  try {
    const storage = getStorageService();
    storageMode = storage.mode;

    const analytics = await storage.getAnalytics();
    const contacts = await storage.getFollowUpContacts();
    const inbox = await storage.getInboxConversations();

    const activeLeads = contacts.filter(
      (contact) =>
        contact.lead_status !== "RECOVERED" && contact.lead_status !== "LOST",
    );

    counts = {
      leads_total: contacts.length,
      leads_ativos: activeLeads.length,
      pagamentos_falhos: analytics.total_failed_payments,
      recuperados: analytics.recovered_payments,
      taxa_recuperacao: analytics.recovery_rate,
      receita_recuperada: analytics.recovered_revenue,
      conversas: inbox.length,
      recuperacoes_ativas: analytics.active_recoveries,
    };
  } catch (error) {
    console.error("[health-check]", error instanceof Error ? error.message : error);
    counts = { error: 1 };
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    storage_mode: storageMode,
    database_configured: runtime.databaseConfigured,
    counts,
    integrations: {
      pagouai: appEnv.pagouAiConfigured,
      supabase: runtime.databaseConfigured,
      whatsapp: runtime.whatsappConfigured,
      email: runtime.emailConfigured,
      crm: runtime.crmConfigured,
      ai: runtime.aiConfigured,
    },
    automation: {
      worker_enabled: runtime.workerConfigured,
    },
  });
}
