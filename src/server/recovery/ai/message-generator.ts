import type { MessagingChannel } from "@/server/recovery/types";

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
      "Oi {name}! Notamos que houve um problema no pagamento do seu pedido{product} no valor de {value}. " +
      "Queremos te ajudar a finalizar sua compra rapidamente.\n\n" +
      "Como deseja pagar?\n" +
      "1 - PIX\n" +
      "2 - Cartao de credito\n" +
      "3 - Boleto",
    condition: (ctx) => ctx.nextAction === "ask_payment_method",
  },
  {
    id: "wa_ask_method_casual",
    channel: "whatsapp",
    tone: "casual",
    template:
      "E ai {name}! Vi que o pagamento{product} de {value} nao passou dessa vez. " +
      "Sem stress, acontece bastante.\n\n" +
      "Escolhe ai como prefere pagar:\n" +
      "1 - PIX\n" +
      "2 - Cartao de credito\n" +
      "3 - Boleto",
    condition: (ctx) => ctx.nextAction === "ask_payment_method" && ctx.cartValue < 200,
  },
  {
    id: "wa_ask_method_urgent",
    channel: "whatsapp",
    tone: "urgent",
    template:
      "{name}, seu pagamento de {value}{product} nao foi processado. " +
      "Para garantir sua compra, me diga a forma de pagamento:\n\n" +
      "1 - PIX\n" +
      "2 - Cartao de credito\n" +
      "3 - Boleto",
    condition: (ctx) => ctx.nextAction === "ask_payment_method" && ctx.cartValue >= 500,
  },
  // ── Legacy initial templates (with link) ──
  {
    id: "wa_initial_empathetic",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}! Notamos que houve um problema no pagamento do seu pedido{product}. " +
      "Queremos te ajudar a finalizar sua compra rapidamente. " +
      "Aqui está um novo link seguro para pagamento: {link}",
  },
  {
    id: "wa_initial_casual",
    channel: "whatsapp",
    tone: "casual",
    template:
      "E aí {name}! Tudo certo? Vi que o pagamento{product} não passou dessa vez. " +
      "Sem stress - acontece bastante. Segue um novo link pra tentar: {link}",
    condition: (ctx) => ctx.cartValue < 200,
  },
  {
    id: "wa_initial_urgent",
    channel: "whatsapp",
    tone: "urgent",
    template:
      "{name}, seu pagamento de {value}{product} não foi processado. " +
      "Para garantir sua compra, finalize o pagamento pelo link abaixo: {link}",
    condition: (ctx) => ctx.cartValue >= 500,
  },
  {
    id: "wa_followup_empathetic",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}, passando aqui de novo. Ainda estamos com o link disponível " +
      "para você completar o pagamento{product}. Qualquer dúvida, estou aqui! {link}",
    condition: (ctx) => ctx.attemptNumber >= 2,
  },
  {
    id: "wa_followup_urgent",
    channel: "whatsapp",
    tone: "urgent",
    template:
      "{name}, este é um lembrete importante: seu pagamento de {value}{product} " +
      "continua pendente. O link expira em breve: {link}",
    condition: (ctx) => ctx.attemptNumber >= 2 && ctx.cartValue >= 300,
  },
  {
    id: "wa_insufficient_funds",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}! Vimos que o pagamento{product} não passou por saldo insuficiente. " +
      "Sem problema - geramos um link via Pix pra facilitar: {link}",
    condition: (ctx) => ctx.failureReason.includes("insufficient"),
  },
  {
    id: "wa_expired_card",
    channel: "whatsapp",
    tone: "casual",
    template:
      "Oi {name}! Parece que o cartão usado{product} está vencido. " +
      "Você pode tentar com outro cartão ou Pix neste link: {link}",
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
      "Atenciosamente,\nEquipe PagRecovery",
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
      "Atenciosamente,\nEquipe PagRecovery",
    condition: (ctx) => ctx.attemptNumber >= 2,
  },
  {
    id: "sms_initial",
    channel: "sms",
    tone: "casual",
    template:
      "PagRecovery: {name}, seu pagamento de {value} não foi processado. " +
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
  const value = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(ctx.cartValue);

  const product = ctx.productName ? ` de ${ctx.productName}` : "";
  const link = ctx.paymentLink ?? "";
  const pixCode = ctx.pixCode?.trim();

  const base = template
    .replace(/\{name\}/g, ctx.customerName || "cliente")
    .replace(/\{value\}/g, value)
    .replace(/\{product\}/g, product)
    .replace(/\{link\}/g, link);

  if (!pixCode || ctx.channel !== "whatsapp") {
    return base;
  }

  return `${base}\n\nCodigo Pix copia e cola:\n${pixCode}`;
}

function buildRecoveryPrompt(ctx: MessageContext) {
  const value = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(ctx.cartValue);

  const isAskMethod = ctx.nextAction === "ask_payment_method";

  const linkRule = isAskMethod
    ? [
        "- NAO inclua nenhum link. O link sera enviado depois que o cliente escolher.",
        "- Pergunte qual forma de pagamento o cliente prefere: PIX, cartao de credito ou boleto.",
        "- Liste as opcoes numeradas (1, 2, 3) para facilitar a resposta.",
      ]
    : [
        ctx.paymentLink
          ? "- Inclua o link exatamente uma vez, no final."
          : "- Nao mencione link pois ainda nao esta disponivel.",
      ];

  return [
    "Voce escreve mensagens curtas de recovery de pagamento para WhatsApp ou email, em portugues do Brasil.",
    "Objetivo: recuperar a compra com linguagem humana, direta, confiavel e comercial.",
    "Regras:",
    "- Seja curto e natural.",
    "- Mencione o primeiro nome do cliente.",
    "- Explique o motivo do contato com clareza.",
    "- Convide para concluir o pagamento agora.",
    ...linkRule,
    "- Nao use markdown, aspas, emojis nem texto tecnico.",
    "- Nao use placeholders como [link] ou [link de pagamento].",
    "",
    `Canal: ${ctx.channel}`,
    `Cliente: ${ctx.customerName}`,
    `Produto: ${ctx.productName || "Nao informado"}`,
    `Valor: ${value}`,
    `Motivo da falha ou pendencia: ${ctx.failureReason}`,
    `Tentativa numero: ${ctx.attemptNumber}`,
    ...(ctx.paymentLink ? [`Link de pagamento: ${ctx.paymentLink}`] : []),
    `Metodo de pagamento: ${ctx.paymentMethod || "Nao informado"}`,
    `Codigo Pix: ${ctx.pixCode || "Nao informado"}`,
    `Tom desejado: ${ctx.tonePreference || "Nao informado"}`,
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

  return [
    "Voce responde um cliente em uma conversa de recovery de pagamento.",
    "Escreva em portugues do Brasil, de forma curta, clara e comercial.",
    "Regras:",
    "- Responda a ultima mensagem do cliente.",
    "- Mostre ajuda e conduza para a conclusao do pagamento.",
    "- Se houver link, inclua-o uma vez no final.",
    "- Nao use markdown, aspas, listas, emojis ou linguagem robotica.",
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
    `Codigo Pix: ${input.pixCode || "Nao informado"}`,
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
  const retrySentence = input.retryLink
    ? `\n\nSegue o link para concluir agora: ${input.retryLink}`
    : "";
  const pixSentence = input.pixCode
    ? `\n\nCodigo Pix copia e cola:\n${input.pixCode}`
    : "";

  if (input.requiresHumanHandoff) {
    return `Oi, ${name}. Vou encaminhar seu caso${product} para acompanhamento mais próximo e manter o pagamento pronto por aqui.${retrySentence}${pixSentence}`;
  }

  if (input.latestInboundIntent === "payment_method_pix") {
    return `Perfeito, ${name}! Gerando seu pagamento via PIX${product}.${retrySentence}${pixSentence}`;
  }

  if (input.latestInboundIntent === "payment_method_card") {
    return `Perfeito, ${name}! Preparando o pagamento via cartao de credito${product}.${retrySentence}`;
  }

  if (input.latestInboundIntent === "payment_method_boleto") {
    return `Perfeito, ${name}! Gerando seu boleto${product}.${retrySentence}`;
  }

  if (input.latestInboundIntent === "payment_intent") {
    return `Perfeito, ${name}. Deixei o pagamento${product} pronto para você concluir agora.${retrySentence}${pixSentence}`;
  }

  if (input.latestInboundIntent === "needs_time") {
    return `Sem problema, ${name}. Vou deixar o pagamento${product} preparado para quando você quiser retomar.${retrySentence}${pixSentence}`;
  }

  if (input.latestInboundIntent === "question") {
    return `Oi, ${name}. Vou te ajudar com isso e já deixei o pagamento${product} acessível caso você queira concluir agora.${retrySentence}${pixSentence}`;
  }

  if (input.latestInboundIntent === "objection") {
    return `Oi, ${name}. Entendi o ponto sobre o pagamento${product}. Posso te ajudar a retomar da forma mais simples possível.${retrySentence}${pixSentence}`;
  }

  if (
    latestInbound.includes("pix") ||
    latestInbound.includes("link") ||
    latestInbound.includes("codigo")
  ) {
    return `Oi, ${name}. Separei novamente o acesso ao pagamento${product} para facilitar seu follow-up.${retrySentence}${pixSentence}`;
  }

  if (
    latestInbound.includes("erro") ||
    latestInbound.includes("não foi") ||
    latestInbound.includes("nao foi") ||
    latestInbound.includes("cartão") ||
    latestInbound.includes("cartao")
  ) {
    return `Oi, ${name}. Entendi o problema no pagamento${product}. Posso te ajudar a retomar por um novo link seguro agora.${retrySentence}${pixSentence}`;
  }

  if (
    latestInbound.includes("depois") ||
    latestInbound.includes("mais tarde") ||
    latestInbound.includes("amanhã") ||
    latestInbound.includes("amanha")
  ) {
    return `Perfeito, ${name}. Vou deixar o pagamento${product} pronto para quando você quiser finalizar.${retrySentence}${pixSentence}`;
  }

  return `Oi, ${name}. Estou acompanhando seu caso${product} e ja deixei a continuacao do pagamento pronta para voce.${retrySentence}${pixSentence}`;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Cliente";
}
