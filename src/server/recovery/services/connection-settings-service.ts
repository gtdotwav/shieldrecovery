import { createDefaultConnectionSettings } from "@/server/recovery/config";
import type { StorageMode } from "@/server/recovery/services/storage";
import { getStorageService } from "@/server/recovery/services/storage";
import { getPlatformBootstrapService } from "@/server/recovery/services/platform-bootstrap-service";
import type {
  ConnectionSettingsInput,
  ConnectionSettingsRecord,
} from "@/server/recovery/types";

export type RuntimeConnectionSettings = ConnectionSettingsRecord & {
  databaseMode: StorageMode;
  databaseConfigured: boolean;
  whatsappConfigured: boolean;
  whatsappSessionConnected: boolean;
  emailConfigured: boolean;
  crmConfigured: boolean;
  aiConfigured: boolean;
};

export class ConnectionSettingsService {
  async getSettings(): Promise<ConnectionSettingsRecord> {
    const defaults = createDefaultConnectionSettings();
    const stored = await getStorageService().getConnectionSettings();
    const definedStoredEntries = Object.entries(stored).filter(
      ([, value]) => value !== undefined,
    );

    return {
      ...defaults,
      ...(Object.fromEntries(definedStoredEntries) as Partial<ConnectionSettingsRecord>),
      webhookToleranceSeconds:
        stored.webhookToleranceSeconds ?? defaults.webhookToleranceSeconds,
      updatedAt: stored.updatedAt ?? defaults.updatedAt,
    };
  }

  async getRuntimeSettings(): Promise<RuntimeConnectionSettings> {
    const settings = await this.getSettings();
    const storage = getStorageService();
    const database = getPlatformBootstrapService().getResolvedDatabaseSettings();

    const whatsappConfigured =
      settings.whatsappProvider === "web_api"
        ? Boolean(
            settings.whatsappApiBaseUrl &&
              settings.whatsappWebSessionStatus === "connected",
          )
        : Boolean(
            settings.whatsappApiBaseUrl &&
              settings.whatsappAccessToken &&
              settings.whatsappPhoneNumberId &&
              settings.whatsappWebhookVerifyToken,
          );

    return {
      ...settings,
      databaseMode: storage.mode,
      databaseConfigured: database.databaseConfigured && storage.mode === "supabase",
      whatsappConfigured,
      whatsappSessionConnected: settings.whatsappWebSessionStatus === "connected",
      emailConfigured: Boolean(settings.emailApiKey),
      crmConfigured: Boolean(settings.crmApiUrl && settings.crmApiKey),
      aiConfigured: Boolean(settings.openAiApiKey),
    };
  }

  async saveSettings(
    input: ConnectionSettingsInput,
  ): Promise<RuntimeConnectionSettings> {
    await getStorageService().saveConnectionSettings(input);
    return this.getRuntimeSettings();
  }
}

export function getConnectionSettingsService() {
  return new ConnectionSettingsService();
}
