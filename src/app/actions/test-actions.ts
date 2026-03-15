"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";

async function resolveBaseUrl() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    return origin;
  }

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}` : appEnv.appBaseUrl;
}

type SampleKind = "failed" | "pending" | "succeeded";

type SamplePayloadOptions = {
  suffix?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  product?: string;
  amount?: number;
  paymentMethod?: string;
  failureCode?: string;
  paymentId?: string;
  orderId?: string;
};

function buildSamplePayload(kind: SampleKind, options: SamplePayloadOptions = {}) {
  const suffix = options.suffix ?? Date.now().toString();
  const paymentId = options.paymentId ?? `pay_test_${kind}_${suffix}`;
  const orderId = options.orderId ?? `order_test_${kind}_${suffix}`;

  const eventType =
    kind === "failed"
      ? "payment_failed"
      : kind === "pending"
        ? "payment_pending"
        : "payment_succeeded";

  const paymentStatus =
    kind === "failed"
      ? "failed"
      : kind === "pending"
        ? "waiting_payment"
        : "paid";

  return {
    event_id: `evt_test_${kind}_${suffix}`,
    event_type: eventType,
    timestamp: Math.floor(Date.now() / 1000),
    payment: {
      id: paymentId,
      order_id: orderId,
      amount: options.amount ?? (kind === "failed" ? 129900 : 89000),
      currency: "BRL",
      method:
        options.paymentMethod ?? (kind === "pending" ? "pix" : "credit_card"),
      status: paymentStatus,
      failure_code:
        kind === "failed"
          ? options.failureCode ?? "card_declined"
          : undefined,
    },
    customer: {
      id: `cust_test_${suffix}`,
      name:
        options.customerName ??
        (kind === "failed"
          ? "Teste Falha Operacional"
          : kind === "pending"
            ? "Teste Pix Pendente"
            : "Teste Recuperado"),
      email:
        options.email ??
        (kind === "failed"
          ? `falha.${suffix}@shield.local`
          : kind === "pending"
            ? `pendente.${suffix}@shield.local`
            : `recuperado.${suffix}@shield.local`),
      phone: options.phone ?? `+5511999${suffix.slice(-6)}`,
    },
    metadata: {
      product:
        options.product ??
        (kind === "failed"
          ? "Checkout com falha"
          : kind === "pending"
            ? "Checkout Pix pendente"
            : "Pedido recuperado"),
      campaign: "internal_test_harness",
    },
  };
}

function buildWhatsAppInboundPayload(input: {
  phone: string;
  customerName: string;
  content: string;
  providerMessageId?: string;
}) {
  const phone = input.phone.replace(/\D/g, "");

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              contacts: [
                {
                  wa_id: phone,
                  profile: {
                    name: input.customerName,
                  },
                },
              ],
              messages: [
                {
                  id: input.providerMessageId ?? `wamid.${Date.now()}`,
                  from: phone,
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  type: "text",
                  text: {
                    body: input.content,
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function refreshOperationalViews() {
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/inbox");
  revalidatePath("/connect");
  revalidatePath("/test");
  revalidatePath("/api/analytics/recovery");
  revalidatePath("/api/followups/contacts");
}

export async function resetOperationalDataAction() {
  await requireAuthenticatedSession();
  await getStorageService().clearOperationalData();
  refreshOperationalViews();
  redirect("/test?status=ok&message=Base%20operacional%20limpa");
}

export async function seedValidationScenarioAction() {
  await requireAuthenticatedSession();
  const storage = getStorageService();
  const service = getPaymentRecoveryService();
  const messaging = new MessagingService();

  await storage.clearOperationalData();

  const pendingSuffix = `${Date.now()}01`;
  const failedSuffix = `${Date.now()}02`;
  const recoveredSuffix = `${Date.now()}03`;

  await service.importShieldTransactionPayload(
    JSON.stringify(
      buildSamplePayload("pending", {
        suffix: pendingSuffix,
        customerName: "Pedro Ivo",
        email: "pedro.ivo@cliente.com",
        phone: "+5511991234567",
        product: "Trevisan Mais Oficial",
        amount: 33711,
        paymentMethod: "pix",
      }),
    ),
  );

  await service.importShieldTransactionPayload(
    JSON.stringify(
      buildSamplePayload("failed", {
        suffix: failedSuffix,
        customerName: "Pid",
        email: "pid@cliente.com",
        phone: "+5511987654321",
        product: "Blessy Greens",
        amount: 37032,
        paymentMethod: "pix",
        failureCode: "pix_pending_timeout",
      }),
    ),
  );

  const recoveredPaymentId = `pay_test_recovery_${recoveredSuffix}`;
  const recoveredOrderId = `order_test_recovery_${recoveredSuffix}`;

  await service.importShieldTransactionPayload(
    JSON.stringify(
      buildSamplePayload("failed", {
        suffix: recoveredSuffix,
        paymentId: recoveredPaymentId,
        orderId: recoveredOrderId,
        customerName: "Rafael Souza",
        email: "rafael.souza@cliente.com",
        phone: "+5511970011223",
        product: "Shield Recovery Trial",
        amount: 89000,
        paymentMethod: "credit_card",
        failureCode: "insufficient_funds",
      }),
    ),
  );

  await service.importShieldTransactionPayload(
    JSON.stringify(
      buildSamplePayload("succeeded", {
        suffix: recoveredSuffix,
        paymentId: recoveredPaymentId,
        orderId: recoveredOrderId,
        customerName: "Rafael Souza",
        email: "rafael.souza@cliente.com",
        phone: "+5511970011223",
        product: "Shield Recovery Trial",
        amount: 89000,
        paymentMethod: "credit_card",
      }),
    ),
  );

  await messaging.handleWhatsAppWebhook(
    JSON.stringify(
      buildWhatsAppInboundPayload({
        phone: "+5511991234567",
        customerName: "Pedro Ivo",
        content: "Oi, me manda o Pix de novo que eu finalizo agora.",
      }),
    ),
  );

  refreshOperationalViews();
  redirect("/test?status=ok&message=Cen%C3%A1rio%20de%20valida%C3%A7%C3%A3o%20criado");
}

export async function seedFailedPaymentAction() {
  await requireAuthenticatedSession();
  const service = getPaymentRecoveryService();

  await service.importShieldTransactionPayload(
    JSON.stringify(buildSamplePayload("failed")),
  );

  refreshOperationalViews();
  redirect("/test?status=ok&event=failure");
}

export async function seedRecoveredPaymentAction() {
  await requireAuthenticatedSession();
  const service = getPaymentRecoveryService();
  const suffix = Date.now().toString();
  const paymentId = `pay_test_recovered_${suffix}`;
  const orderId = `order_test_recovered_${suffix}`;

  await service.importShieldTransactionPayload(
    JSON.stringify(
      buildSamplePayload("failed", {
        suffix,
        paymentId,
        orderId,
      }),
    ),
  );

  await service.importShieldTransactionPayload(
    JSON.stringify(
      buildSamplePayload("succeeded", {
        suffix,
        paymentId,
        orderId,
      }),
    ),
  );

  refreshOperationalViews();
  redirect("/test?status=ok&event=recovered");
}

export async function simulateInboundReplyAction() {
  await requireAuthenticatedSession();
  const messaging = new MessagingService();
  const service = getPaymentRecoveryService();
  const contacts = await service.getFollowUpContacts();

  const target =
    contacts.find(
      (contact) =>
        contact.lead_status !== "RECOVERED" &&
        contact.lead_status !== "LOST" &&
        contact.phone &&
        contact.phone !== "not_provided",
    ) ?? null;

  if (!target) {
    redirect("/test?status=error&message=Nenhum%20lead%20ativo%20com%20telefone");
  }

  await messaging.handleWhatsAppWebhook(
    JSON.stringify(
      buildWhatsAppInboundPayload({
        phone: target.phone,
        customerName: target.customer_name,
        content: "Recebi a cobrança. Pode seguir com o atendimento.",
      }),
    ),
  );

  refreshOperationalViews();
  redirect("/test?status=ok&message=Resposta%20do%20cliente%20simulada");
}

export async function generateRetryLinkAction(formData: FormData) {
  await requireAuthenticatedSession();
  const gatewayPaymentId = String(formData.get("gatewayPaymentId") ?? "").trim();

  if (!gatewayPaymentId) {
    redirect("/test?status=error&message=Informe%20um%20gateway%20payment%20id");
  }

  const service = getPaymentRecoveryService();
  const result = await service.createPaymentRetry(
    { gateway_payment_id: gatewayPaymentId },
    await resolveBaseUrl(),
  );

  refreshOperationalViews();
  redirect(`/test?status=ok&retry=${encodeURIComponent(result.payment_link)}`);
}
