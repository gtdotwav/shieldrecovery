import { randomUUID } from "node:crypto";

import type { CheckoutMethodType } from "../types";
import type {
  PaymentInput,
  PaymentOutput,
  PaymentProvider,
  PaymentStatusOutput,
  RefundOutput,
  WebhookVerifyResult,
} from "./types";

const mockPayments = new Map<
  string,
  { status: "pending" | "approved" | "failed"; paidAt?: string }
>();

/**
 * Mock payment provider for development and testing.
 * Simulates PIX, card, boleto, and crypto flows.
 */
export class MockProvider implements PaymentProvider {
  readonly slug: string;
  readonly gateway = "mock" as const;
  readonly methodType: CheckoutMethodType;

  constructor(slug: string, methodType: CheckoutMethodType) {
    this.slug = slug;
    this.methodType = methodType;
  }

  async createPayment(input: PaymentInput): Promise<PaymentOutput> {
    const providerPaymentId = `mock_${randomUUID().slice(0, 12)}`;

    // Card payments auto-approve; others start as pending
    const autoApprove = this.methodType === "card";
    const status = autoApprove ? "approved" : "pending";

    mockPayments.set(providerPaymentId, {
      status,
      paidAt: autoApprove ? new Date().toISOString() : undefined,
    });

    const base: PaymentOutput = { providerPaymentId, status };

    if (this.methodType === "pix") {
      base.pixCode = `00020126580014br.gov.bcb.pix0136mock-${providerPaymentId}`;
      base.pixQrCode = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(base.pixCode)}`;
    }

    if (this.methodType === "boleto") {
      base.boletoBarcode = `23793.38128 60000.000003 00000.000400 1 ${Math.floor(Math.random() * 90000000 + 10000000)}`;
      base.boletoUrl = `https://mock-boleto.example.com/${providerPaymentId}`;
    }

    if (this.methodType === "crypto") {
      base.cryptoAddress = `0xMOCK${providerPaymentId.toUpperCase()}`;
      base.cryptoCurrency = "USDT";
    }

    return base;
  }

  async getPaymentStatus(
    providerPaymentId: string,
  ): Promise<PaymentStatusOutput> {
    const record = mockPayments.get(providerPaymentId);

    if (!record) {
      return { providerPaymentId, status: "failed" };
    }

    return {
      providerPaymentId,
      status: record.status,
      paidAt: record.paidAt,
    };
  }

  async verifyWebhook(
    payload: unknown,
    _headers: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    const body = payload as Record<string, unknown>;
    const providerPaymentId = body?.providerPaymentId as string;
    const status = body?.status as "approved" | "failed";

    if (!providerPaymentId || !status) {
      return { valid: false };
    }

    // Update internal state
    const record = mockPayments.get(providerPaymentId);
    if (record) {
      record.status = status;
      if (status === "approved") {
        record.paidAt = new Date().toISOString();
      }
    }

    return { valid: true, providerPaymentId, status, raw: payload };
  }

  async refundPayment(
    providerPaymentId: string,
    _amount?: number,
  ): Promise<RefundOutput> {
    const record = mockPayments.get(providerPaymentId);
    if (record) {
      record.status = "failed";
    }
    return { refundId: `refund_${randomUUID().slice(0, 8)}`, status: "refunded" };
  }
}
