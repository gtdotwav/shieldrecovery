import type { CheckoutMethodType } from "../types";

export type PaymentInput = {
  sessionId: string;
  amount: number;
  currency: string;
  installments: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument?: string;
  description: string;
  cardToken?: string;
  metadata?: Record<string, unknown>;
};

export type PaymentOutput = {
  providerPaymentId: string;
  status: "pending" | "approved" | "failed";
  pixCode?: string;
  pixQrCode?: string;
  boletoBarcode?: string;
  boletoUrl?: string;
  cryptoAddress?: string;
  cryptoCurrency?: string;
  errorMessage?: string;
  raw?: unknown;
};

export type PaymentStatusOutput = {
  providerPaymentId: string;
  status: "pending" | "approved" | "failed" | "expired" | "refunded";
  paidAt?: string;
  raw?: unknown;
};

export type WebhookVerifyResult = {
  valid: boolean;
  providerPaymentId?: string;
  status?: "approved" | "failed" | "expired" | "refunded";
  raw?: unknown;
};

export type RefundOutput = {
  refundId: string;
  status: "pending" | "refunded";
  raw?: unknown;
};

/**
 * Interface that every payment gateway adapter must implement.
 */
export interface PaymentProvider {
  readonly slug: string;
  readonly gateway: string;
  readonly methodType: CheckoutMethodType;

  createPayment(input: PaymentInput): Promise<PaymentOutput>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusOutput>;
  verifyWebhook(
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<WebhookVerifyResult>;
  refundPayment?(
    providerPaymentId: string,
    amount?: number,
  ): Promise<RefundOutput>;
}
