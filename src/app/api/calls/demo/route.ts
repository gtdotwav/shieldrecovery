import { NextRequest, NextResponse } from "next/server";
import { getStorageService } from "@/server/recovery/services/storage";
import { platformBrand } from "@/lib/platform";
import { appEnv } from "@/server/recovery/config";

export const dynamic = "force-dynamic";

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

    // Rate limit: 1 demo call per phone number ever
    let existing: Awaited<ReturnType<typeof storage.findDemoCallLeadByPhone>> | null = null;
    try {
      existing = await storage.findDemoCallLeadByPhone(phone);
    } catch (dbError) {
      // Table might not exist yet — log and continue (skip rate limit)
      console.warn("Demo call lead lookup failed (table may not exist):", dbError);
    }

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Este número já recebeu uma demonstração. Cada número pode testar apenas uma vez." },
        { status: 429 },
      );
    }

    // Try to create the lead record (non-blocking if table doesn't exist)
    let leadId: string | undefined;
    try {
      const lead = await storage.createDemoCallLead({ name, phone });
      leadId = lead.id;
    } catch (dbError) {
      console.warn("Demo call lead creation failed (table may not exist):", dbError);
    }

    // Build a short demo call via VAPI directly (max 90 seconds)
    const firstName = name.split(/\s+/)[0] || "visitante";
    const brandName = platformBrand.name;

    const systemPrompt = [
      `Voce e a Ana, consultora de vendas da ${brandName}.`,
      `Voce esta ligando para o ${name}, que acabou de pedir uma demonstracao ao vivo no site.`,
      "",
      `CONTEXTO: A ${brandName} e uma plataforma de recuperacao autonoma de pagamentos. Quando o pagamento de um cliente falha — Pix expirado, cartao recusado, boleto vencido — a plataforma detecta automaticamente e:`,
      "1. Em 2 minutos, a IA envia uma mensagem personalizada no WhatsApp com link de pagamento",
      "2. Se o cliente nao responde, a IA faz follow-ups inteligentes adaptando tom e abordagem",
      "3. Para leads de alto valor, o Call Center de agentes IA (como voce!) liga com voz natural, negocia e envia o link na hora",
      "4. Tudo opera 24/7 sem equipe humana, com dashboard em tempo real",
      "",
      "TAXA DE RECUPERACAO: Entre 19% e 40% dependendo do nicho e funil.",
      "MODELO DE NEGOCIO: Zero setup, zero mensalidade. So cobra uma porcentagem sobre o que recuperar.",
      "",
      "OBJETIVO: Convencer o visitante a se cadastrar e plugar a plataforma. E muito simples:",
      "- Passo 1: Cria a conta gratuita no site",
      "- Passo 2: Joga o webhook do gateway de pagamento (qualquer um: Stripe, Mercado Pago, PagouAi, Hotmart, Kiwify, etc)",
      "- Passo 3: Escaneia o QR code do WhatsApp",
      "- Pronto! A plataforma ja comeca a recuperar automaticamente",
      "",
      "ROTEIRO:",
      `1. Cumprimente o ${firstName} pelo nome, se apresente como consultora da ${brandName}`,
      "2. Diga que essa ligacao e a prova de como o sistema funciona — foi disparada automaticamente em segundos",
      "3. Pergunte se ele ja vende online, qual gateway usa, se tem problema com pagamentos falhando",
      "4. Explique os beneficios: recuperacao autonoma, WhatsApp + IA + Call Center, zero custo fixo",
      "5. Enfatize a simplicidade: 'e so jogar o webhook e escanear o QR do WhatsApp, em 5 minutos ta rodando'",
      "6. Tente fechar: convide a criar a conta agora mesmo, diga que vai mandar o link por WhatsApp",
      "7. Se tiver duvida, responda com confianca usando os dados acima",
      "",
      "OBJECOES COMUNS:",
      "- 'Quanto custa?' → 'Zero pra comecar. Voce so paga uma porcentagem sobre o que a gente recuperar. Se nao recuperar nada, nao paga nada.'",
      "- 'Funciona com meu gateway?' → 'Sim, funciona com qualquer gateway via webhook. Stripe, Mercado Pago, Hotmart, Kiwify, Asaas, PagouAi... todos.'",
      "- 'E dificil integrar?' → 'Leva 5 minutos. Voce cola a URL do webhook no seu gateway e escaneia o QR do WhatsApp. Pronto.'",
      "- 'Preciso de equipe?' → 'Nao. A plataforma opera 100% sozinha, 24 horas por dia. Voce so acompanha os resultados no dashboard.'",
      "- 'Ja tentei e nao funcionou' → 'Provavelmente era envio manual ou email. A gente usa WhatsApp + IA conversacional + voz, tudo em tempo real. E outro nivel.'",
      "",
      "REGRAS:",
      "- Fale em portugues brasileiro natural e coloquial — como uma vendedora experiente e entusiasmada",
      "- Frases curtas e diretas. Nao enrole.",
      "- Seja persuasiva mas genuina. Transmita confianca.",
      "- NUNCA invente dados. Use apenas o que esta neste briefing.",
      "- Se o lead demonstrar interesse, SEMPRE feche com 'vou te mandar o link por WhatsApp agora'",
      "- Maximo 90 segundos — seja objetiva e va direto ao ponto",
    ].join("\n");

    const firstMessage = `Oi ${firstName}! Aqui é a Ana, da ${brandName}. Você pediu uma demonstração do nosso call center de IA e é exatamente isso que tá acontecendo agora — essa ligação foi disparada automaticamente em segundos. Imagina isso acontecendo com cada cliente seu que tem um pagamento pendente. Me conta, você já vende online? Qual gateway você usa?`;

    const vapiPayload = {
      name: `Demo: ${name}`,
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.7,
        },
        voice: (process.env.CARTESIA_VOICE_ID ?? "").trim()
          ? { provider: "cartesia" as const, voiceId: (process.env.CARTESIA_VOICE_ID ?? "").trim() }
          : { provider: "11labs" as const, voiceId: "EXAVITQu4vr4xnSDxMaL" },
        firstMessage,
        endCallMessage: `Foi um prazer falar com você, ${firstName}! Vou te mandar mais detalhes por WhatsApp. Até logo!`,
        transcriber: {
          provider: "deepgram",
          language: "pt-BR",
        },
        maxDurationSeconds: 90,
        silenceTimeoutSeconds: 15,
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
    const msg = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json(
      { ok: false, error: `Erro interno: ${msg.slice(0, 100)}` },
      { status: 500 },
    );
  }
}
