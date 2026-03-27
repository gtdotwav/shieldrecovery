export const CHECKOUT_SHORT_ID_LENGTH = 8;
export const CHECKOUT_DEFAULT_EXPIRY_MINUTES = 60;
export const CHECKOUT_DEFAULT_CURRENCY = "BRL";

export const METHOD_LABELS: Record<string, string> = {
  card: "Cartao de Credito",
  pix: "PIX",
  boleto: "Boleto Bancario",
  crypto: "Criptomoeda",
};

export const METHOD_DESCRIPTIONS: Record<string, string> = {
  card: "Parcele em ate 12x no cartao",
  pix: "Aprovacao instantanea via QR Code",
  boleto: "Compensacao em ate 3 dias uteis",
  crypto: "Bitcoin, Ethereum e USDT",
};

export const METHOD_BADGES: Record<string, { label: string; color: string } | undefined> = {
  pix: { label: "Mais rapido", color: "bg-green-100 text-green-700" },
  card: { label: "Ate 12x", color: "bg-orange-100 text-orange-700" },
  boleto: undefined,
  crypto: undefined,
};

export const GATEWAY_LABELS: Record<string, string> = {
  stripe: "Stripe",
  mercado_pago: "Mercado Pago",
  asaas: "Asaas",
  coinbase: "Coinbase",
  pagnet: "PagNet",
  mock: "Mock (teste)",
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  method_selected: "Metodo selecionado",
  processing: "Processando",
  paid: "Pago",
  failed: "Falhou",
  expired: "Expirado",
  abandoned: "Abandonado",
};
