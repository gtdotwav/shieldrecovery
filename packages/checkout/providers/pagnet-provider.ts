import type { CheckoutMethodType } from "../types";
import type {
  PaymentInput,
  PaymentOutput,
  PaymentProvider,
  PaymentStatusOutput,
  RefundOutput,
  WebhookVerifyResult,
} from "./types";

const PAGNET_BASE_URL = "https://api.pagnetbrasil.com/v1";

// ─── PagNet API types ───────────────────────────────────────────────

type PagnetTransactionStatus =
  | "waiting_payment"
  | "pending"
  | "approved"
  | "refused"
  | "in_protest"
  | "refunded"
  | "paid"
  | "cancelled"
  | "chargeback";

type PagnetTransaction = {
  id: number;
  amount: number;
  currency: string;
  paymentMethod: "credit_card" | "boleto" | "pix";
  status: PagnetTransactionStatus;
  installments: number;
  paidAt: string | null;
  refundedAmount: number;
  secureId: string;
  secureUrl: string;
  externalRef: string | null;
  postbackUrl: string | null;
  pix: {
    qrcode: string;
    end2EndId: string | null;
    receiptUrl: string | null;
    expirationDate: string;
  } | null;
  boleto: {
    url: string;
    barcode: string;
    digitableLine: string;
    instructions: string;
    expirationDate: string;
  } | null;
  card: {
    id: number;
    brand: string;
    holderName: string;
    lastDigits: string;
    expirationMonth: number;
    expirationYear: number;
  } | null;
  refusedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type PagnetPostbackPayload = {
  id: number;
  type: "transaction" | "withdraw";
  objectId: string;
  url: string;
  data: PagnetTransaction;
};

// ─── Status mapping ─────────────────────────────────────────────────

function mapPagnetStatus(
  status: PagnetTransactionStatus,
): PaymentOutput["status"] {
  switch (status) {
    case "paid":
    case "approved":
      return "approved";
    case "refused":
    case "cancelled":
    case "chargeback":
      return "failed";
    default:
      return "pending";
  }
}

function mapPagnetStatusFull(
  status: PagnetTransactionStatus,
): PaymentStatusOutput["status"] {
  switch (status) {
    case "paid":
    case "approved":
      return "approved";
    case "refused":
    case "cancelled":
    case "chargeback":
      return "failed";
    case "refunded":
      return "refunded";
    case "waiting_payment":
    case "pending":
      return "pending";
    default:
      return "pending";
  }
}

// ─── PagNet Provider ────────────────────────────────────────────────

export class PagnetProvider implements PaymentProvider {
  readonly slug: string;
  readonly gateway = "pagnet" as const;
  readonly methodType: CheckoutMethodType;

  private publicKey: string;
  private secretKey: string;

  constructor(
    slug: string,
    methodType: CheckoutMethodType,
    credentials: Record<string, unknown>,
  ) {
    this.slug = slug;
    this.methodType = methodType;
    this.publicKey = (credentials.publicKey as string) ?? "";
    this.secretKey = (credentials.secretKey as string) ?? "";

    if (!this.publicKey || !this.secretKey) {
      throw new Error(
        `PagNet provider "${slug}" requires publicKey and secretKey in credentials`,
      );
    }
  }

  private get authHeader(): string {
    return (
      "Basic " +
      Buffer.from(`${this.publicKey}:${this.secretKey}`).toString("base64")
    );
  }

  private pagnetPaymentMethod(): "credit_card" | "boleto" | "pix" {
    if (this.methodType === "card") return "credit_card";
    if (this.methodType === "boleto") return "boleto";
    return "pix";
  }

  // ── Create payment ──────────────────────────────────────────────

  async createPayment(input: PaymentInput): Promise<PaymentOutput> {
    const amountCents = Math.round(input.amount * 100);

    const body: Record<string, unknown> = {
      amount: amountCents,
      paymentMethod: this.pagnetPaymentMethod(),
      postbackUrl: input.metadata?.postbackUrl as string | undefined,
      externalRef: input.sessionId,
      metadata: JSON.stringify({
        sessionId: input.sessionId,
        source: "shield-checkout",
      }),
      items: [
        {
          title: input.description,
          unitPrice: amountCents,
          quantity: 1,
          tangible: false,
          externalRef: input.sessionId,
        },
      ],
      customer: {
        name: input.customerName,
        email: input.customerEmail,
        phone: cleanPhone(input.customerPhone),
        document: input.customerDocument
          ? {
              number: input.customerDocument.replace(/\D/g, ""),
              type: input.customerDocument.replace(/\D/g, "").length > 11
                ? "cnpj"
                : "cpf",
            }
          : undefined,
      },
    };

    // Method-specific fields
    if (this.methodType === "card") {
      body.installments = input.installments;
      if (input.cardToken) {
        body.card = { hash: input.cardToken };
      }
    }

    if (this.methodType === "pix") {
      body.pix = { expirationDate: futureDate(1) };
    }

    if (this.methodType === "boleto") {
      body.boleto = {
        expirationDate: futureDate(3),
        instructions:
          "Pagar até o vencimento. Após o vencimento, sujeito a juros e multa.",
      };
    }

    const response = await fetch(`${PAGNET_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `PagNet createPayment failed (${response.status}): ${errorBody}`,
      );
    }

    const tx: PagnetTransaction = await response.json();
    const status = mapPagnetStatus(tx.status);

    const result: PaymentOutput = {
      providerPaymentId: String(tx.id),
      status,
    };

    if (tx.pix) {
      result.pixCode = tx.pix.qrcode;
      // Generate QR code image URL from the PIX code
      result.pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tx.pix.qrcode)}`;
    }

    if (tx.boleto) {
      result.boletoBarcode = tx.boleto.digitableLine;
      result.boletoUrl = tx.boleto.url;
    }

    if (tx.refusedReason) {
      result.errorMessage = tx.refusedReason;
    }

    return result;
  }

  // ── Get payment status ──────────────────────────────────────────

  async getPaymentStatus(
    providerPaymentId: string,
  ): Promise<PaymentStatusOutput> {
    const response = await fetch(
      `${PAGNET_BASE_URL}/transactions/${providerPaymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: this.authHeader,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return { providerPaymentId, status: "failed" };
    }

    const tx: PagnetTransaction = await response.json();

    return {
      providerPaymentId,
      status: mapPagnetStatusFull(tx.status),
      paidAt: tx.paidAt ?? undefined,
      raw: tx,
    };
  }

  // ── Verify webhook ──────────────────────────────────────────────

  async verifyWebhook(
    payload: unknown,
    _headers: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    const body = payload as PagnetPostbackPayload;

    // Validate postback structure
    if (!body || body.type !== "transaction" || !body.data) {
      return { valid: false };
    }

    const tx = body.data;
    const providerPaymentId = String(tx.id);
    const status = mapPagnetStatusFull(tx.status);

    // Map to our webhook result format
    let mappedStatus: WebhookVerifyResult["status"];
    if (status === "approved") mappedStatus = "approved";
    else if (status === "failed") mappedStatus = "failed";
    else if (status === "expired") mappedStatus = "expired";
    else if (status === "refunded") mappedStatus = "refunded";
    else return { valid: true, providerPaymentId }; // pending, no action

    return {
      valid: true,
      providerPaymentId,
      status: mappedStatus,
      raw: body,
    };
  }

  // ── Refund ──────────────────────────────────────────────────────

  async refundPayment(
    providerPaymentId: string,
    _amount?: number,
  ): Promise<RefundOutput> {
    const response = await fetch(
      `${PAGNET_BASE_URL}/transactions/${providerPaymentId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `PagNet refund failed (${response.status}): ${errorBody}`,
      );
    }

    const data = await response.json();
    return {
      refundId: String(data.id ?? providerPaymentId),
      status: "refunded",
      raw: data,
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^55/, "");
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
