import QRCode from "qrcode";

import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type {
  SellerAdminControlRecord,
  WhatsAppWebSessionStatus,
} from "@/server/recovery/types";
import { HttpError } from "@/server/recovery/utils/http-error";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

export type SellerWhatsAppSnapshot = {
  sellerKey: string;
  instanceName: string;
  status: WhatsAppWebSessionStatus;
  qrCode: string;
  connectedPhone: string;
  error: string;
  updatedAt: string;
};

type EvolutionInstanceConfig = {
  baseUrl: string;
  accessToken: string;
  instanceName: string;
};

type NormalizedEvolutionStatus = {
  status: WhatsAppWebSessionStatus;
  qrCode: string;
  phone: string;
  error: string;
};

function buildHeaders(accessToken: string) {
  return {
    apikey: accessToken,
    "Content-Type": "application/json",
  };
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function extractError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (Array.isArray(record.message) && record.message.length > 0)
    return String(record.message[0]);
  if (typeof record.error === "string") return record.error;
  if (record.response && typeof record.response === "object") {
    const inner = record.response as Record<string, unknown>;
    if (typeof inner.message === "string") return inner.message;
    if (Array.isArray(inner.message) && inner.message.length > 0)
      return String(inner.message[0]);
  }
  return "";
}

async function resolveQrCode(value: string, isImageValue = false) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:image")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (isImageValue) {
    return `data:image/png;base64,${trimmed.replace(/^data:[^,]+,/, "")}`;
  }
  return QRCode.toDataURL(trimmed, {
    margin: 1,
    width: 320,
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

async function normalizeStatus(payload: unknown): Promise<NormalizedEvolutionStatus> {
  const result = {
    status: "disconnected" as WhatsAppWebSessionStatus,
    qrCode: "",
    phone: "",
    error: "",
  };

  const rec = asRecord(payload);
  if (!rec) return result;
  const data = asRecord(rec.data);
  const source = data ?? rec;
  const instance =
    asRecord(source.instance) ??
    asRecord(rec.instance) ??
    source;
  const qrcode =
    asRecord(source.qrcode) ??
    asRecord(source.qrCode) ??
    asRecord(data?.qrcode) ??
    asRecord(data?.qrCode);

  // Evolution API returns different shapes depending on the endpoint
  // connect → { base64, code, pairingCode, instance { state } }
  // connectionState → { instance { state, statusReason } }
  // webhook QRCODE_UPDATED → { data: { qrcode: { code, base64 } } }

  // QR code (from connect endpoint)
  const base64 = firstString(source.base64, qrcode?.base64);
  const rawQr = firstString(
    source.qrCodeDataUrl,
    source.qrCode,
    source.qrcode,
    source.qr_code,
    source.qr,
    source.code,
    qrcode?.qrCodeDataUrl,
    qrcode?.qrCode,
    qrcode?.qrcode,
    qrcode?.qr_code,
    qrcode?.qr,
    qrcode?.code,
  );

  if (base64) {
    result.qrCode = await resolveQrCode(base64, true);
    result.status = "pending_qr";
  } else if (rawQr) {
    result.qrCode = await resolveQrCode(rawQr);
    result.status = "pending_qr";
  }

  // Instance state
  const state =
    typeof instance.state === "string"
      ? instance.state.toLowerCase()
      : typeof instance.status === "string"
        ? instance.status.toLowerCase()
        : "";

  if (state === "open" || state === "connected") {
    result.status = "connected";
    result.qrCode = "";
  } else if (state === "close" || state === "closed" || state === "disconnected") {
    if (!result.qrCode) result.status = "disconnected";
  } else if (state === "connecting" || state === "qr") {
    result.status = "pending_qr";
  }

  // Connected phone
  const owner = firstString(
    source.ownerJid,
    source.owner,
    source.wuid,
    source.phone,
    instance.ownerJid,
    instance.owner,
    instance.wuid,
  );
  if (owner) {
    result.phone = owner.replace(/@.*/, "");
  }

  // Error
  const errMsg = extractError(payload);
  if (errMsg && result.status !== "connected" && result.status !== "pending_qr") {
    result.error = errMsg;
    if (result.status === "disconnected") result.status = "error";
  }

  return result;
}

function markPendingQrWhenAccepted(
  response: Response,
  state: NormalizedEvolutionStatus,
): NormalizedEvolutionStatus {
  if (!response.ok || state.status === "connected" || state.qrCode) {
    return state;
  }

  return {
    ...state,
    status: "pending_qr",
    error:
      state.error ||
      "Evolution API aceitou a conexao, mas ainda nao retornou o QR. Aguardando evento QRCODE_UPDATED.",
  };
}

export class SellerWhatsAppService {
  private readonly storage = getStorageService();

  private async getEvolutionConfig(): Promise<{
    baseUrl: string;
    accessToken: string;
  }> {
    const settings = await getConnectionSettingsService().getSettings();

    if (settings.whatsappProvider !== "web_api") {
      throw new HttpError(
        400,
        "WhatsApp per-seller requer provider web_api (Evolution API) configurado pelo admin.",
      );
    }

    if (!settings.whatsappApiBaseUrl) {
      throw new HttpError(
        400,
        "URL base do Evolution API nao configurada. Admin deve configurar em /connect.",
      );
    }

    if (/graph\.facebook\.com/i.test(settings.whatsappApiBaseUrl)) {
      throw new HttpError(
        400,
        "URL aponta para Cloud API da Meta. QR per-seller requer Evolution API.",
      );
    }

    return {
      baseUrl: settings.whatsappApiBaseUrl.trim().replace(/\/$/, ""),
      accessToken: settings.whatsappAccessToken,
    };
  }

  private instanceNameForSeller(sellerKey: string): string {
    // Sanitize: only alphanumeric, hyphens, underscores
    const sanitized = sellerKey
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    return `seller_${sanitized}`;
  }

  private async getSellerControl(
    sellerKey: string,
  ): Promise<SellerAdminControlRecord | undefined> {
    const controls = await this.storage.getSellerAdminControls();
    return controls.find(
      (c) => c.sellerKey === sellerKey || c.sellerName === sellerKey,
    );
  }

  async getSnapshot(sellerKey: string): Promise<SellerWhatsAppSnapshot> {
    const control = await this.getSellerControl(sellerKey);
    const instanceName =
      control?.whatsappInstanceName ||
      this.instanceNameForSeller(sellerKey);

    return {
      sellerKey,
      instanceName,
      status: control?.whatsappInstanceStatus ?? "disconnected",
      qrCode: control?.whatsappInstanceQrCode ?? "",
      connectedPhone: control?.whatsappInstancePhone ?? "",
      error: control?.whatsappInstanceError ?? "",
      updatedAt: control?.whatsappInstanceUpdatedAt ?? "",
    };
  }

  async connect(sellerKey: string): Promise<SellerWhatsAppSnapshot> {
    const evo = await this.getEvolutionConfig();
    const instanceName = this.instanceNameForSeller(sellerKey);

    // 1. Ensure instance exists
    await this.ensureInstance({ ...evo, instanceName });

    // 2. Configure webhook before asking Evolution to generate a QR.
    const webhookWarning = await this.configureWebhook({
      ...evo,
      instanceName,
    });

    // 3. Connect (get QR code)
    const connectUrl = joinUrl(
      evo.baseUrl,
      `/instance/connect/${encodeURIComponent(instanceName)}`,
    );
    const response = await fetch(connectUrl, {
      method: "GET",
      headers: buildHeaders(evo.accessToken),
      signal: AbortSignal.timeout(15_000),
    });

    const payload = await safeParseJson(response);
    let state = markPendingQrWhenAccepted(
      response,
      await normalizeStatus(payload),
    );
    let activeResponse = response;

    if (response.ok && state.status !== "connected" && !state.qrCode) {
      const regenerated = await this.recreateDisconnectedInstance({
        ...evo,
        instanceName,
      });
      state = markPendingQrWhenAccepted(
        regenerated.response,
        regenerated.state,
      );
      activeResponse = regenerated.response;
    }

    // 4. Persist
    await this.persistState(sellerKey, instanceName, state, webhookWarning);

    if (!activeResponse.ok && state.status !== "connected" && state.status !== "pending_qr") {
      throw new HttpError(
        502,
        state.error || `Evolution API returned ${activeResponse.status}.`,
      );
    }

    return this.getSnapshot(sellerKey);
  }

  async refresh(sellerKey: string): Promise<SellerWhatsAppSnapshot> {
    const evo = await this.getEvolutionConfig();
    const control = await this.getSellerControl(sellerKey);
    const instanceName =
      control?.whatsappInstanceName ||
      this.instanceNameForSeller(sellerKey);

    // 1. Check current state
    const statusUrl = joinUrl(
      evo.baseUrl,
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );
    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: buildHeaders(evo.accessToken),
      signal: AbortSignal.timeout(15_000),
    });

    const statusPayload = await safeParseJson(statusResponse);
    let state = await normalizeStatus(statusPayload);
    let activeResponse = statusResponse;

    // 2. If not connected and not pending QR, try to reconnect
    if (
      statusResponse.status === 404 ||
      (statusResponse.ok &&
      state.status !== "connected" &&
      state.status !== "pending_qr")
    ) {
      if (statusResponse.status === 404) {
        await this.ensureInstance({ ...evo, instanceName });
      }
      const connectUrl = joinUrl(
        evo.baseUrl,
        `/instance/connect/${encodeURIComponent(instanceName)}`,
      );
      const connectResponse = await fetch(connectUrl, {
        method: "GET",
        headers: buildHeaders(evo.accessToken),
        signal: AbortSignal.timeout(15_000),
      });
      const connectPayload = await safeParseJson(connectResponse);
      state = markPendingQrWhenAccepted(
        connectResponse,
        await normalizeStatus(connectPayload),
      );
      activeResponse = connectResponse;
    }

    if (activeResponse.ok && state.status !== "connected" && !state.qrCode) {
      const regenerated = await this.recreateDisconnectedInstance({
        ...evo,
        instanceName,
      });
      state = markPendingQrWhenAccepted(
        regenerated.response,
        regenerated.state,
      );
      activeResponse = regenerated.response;
    }

    // 3. Persist
    await this.persistState(sellerKey, instanceName, state);

    if (!activeResponse.ok) {
      throw new HttpError(
        502,
        state.error || `Evolution API returned ${activeResponse.status}.`,
      );
    }

    return this.getSnapshot(sellerKey);
  }

  async disconnect(sellerKey: string): Promise<SellerWhatsAppSnapshot> {
    const evo = await this.getEvolutionConfig();
    const control = await this.getSellerControl(sellerKey);
    const instanceName =
      control?.whatsappInstanceName ||
      this.instanceNameForSeller(sellerKey);

    // Logout from Evolution API
    const logoutUrl = joinUrl(
      evo.baseUrl,
      `/instance/logout/${encodeURIComponent(instanceName)}`,
    );
    await fetch(logoutUrl, {
      method: "DELETE",
      headers: buildHeaders(evo.accessToken),
      signal: AbortSignal.timeout(10_000),
    }).catch((err) =>
      console.error("[seller-whatsapp] disconnect error:", err),
    );

    // Reset state
    await this.storage.saveSellerAdminControl({
      sellerKey,
      whatsappInstanceName: instanceName,
      whatsappInstanceStatus: "disconnected",
      whatsappInstanceQrCode: "",
      whatsappInstancePhone: "",
      whatsappInstanceError: "",
      whatsappInstanceUpdatedAt: new Date().toISOString(),
    });

    return this.getSnapshot(sellerKey);
  }

  /**
   * Resolve Evolution API instance config for a seller.
   * Used by messaging service to route outbound messages through the seller's own WhatsApp.
   * Returns null if seller has no connected instance (falls back to platform default).
   */
  async resolveSellerInstance(sellerKey: string): Promise<{
    baseUrl: string;
    accessToken: string;
    instanceName: string;
  } | null> {
    const control = await this.getSellerControl(sellerKey);

    if (
      !control?.whatsappInstanceName ||
      control.whatsappInstanceStatus !== "connected"
    ) {
      return null;
    }

    try {
      const evo = await this.getEvolutionConfig();
      return {
        baseUrl: evo.baseUrl,
        accessToken: evo.accessToken,
        instanceName: control.whatsappInstanceName,
      };
    } catch {
      return null;
    }
  }

  async syncFromWebhook(input: {
    instanceName: string;
    status: WhatsAppWebSessionStatus;
    qrCode: string;
    connectedPhone: string;
    error: string;
  }): Promise<boolean> {
    if (!input.instanceName.startsWith("seller_")) return false;

    const controls = await this.storage.getSellerAdminControls();
    const matched = controls.find(
      (control) => control.whatsappInstanceName === input.instanceName,
    );
    const sellerKey =
      matched?.sellerKey ||
      input.instanceName.replace(/^seller_/, "").replace(/_/g, "-");

    await this.persistState(sellerKey, input.instanceName, {
      status: input.status,
      qrCode: input.qrCode,
      phone: input.connectedPhone,
      error: input.error,
    });

    return true;
  }

  private async ensureInstance(config: EvolutionInstanceConfig) {
    const settings = await getConnectionSettingsService().getSettings();
    const webhookUrl = `${settings.appBaseUrl}/api/webhooks/whatsapp`;
    const createUrl = joinUrl(config.baseUrl, "/instance/create");
    const response = await fetch(createUrl, {
      method: "POST",
      headers: buildHeaders(config.accessToken),
      body: JSON.stringify({
        instanceName: config.instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          headers: settings.webhookSecret
            ? { "x-pagrecovery-webhook-secret": settings.webhookSecret }
            : undefined,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "SEND_MESSAGE",
          ],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (response.ok || response.status === 409) {
      return;
    }

    if (response.status === 403) {
      // 403 from Evolution API v2 means "name already in use"
      const payload = await safeParseJson(response);
      const message = extractError(payload);
      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("in use")
      ) {
        return;
      }
    }

    const payload = await safeParseJson(response);
    const message = extractError(payload);

    if (
      message.toLowerCase().includes("already") ||
      message.toLowerCase().includes("exists") ||
      message.toLowerCase().includes("in use")
    ) {
      return;
    }

    throw new HttpError(
      502,
      message || "Nao foi possivel criar a instancia no Evolution API.",
    );
  }

  private async configureWebhook(
    config: EvolutionInstanceConfig,
  ): Promise<string> {
    const settings = await getConnectionSettingsService().getSettings();
    const webhookUrl = `${settings.appBaseUrl}/api/webhooks/whatsapp`;

    const response = await fetch(
      joinUrl(
        config.baseUrl,
        `/webhook/set/${encodeURIComponent(config.instanceName)}`,
      ),
      {
        method: "POST",
        headers: buildHeaders(config.accessToken),
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: false,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "QRCODE_UPDATED",
              "CONNECTION_UPDATE",
              "SEND_MESSAGE",
            ],
            headers: settings.webhookSecret
              ? { "x-pagrecovery-webhook-secret": settings.webhookSecret }
              : undefined,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    ).catch((err) => {
      console.error("[seller-whatsapp] webhook setup error:", err);
      return null;
    });

    if (!response || response.ok) return "";

    const payload = await safeParseJson(response);
    const msg = extractError(payload);

    await this.storage
      .addLog(
        createStructuredLog({
          eventType: "processing_error",
          level: "warn",
          message:
            "Seller WhatsApp webhook could not be configured automatically.",
          context: {
            provider: "evolution",
            instanceName: config.instanceName,
            status: response.status,
            error: msg,
          },
        }),
      )
      .catch(() => {});

    return msg
      ? `Sessao aberta, mas webhook precisa revisao: ${msg}`
      : "Sessao aberta, mas webhook nao configurado automaticamente.";
  }

  private async persistState(
    sellerKey: string,
    instanceName: string,
    state: {
      status: WhatsAppWebSessionStatus;
      qrCode: string;
      phone: string;
      error: string;
    },
    extraWarning = "",
  ) {
    await this.storage.saveSellerAdminControl({
      sellerKey,
      whatsappInstanceName: instanceName,
      whatsappInstanceStatus: state.status,
      whatsappInstanceQrCode: state.qrCode,
      whatsappInstancePhone: state.phone,
      whatsappInstanceError: extraWarning || state.error,
      whatsappInstanceUpdatedAt: new Date().toISOString(),
    });
  }

  private async connectInstance(config: EvolutionInstanceConfig) {
    const response = await fetch(
      joinUrl(
        config.baseUrl,
        `/instance/connect/${encodeURIComponent(config.instanceName)}`,
      ),
      {
        method: "GET",
        headers: buildHeaders(config.accessToken),
        signal: AbortSignal.timeout(15_000),
      },
    );

    const payload = await safeParseJson(response);
    const state = markPendingQrWhenAccepted(
      response,
      await normalizeStatus(payload),
    );
    return { response, payload, state };
  }

  private async recreateDisconnectedInstance(config: EvolutionInstanceConfig) {
    const statusResponse = await fetch(
      joinUrl(
        config.baseUrl,
        `/instance/connectionState/${encodeURIComponent(config.instanceName)}`,
      ),
      {
        method: "GET",
        headers: buildHeaders(config.accessToken),
        signal: AbortSignal.timeout(10_000),
      },
    ).catch(() => null);

    if (statusResponse?.ok) {
      const statusPayload = await safeParseJson(statusResponse);
      const status = await normalizeStatus(statusPayload);
      if (status.status === "connected") {
        return { response: statusResponse, state: status };
      }
    }

    await fetch(
      joinUrl(
        config.baseUrl,
        `/instance/delete/${encodeURIComponent(config.instanceName)}`,
      ),
      {
        method: "DELETE",
        headers: buildHeaders(config.accessToken),
        signal: AbortSignal.timeout(10_000),
      },
    ).catch(() => null);

    await this.ensureInstance(config);
    return this.connectInstance(config);
  }
}

let _instance: SellerWhatsAppService | null = null;
export function getSellerWhatsAppService(): SellerWhatsAppService {
  if (!_instance) _instance = new SellerWhatsAppService();
  return _instance;
}
