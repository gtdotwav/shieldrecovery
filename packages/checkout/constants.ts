export const CHECKOUT_SHORT_ID_LENGTH = 8;
export const CHECKOUT_DEFAULT_EXPIRY_MINUTES = 60;
export const CHECKOUT_DEFAULT_CURRENCY = "BRL";

export const METHOD_LABELS: Record<string, string> = {
  card: "Cartão de Crédito",
  pix: "PIX",
  boleto: "Boleto Bancário",
  crypto: "Criptomoeda",
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
  method_selected: "Método selecionado",
  processing: "Processando",
  paid: "Pago",
  failed: "Falhou",
  expired: "Expirado",
  abandoned: "Abandonado",
};
