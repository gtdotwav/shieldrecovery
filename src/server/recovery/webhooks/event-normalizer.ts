import { HttpError } from "@/server/recovery/utils/http-error";
import {
  SUPPORTED_PAYMENT_EVENTS,
  type NormalizedPaymentEvent,
  type SupportedPaymentEvent,
} from "@/server/recovery/types";

type NormalizationFallback = {
  webhookId: string;
  timestamp: number;
};

const SUPPORTED_EVENT_SET = new Set<string>(SUPPORTED_PAYMENT_EVENTS);

export function normalizeShieldGatewayEvent(
  rawPayload: unknown,
  fallback: NormalizationFallback,
): NormalizedPaymentEvent {
  const payload = asRecord(rawPayload);

  if (!payload) {
    throw new HttpError(422, "Webhook payload must be a JSON object.");
  }

  const shieldTransaction = asRecord(payload.data);
  const payment = asRecord(payload.payment) ?? shieldTransaction ?? payload;
  const customer =
    asRecord(payment.customer) ?? asRecord(payload.customer) ?? shieldTransaction ?? payload;
  const metadata = parseMetadataRecord(payment.metadata) ?? asRecord(payload.metadata);
  const pixData =
    asRecord(payment.pix) ??
    asRecord(payload.pix) ??
    asRecord(metadata?.pix) ??
    undefined;
  const items = Array.isArray(payment.items) ? payment.items : [];
  const firstItem = asRecord(items[0]);

  const eventType = normalizeEventType(
    pickString(payload.event_type, payload.type, payload.eventName, payload.event),
    pickString(payment.status, payload.status),
  );

  const paymentId =
    pickString(
      payment.id,
      payment.payment_id,
      payload.payment_id,
      payload.objectId,
      payment.secureId,
      payload.id,
    ) ?? fallback.webhookId;

  const orderId =
    pickString(
      payment.order_id,
      payment.orderId,
      payload.order_id,
      payload.orderId,
      payment.secureId,
      payment.externalRef,
      payload.objectId,
    ) ?? `order-${paymentId}`;

  const customerId =
    pickString(customer.id, customer.customer_id, payload.customer_id, customer.email) ??
    `customer-${paymentId}`;
  const paymentUrl =
    findNestedString(
      [payment, payload, metadata, pixData],
      [
        "payment_url",
        "paymentUrl",
        "checkout_url",
        "checkoutUrl",
        "secureUrl",
        "secure_url",
        "redirectUrl",
        "returnUrl",
        "url",
      ],
    ) ?? undefined;
  const pixCode =
    findNestedString(
      [payment, payload, metadata, pixData],
      [
        "pix_code",
        "pixCode",
        "copy_paste",
        "copyPaste",
        "qrcode",
        "qrCode",
        "code",
        "payload",
      ],
    ) ?? undefined;
  const pixQrCode =
    findNestedString(
      [payment, payload, metadata, pixData],
      [
        "pix_qr_code",
        "pixQrCode",
        "qr_code",
        "qrCode",
        "image",
      ],
    ) ?? undefined;
  const pixExpiresAt =
    findNestedString(
      [payment, payload, metadata, pixData],
      [
        "pix_expiration_date",
        "pixExpirationDate",
        "expirationDate",
        "expiration_date",
        "expiresAt",
      ],
    ) ?? undefined;

  return {
    event_id:
      pickString(
        payload.event_id,
        payload.id,
        payload.eventId,
        payload.webhook_id,
        payload.objectId,
      ) ?? fallback.webhookId,
    event_type: eventType,
    timestamp:
      pickNumber(
        payload.timestamp,
        payment.updatedAt,
        payment.createdAt,
        payload.created_at,
        payload.createdAt,
      ) ?? fallback.timestamp,
    payment: {
      id: paymentId,
      order_id: orderId,
      amount:
        pickNumber(
          payment.amount,
          payment.total_amount,
          payload.amount,
          payload.total_amount,
          payment.paidAmount,
        ) ?? 0,
      currency:
        pickString(payment.currency, payload.currency, payload.currency_code)?.toUpperCase() ??
        "BRL",
      method:
        pickString(
          payment.method,
          payment.paymentMethod,
          payment.payment_method,
          payload.method,
          payload.payment_method,
        ) ?? "unknown",
      status:
        pickString(payment.status, payload.status)?.toLowerCase().replace(/\s+/g, "_") ??
        eventType,
      failure_code:
        pickString(
          payment.failure_code,
          payment.failureCode,
          payment.refusedReason,
          payload.failure_code,
          payload.failureCode,
        ) ?? undefined,
    },
    customer: {
      id: customerId,
      name: pickString(customer.name, payload.customer_name, payload.name) ?? "Unknown customer",
      email: pickString(customer.email, payload.email) ?? "unknown@shield.local",
      phone:
        pickString(customer.phone, payload.phone, payload.mobile, customer.mobilePhone) ??
        "not_provided",
    },
    metadata: {
      product:
        pickString(metadata?.product, payload.product, firstItem?.title, firstItem?.name) ??
        undefined,
      campaign:
        pickString(
          metadata?.campaign,
          payload.campaign,
          metadata?.sessionToken,
          payment.externalRef,
        ) ?? undefined,
      paymentUrl,
      pixCode,
      pixQrCode,
      pixExpiresAt,
    },
  };
}

function normalizeEventType(
  rawType: string | undefined,
  paymentStatus: string | undefined,
): SupportedPaymentEvent {
  const normalizedType = normalizeEventToken(rawType ?? "");

  if (SUPPORTED_EVENT_SET.has(normalizedType)) {
    return normalizedType as SupportedPaymentEvent;
  }

  const statusEvent = mapTransactionStatusToEventType(paymentStatus);

  if (normalizedType === "transaction" && statusEvent) {
    return statusEvent;
  }

  const inferred = `payment_${normalizeEventToken(paymentStatus ?? "")}`;

  if (SUPPORTED_EVENT_SET.has(inferred)) {
    return inferred as SupportedPaymentEvent;
  }

  if (statusEvent) {
    return statusEvent;
  }

  throw new HttpError(422, "Unsupported payment event type.", {
    rawType,
    paymentStatus,
  });
}

function mapTransactionStatusToEventType(
  paymentStatus: string | undefined,
): SupportedPaymentEvent | undefined {
  const normalizedStatus = normalizeEventToken(paymentStatus ?? "");

  const map: Record<string, SupportedPaymentEvent> = {
    created: "payment_created",
    new: "payment_created",
    waiting_payment: "payment_pending",
    awaiting_payment: "payment_pending",
    pending: "payment_pending",
    processing: "payment_processing",
    in_process: "payment_processing",
    paid: "payment_succeeded",
    succeeded: "payment_succeeded",
    approved: "payment_succeeded",
    failed: "payment_failed",
    refused: "payment_refused",
    declined: "payment_refused",
    expired: "payment_expired",
    canceled: "payment_canceled",
    cancelled: "payment_canceled",
    chargeback: "payment_chargeback",
  };

  return map[normalizedStatus];
}

function normalizeEventToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^payment[.:_\s-]?/, "payment_")
    .replace(/[.\s-]+/g, "_")
    .replace(/__+/g, "_");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseMetadataRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return asRecord(parsed);
    } catch {
      return null;
    }
  }

  return asRecord(value);
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (value instanceof Date) {
      return Math.floor(value.getTime() / 1000);
    }

    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();

      if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
        const parsedDate = Date.parse(trimmed);

        if (Number.isFinite(parsedDate)) {
          return Math.floor(parsedDate / 1000);
        }
      }

      const parsed = Number(trimmed);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function findNestedString(
  records: Array<Record<string, unknown> | null | undefined>,
  keys: string[],
): string | undefined {
  for (const record of records) {
    if (!record) continue;

    const direct = pickString(...keys.map((key) => record[key]));
    if (direct) {
      return direct;
    }

    for (const value of Object.values(record)) {
      const nested = asRecord(value);
      if (!nested) continue;

      const nestedValue = pickString(...keys.map((key) => nested[key]));
      if (nestedValue) {
        return nestedValue;
      }
    }
  }

  return undefined;
}
