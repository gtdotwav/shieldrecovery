import type { MessagingChannel } from "@/server/recovery/types";

import { platformBrand } from "@/lib/platform";

import type {
  ConversationReplyContext,
  GeneratedMessage,
  MessageContext,
} from "./types";

type MessageTemplate = {
  id: string;
  channel: MessagingChannel;
  tone: GeneratedMessage["tone"];
  template: string;
  condition?: (ctx: MessageContext) => boolean;
};

const TEMPLATES: MessageTemplate[] = [
  // ── Method selection (initial message without link) ──
  {
    id: "wa_ask_method_empathetic",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}, tudo bem? Vi que o pagamento{product} de {value} nao foi concluido. " +
      "Posso te ajudar a finalizar agora mesmo.\n\n" +
      "Qual forma de pagamento voce prefere?\n" +
      "1 - PIX (aprovacao instantanea)\n" +
      "2 - Cartao de credito\n" +
      "3 - Boleto",
    condition: (ctx) => ctx.nextAction === "ask_payment_method",
  },
  {
    id: "wa_ask_method_casual",
    channel: "whatsapp",
    tone: "casual",
    template:
      "Oi {name}! Vi que o pagamento{product} de {value} ficou pendente. " +
      "Acontece, sem problema nenhum.\n\n" +
      "Como prefere pagar?\n" +
      "1 - PIX (na hora)\n" +
      "2 - Cartao de credito\n" +
      "3 - Boleto",
    condition: (ctx) => ctx.nextAction === "ask_payment_method" && ctx.cartValue < 20_000,
  },
  {
    id: "wa_ask_method_urgent",
    channel: "whatsapp",
    tone: "urgent",
    template:
      "{name}, o pagamento de {value}{product} nao foi processado. " +
      "Para garantir sua compra, escolha a forma de pagamento:\n\n" +
      "1 - PIX (aprovacao imediata)\n" +
      "2 - Cartao de credito\n" +
      "3 - Boleto",
    condition: (ctx) => ctx.nextAction === "ask_payment_method" && ctx.cartValue >= 50_000,
  },
  // ── Pix-first initial templates (QR/link already available) ──
  {
    id: "wa_pix_initial_empathetic",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}, tudo bem? O pagamento{product} de {value} ficou pendente. " +
      "Ja deixei o link e o Pix prontos aqui embaixo pra facilitar. " +
      "Qualquer duvida, estou a disposicao.",
    condition: (ctx) =>
      ctx.nextAction === "send_initial_message" && ctx.paymentMethod === "pix",
  },
  {
    id: "wa_pix_initial_urgent",
    channel: "whatsapp",
    tone: "urgent",
    template:
      "{name}, o pagamento{product} de {value} ainda esta pendente. " +
      "O link e o Pix estao aqui embaixo para voce finalizar agora.",
    condition: (ctx) =>
      ctx.nextAction === "send_initial_message" &&
      ctx.paymentMethod === "pix" &&
      ctx.cartValue >= 50_000,
  },
  {
    id: "wa_pix_initial_abandoned",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}, tudo bem? Vi que sua compra{product} ficou em aberto. " +
      "Deixei o link e o Pix aqui embaixo caso queira retomar. " +
      "Se precisar de algo, e so me chamar.",
    condition: (ctx) =>
      ctx.nextAction === "send_initial_message" &&
      ctx.paymentMethod === "pix" &&
      ctx.failureReason.toLowerCase().includes("abandoned"),
  },
  // ── Checkout link templates (customer picks payment method) ──
  {
    id: "wa_checkout_empathetic",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}, tudo bem? O pagamento{product} de {value} ficou pendente. " +
      "Deixei o link aqui embaixo para voce escolher a melhor forma de pagamento. " +
      "Qualquer duvida, e so me chamar.",
    condition: (ctx) => ctx.nextAction === "send_checkout_link",
  },
  {
    id: "wa_checkout_casual",
    channel: "whatsapp",
    tone: "casual",
    template:
      "Oi {name}! Vi que o pagamento{product} de {value} ficou pendente. " +
      "Sem problema, o link pra voce finalizar esta aqui embaixo.",
    condition: (ctx) =>
      ctx.nextAction === "send_checkout_link" && ctx.cartValue < 20_000,
  },
  {
    id: "wa_checkout_urgent",
    channel: "whatsapp",
    tone: "urgent",
    template:
      "{name}, o pagamento de {value}{product} nao foi processado. " +
      "Acesse o link abaixo para finalizar sua compra agora.",
    condition: (ctx) =>
      ctx.nextAction === "send_checkout_link" && ctx.cartValue >= 50_000,
  },
  // ── Legacy initial templates (with link) ──
  {
    id: "wa_initial_empathetic",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}, tudo bem? O pagamento{product} ficou pendente. " +
      "Gerei um novo link seguro para voce finalizar: {link}",
  },
  {
    id: "wa_initial_casual",
    channel: "whatsapp",
    tone: "casual",
    template:
      "Oi {name}! Vi que o pagamento{product} nao foi concluido. " +
      "Sem problema, segue o link pra tentar de novo: {link}",
    condition: (ctx) => ctx.cartValue < 20_000,
  },
  {
    id: "wa_initial_urgent",
    channel: "whatsapp",
    tone: "urgent",
    template:
      "{name}, o pagamento de {value}{product} nao foi processado. " +
      "Finalize pelo link abaixo para garantir sua compra: {link}",
    condition: (ctx) => ctx.cartValue >= 50_000,
  },
  {
    id: "wa_followup_empathetic",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}, o link para concluir o pagamento{product} continua disponivel. " +
      "Se precisar de ajuda, e so me chamar: {link}",
    condition: (ctx) => ctx.attemptNumber >= 2,
  },
  {
    id: "wa_followup_urgent",
    channel: "whatsapp",
    tone: "urgent",
    template:
      "{name}, seu pagamento de {value}{product} ainda esta pendente. " +
      "O link expira em breve: {link}",
    condition: (ctx) => ctx.attemptNumber >= 2 && ctx.cartValue >= 30_000,
  },
  {
    id: "wa_insufficient_funds",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}, o pagamento{product} nao foi aprovado por saldo. " +
      "Gerei um link via Pix para facilitar: {link}",
    condition: (ctx) => ctx.failureReason.includes("insufficient"),
  },
  {
    id: "wa_expired_card",
    channel: "whatsapp",
    tone: "casual",
    template:
      "Oi {name}, parece que o cartao usado{product} esta vencido. " +
      "Voce pode tentar com outro cartao ou Pix por aqui: {link}",
    condition: (ctx) => ctx.failureReason.includes("expired"),
  },
  {
    id: "email_initial",
    channel: "email",
    tone: "empathetic",
    template:
      "Olá {name},\n\n" +
      "Identificamos que houve um problema no processamento do seu pagamento{product} " +
      "no valor de {value}.\n\n" +
      "Geramos um novo link seguro para que você possa finalizar sua compra:\n" +
      "{link}\n\n" +
      "Se precisar de ajuda, basta responder este e-mail.\n\n" +
      `Atenciosamente,\nEquipe ${platformBrand.name}`,
  },
  {
    id: "email_followup",
    channel: "email",
    tone: "urgent",
    template:
      "Olá {name},\n\n" +
      "Ainda não identificamos a confirmação do seu pagamento{product} " +
      "de {value}.\n\n" +
      "O link para finalização continua disponível:\n{link}\n\n" +
      "Estamos aqui para ajudar.\n\n" +
      `Atenciosamente,\nEquipe ${platformBrand.name}`,
    condition: (ctx) => ctx.attemptNumber >= 2,
  },
  {
    id: "sms_initial",
    channel: "sms",
    tone: "casual",
    template:
      `${platformBrand.name}: {name}, seu pagamento de {value} não foi processado. ` +
      "Finalize aqui: {link}",
  },
];

export function generateMessage(ctx: MessageContext): GeneratedMessage {
  const template = pickTemplate(ctx);
  const content = interpolate(template.template, ctx);

  return {
    content,
    channel: template.channel,
    tone: template.tone,
    templateUsed: template.id,
  };
}

export async function generateRecoveryMessage(input: {
  context: MessageContext;
  apiKey?: string;
}): Promise<GeneratedMessage> {
  const fallback = generateMessage(input.context);

  if (!input.apiKey) {
    return fallback;
  }

  try {
    const prompt = buildRecoveryPrompt(input.context);
    const content = await generateOpenAiText({
      apiKey: input.apiKey,
      prompt,
    });

    if (!content) {
      return fallback;
    }

    return {
      ...fallback,
      content,
      templateUsed: "openai_recovery_flow",
    };
  } catch {
    return fallback;
  }
}

export async function generateConversationReply(
  input: { apiKey?: string } & ConversationReplyContext,
): Promise<string> {
  const fallback = buildFallbackReply(input);

  if (!input.apiKey) {
    return fallback;
  }

  try {
    const prompt = buildReplyPrompt(input);
    const content = await generateOpenAiText({
      apiKey: input.apiKey,
      prompt,
    });

    return content || fallback;
  } catch {
    return fallback;
  }
}

export function generateAllChannelMessages(ctx: MessageContext): GeneratedMessage[] {
  const channels: MessagingChannel[] = ["whatsapp", "email", "sms"];

  return channels.map((channel) => {
    const channelCtx = { ...ctx, channel };
    return generateMessage(channelCtx);
  });
}

function pickTemplate(ctx: MessageContext): MessageTemplate {
  const channelTemplates = TEMPLATES.filter((template) => template.channel === ctx.channel);
  const candidates = channelTemplates.filter((template) =>
    template.condition ? template.condition(ctx) : true,
  );
  const preferredByTone = ctx.tonePreference
    ? candidates.find((template) => template.tone === ctx.tonePreference)
    : undefined;

  return preferredByTone ?? candidates[0] ?? channelTemplates[0] ?? TEMPLATES[0];
}

function interpolate(template: string, ctx: MessageContext): string {
  const value = formatMinorUnitCurrency(ctx.cartValue);

  const product = ctx.productName ? ` de ${ctx.productName}` : "";
  const link = ctx.paymentLink ?? "";
  const base = template
    .replace(/\{name\}/g, ctx.customerName || "cliente")
    .replace(/\{value\}/g, value)
    .replace(/\{product\}/g, product)
    .replace(/\{link\}/g, link);

  return base;
}

function buildRecoveryPrompt(ctx: MessageContext) {
  const value = formatMinorUnitCurrency(ctx.cartValue);

  const isAskMethod = ctx.nextAction === "ask_payment_method";
  const isCheckoutLink = ctx.nextAction === "send_checkout_link";
  const isPixFirstInitial =
    ctx.nextAction === "send_initial_message" && ctx.paymentMethod === "pix";

  const linkRule = isAskMethod
    ? [
        "- NAO inclua nenhum link. O link sera enviado depois que o cliente escolher.",
        "- Pergunte qual forma de pagamento o cliente prefere: PIX, cartao de credito ou boleto.",
        "- Liste as opcoes numeradas (1, 2, 3) para facilitar a resposta.",
      ]
    : isCheckoutLink
      ? [
          "- Informe que o link de pagamento esta logo abaixo.",
          "- Diga que o cliente pode escolher a forma de pagamento que preferir (Pix, cartao ou boleto) diretamente no link.",
          "- NAO inclua o link no corpo do texto (ele e adicionado automaticamente abaixo).",
          "- NAO mencione codigo Pix copia e cola.",
        ]
    : isPixFirstInitial
      ? [
          "- Informe que o pagamento via Pix ja esta pronto.",
          "- Diga que o link e o Pix estao aqui embaixo.",
          "- NAO inclua o link nem o codigo Pix no corpo do texto (eles sao adicionados automaticamente abaixo).",
          "- NAO escreva 'copia e cola' no texto — o codigo Pix e enviado separadamente.",
        ]
    : [
        ctx.paymentLink
          ? "- NAO inclua o link no corpo do texto (ele e adicionado automaticamente abaixo da mensagem)."
          : "- Nao mencione link pois ainda nao esta disponivel.",
      ];

  const approachDirective =
    ctx.messagingApproach === "urgent"
      ? [
          "Estilo de abordagem: URGENTE.",
          "- Use frases curtas e assertivas que transmitem urgencia.",
          "- Enfatize que o tempo e limitado ou que a oferta pode expirar.",
          "- Seja direto, sem rodeios, mas sem ser agressivo.",
          "- Exemplo de tom: 'Seu pedido esta reservado, mas o prazo esta acabando.'",
        ]
      : ctx.messagingApproach === "professional"
        ? [
            "Estilo de abordagem: PROFISSIONAL.",
            "- Use linguagem comercial, cordial e objetiva.",
            "- Mantenha formalidade leve, como um atendimento de excelencia.",
            "- Transmita confianca e credibilidade.",
            "- Exemplo de tom: 'Identificamos uma pendencia no seu pagamento e gostaríamos de ajuda-lo a resolver.'",
          ]
        : [
            "Estilo de abordagem: AMIGAVEL.",
            "- Use linguagem leve, acolhedora e proxima.",
            "- Escreva como um amigo que quer ajudar, sem ser invasivo.",
            "- Use primeira pessoa e tom conversacional.",
            "- Exemplo de tom: 'Oi! Vi que seu pagamento ficou pendente, posso te ajudar a finalizar?'",
          ];

  return [
    "Voce escreve mensagens curtas de recuperacao de pagamento para WhatsApp em portugues do Brasil.",
    "Objetivo: recuperar a compra com linguagem humana, profissional e objetiva.",
    ...approachDirective,
    "Regras:",
    "- Escreva no maximo 3 frases curtas e diretas.",
    "- Comece com 'Oi {nome}' e va direto ao ponto.",
    "- Mencione o valor e o produto quando disponiveis.",
    "- NAO repita informacoes. Cada frase deve trazer algo novo.",
    "- NAO inclua o codigo Pix nem o link de pagamento no corpo da mensagem (eles sao adicionados automaticamente abaixo do texto).",
    "- Quando mencionar o link ou Pix, diga 'aqui embaixo' (nunca 'logo abaixo' ou 'abaixo').",
    `- Use apenas o link seguro da ${platformBrand.name} quando houver link disponivel.`,
    ...linkRule,
    "- NAO use markdown, aspas, emojis, exclamacoes excessivas nem texto tecnico.",
    "- NAO use placeholders como [link] ou [link de pagamento].",
    "- NAO diga 'Posso te ajudar a finalizar agora?' nem variantes desta pergunta — e uma mensagem, nao um chat.",
    ...(ctx.sellerGuidance
      ? [
          "- Siga a direcao operacional do seller sem contradizer as regras acima.",
          `Direcao do seller: ${ctx.sellerGuidance}`,
        ]
      : []),
    "",
    `Canal: ${ctx.channel}`,
    `Cliente: ${ctx.customerName}`,
    `Produto: ${ctx.productName || "Nao informado"}`,
    `Valor: ${value}`,
    `Motivo da falha ou pendencia: ${ctx.failureReason}`,
    `Tentativa numero: ${ctx.attemptNumber}`,
    ...(ctx.paymentLink ? [`Link de pagamento: ${ctx.paymentLink}`] : []),
    `Metodo de pagamento: ${ctx.paymentMethod || "Nao informado"}`,
    `Tom desejado: ${ctx.tonePreference || "Nao informado"}`,
    `Abordagem do seller: ${ctx.messagingApproach || "friendly"}`,
    `Proxima acao esperada: ${ctx.nextAction || "Nao informado"}`,
    `Urgencia: ${ctx.recoveryUrgency || "Nao informado"}`,
    `Motivo estrategico: ${ctx.decisionReason || "Nao informado"}`,
  ].join("\n");
}

function buildReplyPrompt(input: ConversationReplyContext) {
  const isMethodSelection =
    input.latestInboundIntent === "payment_method_pix" ||
    input.latestInboundIntent === "payment_method_card" ||
    input.latestInboundIntent === "payment_method_boleto";

  const methodInstruction = isMethodSelection
    ? [
        "IMPORTANTE: O cliente acabou de escolher a forma de pagamento.",
        "Confirme a escolha com entusiasmo e inclua o link de pagamento.",
        "Nao ofereca outras opcoes, apenas confirme a escolha e envie o link.",
      ]
    : [];

  const replyApproachDirective =
    input.messagingApproach === "urgent"
      ? ["Estilo: urgente e assertivo, enfatize prazo e escassez."]
      : input.messagingApproach === "professional"
        ? ["Estilo: profissional e cordial, linguagem comercial objetiva."]
        : ["Estilo: amigavel e acolhedor, como um amigo ajudando."];

  return [
    "Voce responde um cliente em uma conversa de recuperacao de pagamento via WhatsApp.",
    "Escreva em portugues do Brasil, de forma curta, profissional e objetiva.",
    ...replyApproachDirective,
    "Regras:",
    "- Responda a ultima mensagem do cliente em no maximo 2 frases.",
    "- Va direto ao ponto sem repeticoes.",
    "- NAO inclua o link nem o codigo Pix no corpo do texto (eles sao adicionados automaticamente abaixo da mensagem).",
    "- Quando mencionar link ou Pix, diga 'aqui embaixo'.",
    "- NAO repita o valor ou o produto se ja foi mencionado na conversa.",
    "- NAO use markdown, aspas, listas, emojis ou linguagem robotica.",
    "- NAO faca perguntas desnecessarias como 'Posso te ajudar?' — conduza direto para a acao.",
    ...(input.sellerGuidance
      ? [
          "- Siga a direcao operacional do seller sem contradizer as regras acima.",
          `Direcao do seller: ${input.sellerGuidance}`,
        ]
      : []),
    ...methodInstruction,
    "",
    `Cliente: ${input.customerName}`,
    `Produto: ${input.productName || "Nao informado"}`,
    `Metodo: ${input.paymentMethod || "Nao informado"}`,
    `Status do pagamento: ${input.paymentStatus || "Nao informado"}`,
    `Motivo da falha: ${input.failureReason || "Nao informado"}`,
    `Ultima mensagem do cliente: ${input.latestInboundContent || "Sem mensagem inbound"}`,
    `Intencao detectada no inbound: ${input.latestInboundIntent || "Nao informado"}`,
    `Tom desejado: ${input.tonePreference || "Nao informado"}`,
    `Proxima acao sugerida: ${input.nextAction || "Nao informado"}`,
    `Motivo estrategico: ${input.decisionReason || "Nao informado"}`,
    `Precisa handoff humano: ${input.requiresHumanHandoff ? "sim" : "nao"}`,
    `Link de pagamento: ${input.retryLink || "Nao informado"}`,
  ].join("\n");
}

async function generateOpenAiText(input: {
  apiKey: string;
  prompt: string;
}): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: input.prompt,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const fromTopLevel = payload.output_text?.trim();
  if (fromTopLevel) {
    return fromTopLevel;
  }

  const nestedText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text?.trim() ?? "")
    .find(Boolean);

  return nestedText ?? "";
}

function buildFallbackReply(input: ConversationReplyContext) {
  const name = firstName(input.customerName || "Cliente");
  const product = input.productName ? ` do pedido ${input.productName}` : "";
  const latestInbound = (input.latestInboundContent ?? "").toLowerCase();
  const retrySentence = "";

  if (input.requiresHumanHandoff) {
    return `${name}, vou direcionar seu caso para atendimento. O pagamento${product} continua disponivel aqui embaixo.`;
  }

  if (input.latestInboundIntent === "payment_method_pix") {
    return `Perfeito, ${name}. O link e o Pix${product} estao aqui embaixo.`;
  }

  if (input.latestInboundIntent === "payment_method_card") {
    return `Perfeito, ${name}. O link para pagamento via cartao${product} esta aqui embaixo.`;
  }

  if (input.latestInboundIntent === "payment_method_boleto") {
    return `Perfeito, ${name}. O boleto${product} esta sendo gerado, acesse pelo link aqui embaixo.`;
  }

  if (input.latestInboundIntent === "payment_intent") {
    return `Perfeito, ${name}. O pagamento${product} esta pronto aqui embaixo.`;
  }

  if (input.latestInboundIntent === "needs_time") {
    return `Sem problema, ${name}. O link${product} fica disponivel quando voce quiser finalizar.`;
  }

  if (input.latestInboundIntent === "question") {
    return `${name}, o pagamento${product} esta acessivel pelo link aqui embaixo. Se tiver duvidas, e so me chamar.`;
  }

  if (input.latestInboundIntent === "objection") {
    return `Entendi, ${name}. Se mudar de ideia, o link${product} esta aqui embaixo.`;
  }

  if (
    latestInbound.includes("pix") ||
    latestInbound.includes("link") ||
    latestInbound.includes("codigo")
  ) {
    return `${name}, o link e o Pix${product} estao aqui embaixo.`;
  }

  if (
    latestInbound.includes("erro") ||
    latestInbound.includes("não foi") ||
    latestInbound.includes("nao foi") ||
    latestInbound.includes("cartão") ||
    latestInbound.includes("cartao")
  ) {
    return `${name}, gerei um novo link seguro${product} aqui embaixo para voce tentar novamente.`;
  }

  if (
    latestInbound.includes("depois") ||
    latestInbound.includes("mais tarde") ||
    latestInbound.includes("amanhã") ||
    latestInbound.includes("amanha")
  ) {
    return `Sem problema, ${name}. O link${product} fica disponivel quando voce quiser.`;
  }

  return `${name}, o pagamento${product} esta pronto aqui embaixo. Qualquer duvida, e so me chamar.`;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Cliente";
}

function formatMinorUnitCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number.isFinite(value) ? value : 0) / 100);
}
