import { NextRequest, NextResponse } from "next/server";
import { getStorageService } from "@/server/recovery/services/storage";
import { corsOptions } from "@/server/recovery/utils/api-response";
import { platformBrand } from "@/lib/platform";
import { appEnv } from "@/server/recovery/config";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return corsOptions(request);
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Already has country code 55
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  // Has DDD but no country code
  if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!name || name.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Nome obrigatório (mínimo 2 caracteres)." },
        { status: 400 },
      );
    }

    const phone = normalizePhone(rawPhone);
    if (!phone || phone.length < 13) {
      return NextResponse.json(
        { ok: false, error: "Telefone inválido. Use formato: (DDD) 9XXXX-XXXX" },
        { status: 400 },
      );
    }

    // Check VAPI is configured — both key and phone number are required
    const vapiKey = (process.env.VAPI_API_KEY ?? "").trim();
    const vapiPhoneNumberId = (process.env.VAPI_PHONE_NUMBER_ID ?? process.env.VAPI_PHONE_ID ?? "").trim();
    if (!vapiKey || !vapiPhoneNumberId) {
      console.error(
        `Demo call config missing: VAPI_API_KEY=${vapiKey ? "set" : "MISSING"}, VAPI_PHONE_NUMBER_ID=${vapiPhoneNumberId ? "set" : "MISSING"}`,
      );
      return NextResponse.json(
        { ok: false, error: "Sistema de chamadas temporariamente indisponível." },
        { status: 503 },
      );
    }

    const storage = getStorageService();

    // Phones with unlimited demo calls (env comma-separated or hardcoded)
    const unlimitedRaw = process.env.DEMO_CALL_UNLIMITED_PHONES ?? "";
    const unlimitedPhones = new Set(
      unlimitedRaw.split(",").map((p) => p.trim()).filter(Boolean),
    );
    const ownerPhone = process.env.DEMO_CALL_OWNER_PHONE?.trim();
    if (ownerPhone) unlimitedPhones.add(ownerPhone);

    const isUnlimited = unlimitedPhones.has(phone);

    // Rate limit: 1 demo call per phone number ever (skip for whitelisted)
    if (!isUnlimited) {
      let existing: Awaited<ReturnType<typeof storage.findDemoCallLeadByPhone>> | null = null;
      try {
        existing = await storage.findDemoCallLeadByPhone(phone);
      } catch (dbError) {
        console.warn("Demo call lead lookup failed (table may not exist):", dbError);
      }

      if (existing) {
        return NextResponse.json(
          { ok: false, error: "Este número já recebeu uma demonstração. Cada número pode testar apenas uma vez." },
          { status: 429 },
        );
      }
    }

    // For unlimited phones, delete previous lead to avoid duplicates
    if (isUnlimited) {
      try { await storage.deleteDemoCallLeadByPhone(phone); } catch { /* ignore */ }
    }

    // Try to create the lead record (non-blocking if table doesn't exist)
    let leadId: string | undefined;
    try {
      const lead = await storage.createDemoCallLead({ name, phone });
      leadId = lead.id;
    } catch (dbError) {
      console.warn("Demo call lead creation failed (table may not exist):", dbError);
    }

    // Build a short demo call via VAPI directly (max 120 seconds)
    const firstName = (name.split(/\s+/)[0] || "visitante")
      .replace(/[^a-zA-Z\u00C0-\u017F\s]/g, "")
      .slice(0, 50);
    const brandName = platformBrand.name;

    const systemPrompt = [
      `Voce e a Ana, consultora de vendas da ${brandName}.`,
      `Voce esta ligando para ${name}, que acabou de pedir uma demonstracao ao vivo no site.`,
      "",
      `A ${brandName} e uma plataforma de recuperacao autonoma de pagamentos. Quando um pagamento falha (Pix expirado, cartao recusado, boleto vencido), a plataforma:`,
      "1. Em 2 minutos envia WhatsApp personalizado com link de pagamento",
      "2. Faz follow-ups inteligentes adaptando tom e abordagem",
      "3. Para leads de alto valor, liga com voz IA natural e negocia",
      "4. Opera 24/7 sem equipe humana",
      "",
      "DADOS-CHAVE:",
      "- Taxa de recuperacao: 19% a 40%",
      "- Zero setup, zero mensalidade — so cobra % sobre o que recuperar",
      "- Funciona com qualquer gateway (Stripe, Mercado Pago, Hotmart, Kiwify, Asaas, PagouAi)",
      "- Integracao em 5 minutos: webhook + QR do WhatsApp",
      "",
      "ROTEIRO:",
      `1. Se apresente, diga que essa ligacao e a prova do sistema — foi disparada automaticamente`,
      "2. Pergunte se ja vende online e qual gateway usa",
      "3. Explique os beneficios de forma breve",
      "4. Feche convidando a criar conta — diga que manda o link por WhatsApp",
      "",
      "OBJECOES:",
      "- Custo → Zero pra comecar, so paga sobre o que recuperar",
      "- Gateway → Funciona com todos via webhook",
      "- Dificuldade → 5 minutos, cola webhook e escaneia QR",
      "- Equipe → 100% autonomo, 24h",
      "- Ja tentei → Diferente de email/manual, usa WhatsApp + IA + voz em tempo real",
      "",
      "REGRAS:",
      "- Portugues brasileiro natural e coloquial — vendedora experiente e entusiasmada",
      "- Frases CURTAS. Maximo 2 frases por vez. Espere o cliente responder.",
      "- Seja persuasiva mas genuina. Transmita confianca.",
      "- NUNCA invente dados.",
      "- Quando demonstrar interesse, feche com 'vou te mandar o link por WhatsApp agora'",
      "- NAO fale tudo de uma vez. Converse naturalmente, faca perguntas, escute.",
    ].join("\n");

    const firstMessage = `Oi ${firstName}! Aqui é a Ana, da ${brandName}. Você pediu uma demonstração do nosso call center de IA — e essa ligação é a prova ao vivo. Foi disparada automaticamente em segundos. Me conta, você já vende online?`;

    // Voice: Cartesia (native PT-BR) with env override, fallback to 11labs Sarah
    const cartesiaVoiceId = (process.env.CARTESIA_VOICE_ID ?? "700d1ee3-a641-4018-ba6e-899dcadc9e2b").trim();

    const vapiPayload = {
      name: `Demo: ${name}`,
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.5,
        },
        voice: {
          provider: "cartesia" as const,
          voiceId: cartesiaVoiceId,
        },
        firstMessage,
        endCallMessage: `Foi um prazer falar com você, ${firstName}! Vou te mandar mais detalhes por WhatsApp. Até logo!`,
        transcriber: {
          provider: "deepgram",
          language: "pt-BR",
        },
        maxDurationSeconds: 120,
        silenceTimeoutSeconds: 25,
        endCallFunctionEnabled: true,
        serverUrl: `${appEnv.appBaseUrl}/api/webhooks/callcenter`,
      },
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: phone,
        name,
      },
      metadata: {
        demoCallLeadId: leadId ?? "unknown",
        source: "landing_page_demo",
      },
    };

    console.log(`Demo call: initiating for ${phone}, phoneNumberId=${vapiPhoneNumberId}`);

    const vapiResponse = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vapiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vapiPayload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text().catch(() => "");
      console.error(`Demo call VAPI error: status=${vapiResponse.status} body=${errorText.slice(0, 500)}`);

      if (leadId) {
        await storage.updateDemoCallLead(leadId, { status: "failed" }).catch(() => {});
      }

      return NextResponse.json(
        { ok: false, error: `Não foi possível iniciar a chamada (${vapiResponse.status}). Tente novamente.` },
        { status: 502 },
      );
    }

    const vapiResult = (await vapiResponse.json()) as { id: string };
    console.log(`Demo call: VAPI success, callId=${vapiResult.id}`);

    if (leadId) {
      await storage.updateDemoCallLead(leadId, {
        status: "calling",
        calledAt: new Date().toISOString(),
        vapiCallId: vapiResult.id,
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      message: `Ligação a caminho! Atenda a chamada no ${phone}.`,
      leadId: leadId ?? null,
    });
  } catch (error) {
    console.error("Demo call error:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno ao processar a chamada. Tente novamente." },
      { status: 500 },
    );
  }
}
