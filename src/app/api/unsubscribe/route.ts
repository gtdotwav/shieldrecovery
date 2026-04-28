import { platformBrand } from "@/lib/platform";
import { processOptOut } from "@/server/recovery/services/opt-out-service";
import type { OptOutChannel } from "@/server/recovery/types";

const VALID_CHANNELS: OptOutChannel[] = ["whatsapp", "sms", "email", "voice", "all"];

function htmlResponse(body: string, status = 200): Response {
  const accentColor = platformBrand.accent || "#6366f1";
  const brandName = platformBrand.name || "PagRecovery";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelar mensagens - ${brandName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 420px; width: 100%; overflow: hidden; }
    .header { background: ${accentColor}; padding: 20px 24px; }
    .header h1 { color: #fff; font-size: 18px; font-weight: 600; }
    .body { padding: 24px; }
    .body p { color: #27272a; font-size: 15px; line-height: 1.6; margin-bottom: 16px; }
    .btn { display: inline-block; background: ${accentColor}; color: #fff; border: none; border-radius: 6px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
    .btn:hover { opacity: 0.9; }
    .muted { color: #a1a1aa; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header"><h1>${brandName}</h1></div>
    <div class="body">${body}</div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * GET /api/unsubscribe?contact=...&channel=...
 * Shows a confirmation page before processing opt-out.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const contact = url.searchParams.get("contact");
  const channel = url.searchParams.get("channel") || "email";

  if (!contact) {
    return htmlResponse(`<p>Link invalido.</p><p class="muted">Parametro de contato ausente.</p>`, 400);
  }

  if (!VALID_CHANNELS.includes(channel as OptOutChannel)) {
    return htmlResponse(`<p>Canal invalido.</p>`, 400);
  }

  return htmlResponse(`
    <p>Deseja mesmo cancelar o recebimento de mensagens?</p>
    <p class="muted" style="margin-bottom:20px">Contato: ${contact}</p>
    <form method="POST" action="/api/unsubscribe">
      <input type="hidden" name="contact" value="${contact}">
      <input type="hidden" name="channel" value="${channel}">
      <button type="submit" class="btn">Confirmar cancelamento</button>
    </form>
  `);
}

/**
 * POST /api/unsubscribe
 * Processes the opt-out and shows confirmation.
 */
export async function POST(request: Request) {
  let contact: string | null = null;
  let channel: string | null = null;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    contact = formData.get("contact") as string | null;
    channel = formData.get("channel") as string | null;
  } else {
    try {
      const body = await request.json();
      contact = body.contact ?? null;
      channel = body.channel ?? null;
    } catch {
      return htmlResponse(`<p>Requisicao invalida.</p>`, 400);
    }
  }

  if (!contact) {
    return htmlResponse(`<p>Parametro de contato ausente.</p>`, 400);
  }

  const resolvedChannel: OptOutChannel = VALID_CHANNELS.includes(channel as OptOutChannel)
    ? (channel as OptOutChannel)
    : "email";

  try {
    await processOptOut({
      contactValue: contact,
      channel: resolvedChannel,
      source: "api",
      reason: "unsubscribe_link",
    });

    return htmlResponse(`
      <p>Pronto! Voce nao recebera mais mensagens.</p>
      <p class="muted" style="margin-top:8px">Se mudar de ideia, e so nos enviar uma mensagem.</p>
    `);
  } catch {
    return htmlResponse(`<p>Ocorreu um erro. Tente novamente mais tarde.</p>`, 500);
  }
}
