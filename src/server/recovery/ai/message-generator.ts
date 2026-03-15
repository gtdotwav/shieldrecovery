import type { MessageContext, GeneratedMessage } from "./types";
import type { MessagingChannel } from "@/server/recovery/types";

/**
 * Template-based message generator.
 *
 * In production this would call an LLM (OpenAI/Anthropic) for personalization.
 * For now we use high-quality handcrafted templates with variable interpolation.
 * The architecture is LLM-ready: swap `pickTemplate` with an API call.
 */

type MessageTemplate = {
  id: string;
  channel: MessagingChannel;
  tone: GeneratedMessage["tone"];
  template: string;
  condition?: (ctx: MessageContext) => boolean;
};

const TEMPLATES: MessageTemplate[] = [
  // ── WhatsApp: First contact ──
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
      "Sem stress — acontece bastante. Segue um novo link pra tentar: {link}",
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

  // ── WhatsApp: Follow-up ──
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

  // ── WhatsApp: Insufficient funds ──
  {
    id: "wa_insufficient_funds",
    channel: "whatsapp",
    tone: "empathetic",
    template:
      "Oi {name}! Vimos que o pagamento{product} não passou por saldo insuficiente. " +
      "Sem problema — geramos um link via Pix pra facilitar: {link}",
    condition: (ctx) => ctx.failureReason.includes("insufficient"),
  },

  // ── WhatsApp: Expired card ──
  {
    id: "wa_expired_card",
    channel: "whatsapp",
    tone: "casual",
    template:
      "Oi {name}! Parece que o cartão usado{product} está vencido. " +
      "Você pode tentar com outro cartão ou Pix neste link: {link}",
    condition: (ctx) => ctx.failureReason.includes("expired"),
  },

  // ── Email templates ──
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
      "Atenciosamente,\nEquipe Shield Recovery",
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
      "Atenciosamente,\nEquipe Shield Recovery",
    condition: (ctx) => ctx.attemptNumber >= 2,
  },

  // ── SMS templates ──
  {
    id: "sms_initial",
    channel: "sms",
    tone: "casual",
    template:
      "Shield Recovery: {name}, seu pagamento de {value} não foi processado. " +
      "Finalize aqui: {link}",
  },
];

/**
 * Generate a personalized recovery message.
 */
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

/**
 * Generate messages for all channels.
 */
export function generateAllChannelMessages(ctx: MessageContext): GeneratedMessage[] {
  const channels: MessagingChannel[] = ["whatsapp", "email", "sms"];

  return channels.map((channel) => {
    const channelCtx = { ...ctx, channel };
    return generateMessage(channelCtx);
  });
}

/**
 * Pick the best matching template for a given context.
 */
function pickTemplate(ctx: MessageContext): MessageTemplate {
  // Filter by channel
  const channelTemplates = TEMPLATES.filter((t) => t.channel === ctx.channel);

  // Try to find a template with a matching condition
  const conditional = channelTemplates.find((t) => t.condition?.(ctx));
  if (conditional) return conditional;

  // Fallback to first template for channel
  return channelTemplates[0] ?? TEMPLATES[0];
}

/**
 * Interpolate template variables.
 */
function interpolate(template: string, ctx: MessageContext): string {
  const value = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(ctx.cartValue);

  const product = ctx.productName ? ` de ${ctx.productName}` : "";
  const link = ctx.paymentLink ?? "[link de pagamento]";

  return template
    .replace(/\{name\}/g, ctx.customerName)
    .replace(/\{value\}/g, value)
    .replace(/\{product\}/g, product)
    .replace(/\{link\}/g, link);
}
