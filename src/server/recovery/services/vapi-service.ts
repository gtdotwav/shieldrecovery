import { appEnv } from "@/server/recovery/config";
import { getStorageService } from "@/server/recovery/services/storage";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { platformBrand } from "@/lib/platform";

import type {
  CallRecord,
  CreateCallInput,
  VoiceTone,
  VoiceGender,
} from "@/server/recovery/types";

/* ── Types ── */

type VapiCreateCallPayload = {
  name?: string;
  assistantId?: string;
  assistant?: VapiAssistantConfig;
  phoneNumberId?: string;
  customer: { number: string; name?: string };
  metadata?: Record<string, unknown>;
};

type VapiAssistantConfig = {
  model: {
    provider: "openai";
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
    temperature?: number;
  };
  voice: {
    provider: "11labs" | "azure" | "deepgram" | "playht";
    voiceId: string;
  };
  firstMessage: string;
  endCallMessage?: string;
  transcriber?: {
    provider: "deepgram";
    language: "pt-BR";
  };
  maxDurationSeconds?: number;
  silenceTimeoutSeconds?: number;
  endCallFunctionEnabled?: boolean;
  serverUrl?: string;
};

type VapiCallResponse = {
  id: string;
  status: string;
  phoneNumber?: { number: string };
  customer?: { number: string };
  createdAt: string;
};

/* ── Voice mapping ── */

const VOICE_MAP: Record<string, Record<string, string>> = {
  female: {
    empathetic: "EXAVITQu4vr4xnSDxMaL",   // 11labs — Sarah (warm)
    professional: "21m00Tcm4TlvDq8ikWAM", // 11labs — Rachel
    urgent: "AZnzlk1XvdvUeBnXmlld",       // 11labs — Domi
    friendly: "EXAVITQu4vr4xnSDxMaL",     // 11labs — Sarah
    direct: "21m00Tcm4TlvDq8ikWAM",       // 11labs — Rachel
  },
  male: {
    empathetic: "VR6AewLTigWG4xSOukaG",   // 11labs — Arnold
    professional: "pNInz6obpgDQGcFmaJgB",  // 11labs — Adam
    urgent: "ErXwobaYiN019PkySvjV",        // 11labs — Antoni
    friendly: "VR6AewLTigWG4xSOukaG",     // 11labs — Arnold
    direct: "pNInz6obpgDQGcFmaJgB",       // 11labs — Adam
  },
};

/* ── Service ── */

export class VapiService {
  private readonly apiKey: string;
  private readonly phoneNumberId: string;
  private readonly serverUrl: string;
  private readonly storage = getStorageService();

  constructor() {
    this.apiKey = process.env.VAPI_API_KEY ?? "";
    this.phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID ?? process.env.VAPI_PHONE_ID ?? "";
    this.serverUrl = `${appEnv.appBaseUrl}/api/webhooks/callcenter`;
  }

  get configured(): boolean {
    return Boolean(this.apiKey && this.phoneNumberId);
  }

  /**
   * Initiate a call via Vapi and update the local call record.
   */
  async initiateCall(input: {
    callRecord: CallRecord;
    customerName: string;
    script: string;
    product?: string;
    paymentValue?: number;
    voiceTone?: VoiceTone;
    voiceGender?: VoiceGender;
  }): Promise<{ ok: boolean; vapiCallId?: string; error?: string }> {
    if (!this.configured) {
      console.error(`[VapiService] Not configured: apiKey=${this.apiKey ? "set" : "MISSING"}, phoneNumberId=${this.phoneNumberId ? "set" : "MISSING"}`);
      return { ok: false, error: `Vapi not configured: apiKey=${this.apiKey ? "set" : "MISSING"}, phoneNumberId=${this.phoneNumberId ? "set" : "MISSING"}` };
    }

    const tone = input.voiceTone ?? "empathetic";
    const gender = input.voiceGender ?? "female";
    const voiceId = VOICE_MAP[gender]?.[tone] ?? VOICE_MAP.female.empathetic;

    const systemPrompt = this.buildVoiceAgentPrompt({
      customerName: input.customerName,
      product: input.product,
      paymentValue: input.paymentValue,
      script: input.script,
      tone,
    });

    const firstMessage = this.buildFirstMessage(
      input.customerName,
      input.product,
      tone,
    );

    const payload: VapiCreateCallPayload = {
      name: `Recovery: ${input.customerName} — ${input.product ?? "pagamento"}`,
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.7,
        },
        voice: {
          provider: "11labs",
          voiceId,
        },
        firstMessage,
        endCallMessage:
          "Obrigado pela atenção. Se precisar de algo, pode nos chamar pelo WhatsApp. Até mais!",
        transcriber: {
          provider: "deepgram",
          language: "pt-BR",
        },
        maxDurationSeconds: 300,
        silenceTimeoutSeconds: 30,
        endCallFunctionEnabled: true,
        serverUrl: this.serverUrl,
      },
      customer: {
        number: input.callRecord.toNumber,
        name: input.customerName,
      },
      phoneNumberId: this.phoneNumberId,
      metadata: {
        leadId: input.callRecord.leadId,
        callRecordId: input.callRecord.id,
        product: input.product,
      },
    };

    try {
      console.log(`[VapiService] Initiating call to ${input.callRecord.toNumber}, phoneNumberId=${this.phoneNumberId}`);

      const response = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const error = `Vapi API error ${response.status}: ${errorText.slice(0, 500)}`;
        console.error(`[VapiService] ${error}`);

        await this.storage.updateCall(input.callRecord.id, {
          status: "failed",
          outcomeNotes: error,
        });

        await this.storage.addLog(
          createStructuredLog({
            eventType: "callcenter_checkout",
            level: "error",
            message: `Vapi call initiation failed for ${input.callRecord.id}`,
            context: { callId: input.callRecord.id, error },
          }),
        );

        return { ok: false, error };
      }

      const result = (await response.json()) as VapiCallResponse;

      await this.storage.updateCall(input.callRecord.id, {
        status: "ringing",
        providerCallId: result.id,
        startedAt: new Date().toISOString(),
      });

      await this.storage.addLog(
        createStructuredLog({
          eventType: "callcenter_checkout",
          level: "info",
          message: `Vapi call initiated: ${result.id}`,
          context: {
            callId: input.callRecord.id,
            vapiCallId: result.id,
            customerName: input.customerName,
          },
        }),
      );

      return { ok: true, vapiCallId: result.id };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Vapi error";

      await this.storage.updateCall(input.callRecord.id, {
        status: "failed",
        outcomeNotes: message,
      });

      return { ok: false, error: message };
    }
  }

  /**
   * Cancel an active Vapi call.
   */
  async cancelCall(vapiCallId: string): Promise<boolean> {
    if (!this.configured) return false;

    try {
      const response = await fetch(
        `https://api.vapi.ai/call/${vapiCallId}/stop`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: AbortSignal.timeout(10_000),
        },
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get call status from Vapi.
   */
  async getCallStatus(
    vapiCallId: string,
  ): Promise<{ status: string; transcript?: string } | null> {
    if (!this.configured) return null;

    try {
      const response = await fetch(`https://api.vapi.ai/call/${vapiCallId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as {
        status?: string;
        transcript?: string;
      };

      return {
        status: data.status ?? "unknown",
        transcript: data.transcript,
      };
    } catch {
      return null;
    }
  }

  /* ── Prompt builders ── */

  private buildVoiceAgentPrompt(input: {
    customerName: string;
    product?: string;
    paymentValue?: number;
    script: string;
    tone: VoiceTone;
  }): string {
    const value = input.paymentValue
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format((input.paymentValue ?? 0) / 100)
      : "";

    const toneDirectives: Record<VoiceTone, string> = {
      empathetic:
        "Fale de forma acolhedora e compreensiva. Use um tom calmo e paciente.",
      professional:
        "Fale de forma profissional e objetiva. Transmita confianca.",
      urgent:
        "Fale com senso de urgencia, mas sem ser agressivo. Enfatize prazos.",
      friendly:
        "Fale de forma leve e amigavel, como um amigo ajudando.",
      direct: "Seja direto e objetivo. Va ao ponto rapidamente.",
    };

    return [
      `Voce e um atendente de recuperacao de pagamentos da ${platformBrand.name}.`,
      `Seu nome e Ana. Voce esta ligando para ${input.customerName}.`,
      "",
      `ESTILO: ${toneDirectives[input.tone]}`,
      "",
      "OBJETIVO: Ajudar o cliente a concluir um pagamento pendente.",
      "",
      `DADOS DO CASO:`,
      `- Cliente: ${input.customerName}`,
      `- Produto: ${input.product ?? "nao informado"}`,
      value ? `- Valor: ${value}` : "",
      "",
      "ROTEIRO BASE:",
      input.script,
      "",
      "REGRAS:",
      "- Fale em portugues brasileiro natural e coloquial",
      "- Seja breve — frases curtas",
      "- Se o cliente confirmar que vai pagar, diga que vai enviar o link por WhatsApp",
      "- Se pedir parcelamento, diga que pode gerar em ate 12x e vai enviar o link",
      "- Se nao reconhece a compra, peca desculpas e encerre educadamente",
      "- Se esta ocupado, pergunte o melhor horario para retornar",
      "- NUNCA minta sobre prazos ou consequencias",
      "- NUNCA seja agressivo ou ameace o cliente",
      "- Se o cliente pedir para nao ligar mais, respeite e encerre",
      "- Maximo 3 minutos de ligacao",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private buildFirstMessage(
    customerName: string,
    product?: string,
    tone?: VoiceTone,
  ): string {
    const name = customerName.split(/\s+/)[0] || "cliente";
    const prod = product ? ` sobre o ${product}` : "";

    if (tone === "urgent") {
      return `Oi ${name}, tudo bem? Aqui e da ${platformBrand.name}, estou ligando${prod} porque identifiquei uma pendencia no seu pagamento. Posso te ajudar a resolver agora rapidinho?`;
    }

    if (tone === "professional") {
      return `Boa tarde, ${name}. Meu nome e Ana, da ${platformBrand.name}. Estou entrando em contato${prod} para ajudar com um pagamento que ficou pendente. Tem um minutinho?`;
    }

    return `Oi ${name}, tudo bem? Aqui e a Ana da ${platformBrand.name}. To ligando${prod} porque vi que um pagamento seu ficou pendente e queria te ajudar a resolver. Pode falar agora?`;
  }
}

/* ── Singleton ── */

declare global {
  var __vapiService__: VapiService | undefined;
}

export function getVapiService(): VapiService {
  if (!globalThis.__vapiService__) {
    globalThis.__vapiService__ = new VapiService();
  }
  return globalThis.__vapiService__;
}
