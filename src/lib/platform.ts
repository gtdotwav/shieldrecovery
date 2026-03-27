// ── Brand definitions ──

type BrandConfig = {
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  marketingHeadline: string;
  logo: string;
  mark: string;
  accent: string;
  accentRgb: string;
  accentStrong: string;
  accentGlow: string;
  bgDark: string;
  bgDarkSecondary: string;
  gateway: {
    name: string;
    slug: string;
    webhookBasePath: string;
    docsUrl: string;
    legacyDocsUrl: string;
  };
  crm: {
    name: string;
  };
};

const brands: Record<string, BrandConfig> = {
  pagrecovery: {
    name: "PagRecovery",
    slug: "pagrecovery",
    shortDescription: "Recuperação inteligente de pagamentos",
    longDescription:
      "Plataforma inteligente de recuperação de pagamentos. Detecta falhas, contacta clientes e recupera vendas automaticamente.",
    marketingHeadline: "Recuperação de receita pronta para escalar.",
    logo: "/brand/pagrecovery-logo.png",
    mark: "/brand/pagrecovery-mark.png",
    accent: "#1ed760",
    accentRgb: "30,215,96",
    accentStrong: "#0fa47a",
    accentGlow: "rgba(30,215,96,0.2)",
    bgDark: "#030a07",
    bgDarkSecondary: "#041510",
    gateway: {
      name: "SuperPay",
      slug: "superpay",
      webhookBasePath: "/api/webhooks/superpay",
      docsUrl: "",
      legacyDocsUrl: "",
    },
    crm: { name: "CRM Integrado" },
  },
  shield: {
    name: "Shield Recovery",
    slug: "shield-recovery",
    shortDescription: "Plataforma de recuperação de receita",
    longDescription:
      "Plataforma inteligente que detecta falhas e recupera vendas automaticamente.",
    marketingHeadline: "Recuperação autônoma com inteligência artificial.",
    logo: "/brand/shield-recovery-logo.png",
    mark: "/brand/shield-recovery-logo.png",
    accent: "#f97316",
    accentRgb: "249,115,22",
    accentStrong: "#ea580c",
    accentGlow: "rgba(249,115,22,0.2)",
    bgDark: "#0d0d0d",
    bgDarkSecondary: "#111111",
    gateway: {
      name: "Shield Gateway",
      slug: "shield-gateway",
      webhookBasePath: "/api/webhooks/shield-gateway",
      docsUrl: "",
      legacyDocsUrl: "",
    },
    crm: { name: "CRM Integrado" },
  },
};

const activeBrand =
  (process.env.NEXT_PUBLIC_BRAND ?? "pagrecovery").toLowerCase();

export const platformBrand: BrandConfig =
  brands[activeBrand] ?? brands.pagrecovery;

const gatewayRegistry: Record<string, { name: string; webhookBasePath: string }> = {
  superpay: { name: "SuperPay", webhookBasePath: "/api/webhooks/superpay" },
  pagouai: { name: "Pagou.ai", webhookBasePath: "/api/webhooks/pagouai" },
  "shield-gateway": { name: "Shield Gateway", webhookBasePath: "/api/webhooks/shield-gateway" },
};

export function resolveGateway(slug?: string | null) {
  if (slug && gatewayRegistry[slug]) {
    return gatewayRegistry[slug];
  }
  return { name: platformBrand.gateway.name, webhookBasePath: platformBrand.gateway.webhookBasePath };
}

export function buildGatewayWebhookPath(sellerKey?: string | null, gatewaySlug?: string | null) {
  const gateway = resolveGateway(gatewaySlug);
  const normalizedSellerKey = sellerKey?.trim();

  if (!normalizedSellerKey) {
    return gateway.webhookBasePath;
  }

  return `${gateway.webhookBasePath}/${normalizedSellerKey}`;
}
