export const platformBrand = {
  name: "PagRecovery",
  slug: "pagrecovery",
  shortDescription: "Revenue recovery powered by Pagou.ai",
  longDescription:
    "Estrutura de recovery pronta para operar com Pagou.ai e evoluir para white label.",
  marketingHeadline: "Recuperacao de receita pronta para escalar em white label.",
  gateway: {
    name: "Pagou.ai",
    slug: "pagouai",
    webhookBasePath: "/api/webhooks/pagouai",
    docsUrl: "https://developer.pagou.ai/",
    legacyDocsUrl: "https://pagouai.readme.io/reference/introducao",
  },
  crm: {
    name: "CRM Integrado",
  },
} as const;

export function buildGatewayWebhookPath(sellerKey?: string | null) {
  const normalizedSellerKey = sellerKey?.trim();

  if (!normalizedSellerKey) {
    return platformBrand.gateway.webhookBasePath;
  }

  return `${platformBrand.gateway.webhookBasePath}/${normalizedSellerKey}`;
}

