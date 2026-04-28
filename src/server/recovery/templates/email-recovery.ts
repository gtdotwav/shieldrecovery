import { platformBrand } from "@/lib/platform";

export function buildRecoveryEmailHtml(input: {
  customerName: string;
  content: string;
  paymentLink?: string;
  unsubscribeUrl: string;
}): string {
  const accentColor = platformBrand.accent || "#6366f1";
  const brandName = platformBrand.name || "PagRecovery";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:${accentColor};padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${brandName}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#71717a;font-size:13px;">Ola${input.customerName ? `, ${input.customerName}` : ""},</p>
              <div style="margin:16px 0;color:#27272a;font-size:15px;line-height:1.6;">
                ${input.content.replace(/\n/g, "<br>")}
              </div>
              ${input.paymentLink ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background-color:${accentColor};border-radius:6px;padding:12px 32px;">
                    <a href="${input.paymentLink}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Pagar agora</a>
                  </td>
                </tr>
              </table>
              ` : ""}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;background-color:#fafafa;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.5;">
                Esta mensagem foi enviada por ${brandName}.<br>
                <a href="${input.unsubscribeUrl}" style="color:#a1a1aa;">Nao desejo mais receber estas mensagens</a>
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
