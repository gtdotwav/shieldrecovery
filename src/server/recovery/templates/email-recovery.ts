import { platformBrand } from "@/lib/platform";
import { escapeHtml } from "@/server/recovery/utils/html-escape";

const BRIGHT_LUMA_THRESHOLD = 0.6;

function hexLuma(hex: string): number {
  const sanitized = hex.replace("#", "").trim();
  if (sanitized.length !== 6) return 0;
  const r = parseInt(sanitized.slice(0, 2), 16) / 255;
  const g = parseInt(sanitized.slice(2, 4), 16) / 255;
  const b = parseInt(sanitized.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function escapeUrl(url: string): string {
  // Block javascript:/data: URIs to prevent click-jacking via injected links.
  const trimmed = url.trim();
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("data:") || lowered.startsWith("vbscript:")) {
    return "#";
  }
  return escapeHtml(trimmed);
}

export function buildRecoveryEmailHtml(input: {
  customerName: string;
  content: string;
  paymentLink?: string;
  unsubscribeUrl: string;
}): string {
  const accentColor = platformBrand.accent || "#6366f1";
  const brandName = escapeHtml(platformBrand.name || "PagRecovery");
  const safeName = escapeHtml(input.customerName ?? "");
  const safeContent = escapeHtml(input.content).replace(/\n/g, "<br>");
  const safeLink = input.paymentLink ? escapeUrl(input.paymentLink) : "";
  const safeUnsub = escapeUrl(input.unsubscribeUrl);
  // Pick header text color so it stays readable on light or dark accents.
  const headerTextColor = hexLuma(accentColor) > BRIGHT_LUMA_THRESHOLD ? "#0f172a" : "#ffffff";
  const buttonTextColor = headerTextColor;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; }
    a { color: inherit; }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:${accentColor};padding:24px 32px;">
              <h1 style="margin:0;color:${headerTextColor};font-size:20px;font-weight:600;">${brandName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#52525b;font-size:13px;">Olá${safeName ? `, ${safeName}` : ""},</p>
              <div style="margin:16px 0;color:#27272a;font-size:15px;line-height:1.6;">
                ${safeContent}
              </div>
              ${safeLink ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background-color:${accentColor};border-radius:6px;padding:12px 32px;">
                    <a href="${safeLink}" style="color:${buttonTextColor};text-decoration:none;font-size:15px;font-weight:600;">Pagar agora</a>
                  </td>
                </tr>
              </table>
              ` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;background-color:#fafafa;">
              <p style="margin:0;color:#71717a;font-size:11px;line-height:1.5;">
                Esta mensagem foi enviada por ${brandName}.<br>
                <a href="${safeUnsub}" style="color:#71717a;">Não desejo mais receber estas mensagens</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
