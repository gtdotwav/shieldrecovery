import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import QRCode from "qrcode";

import { formatCurrency } from "@/lib/format";
import { platformBrand } from "@/lib/platform";
import { retrievePagouTransaction } from "@/server/pagouai/client";
import { createCheckoutSession } from "@/server/checkout";
import { getStorageService } from "@/server/recovery/services/storage";
import { getTrackingService } from "@/server/recovery/services/tracking-service";
import { CopyPixButton } from "./_components/copy-pix-button";
import { PixCountdown } from "./_components/pix-countdown";

export const dynamic = "force-dynamic";

type RetryPaymentPageProps = {
  params: Promise<{
    gatewayPaymentId: string;
  }>;
  searchParams: Promise<{
    token?: string;
    provider?: string;
    transactionId?: string;
    method?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  }>;
};

type FailureCategory = "timeout" | "not_found" | "auth" | "service_down" | "unknown";

function categorizeFailure(error: unknown): FailureCategory {
  if (!(error instanceof Error)) return "unknown";
  const msg = error.message.toLowerCase();
  if (msg.includes("aborted") || msg.includes("timeout")) return "timeout";
  if (msg.includes("404") || msg.includes("not found")) return "not_found";
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) return "auth";
  if (msg.includes("503") || msg.includes("502") || msg.includes("unavailable")) return "service_down";
  return "unknown";
}

const FAILURE_COPY: Record<FailureCategory, { title: string; body: string; cta: string }> = {
  timeout: {
    title: "O servidor demorou demais para responder.",
    body: "A requisição ao gateway expirou. Tente novamente em alguns segundos — se persistir, usamos um link alternativo do checkout.",
    cta: "Tentar novamente",
  },
  not_found: {
    title: "Pagamento não encontrado.",
    body: "Não localizamos esta cobrança no gateway. Verifique se o link está completo ou peça o reenvio para o suporte.",
    cta: "Voltar para a plataforma",
  },
  auth: {
    title: "Sessão expirou.",
    body: "Por segurança, este link não é mais válido. Solicite uma nova cobrança ou contate quem te enviou.",
    cta: "Solicitar nova cobrança",
  },
  service_down: {
    title: "Gateway fora do ar.",
    body: "O gateway de pagamento está indisponível agora. Em geral isso se resolve em poucos minutos. Tente novamente em instantes.",
    cta: "Tentar novamente",
  },
  unknown: {
    title: "Não foi possível carregar a cobrança Pix agora.",
    body: "Aconteceu um imprevisto. Tente novamente em alguns segundos ou use o link de retomada que enviamos por mensagem.",
    cta: "Tentar novamente",
  },
};

export default async function RetryPaymentPage({
  params,
  searchParams,
}: RetryPaymentPageProps) {
  const { gatewayPaymentId } = await params;
  const {
    provider,
    transactionId,
    method,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
  } = await searchParams;

  const hasUtm = utm_source || utm_medium || utm_campaign;
  if (hasUtm) {
    try {
      const trackingService = getTrackingService();
      trackingService
        .recordEvent({
          sellerKey: "recovery",
          eventType: "checkout_start",
          utm: { utm_source, utm_medium, utm_campaign, utm_content, utm_term },
          landingPage: `/retry/${gatewayPaymentId}`,
          internalSource: "direct",
        })
        .catch(() => {});
    } catch {
      /* tracking is best-effort */
    }
  }

  if (
    provider === platformBrand.gateway.slug &&
    transactionId &&
    method === "pix"
  ) {
    return renderPagouPixRetry({ gatewayPaymentId, transactionId });
  }

  const storage = getStorageService();
  const payment = await storage.findPayment({ gatewayPaymentId });

  if (payment) {
    const customer = payment.customerId
      ? await storage.findCustomer(payment.customerId)
      : undefined;

    try {
      const session = await createCheckoutSession({
        amount: payment.amount / 100,
        currency: payment.currency,
        description: `Pagamento #${payment.orderId || payment.gatewayPaymentId}`,
        customerName: customer?.name ?? "",
        customerEmail: customer?.email ?? "",
        customerPhone: customer?.phone ?? "",
        customerDocument: customer?.document,
        source: "recovery",
        sourceReferenceId: payment.id,
        metadata: {
          gatewayPaymentId: payment.gatewayPaymentId,
          orderId: payment.orderId,
          retryRedirect: true,
          ...(hasUtm && {
            utm: { utm_source, utm_medium, utm_campaign, utm_content, utm_term },
          }),
        },
      });

      const checkoutOrigin = process.env.CHECKOUT_PLATFORM_URL
        ? new URL(process.env.CHECKOUT_PLATFORM_URL).origin
        : null;
      const redirectUrl = new URL(session.checkoutUrl);

      if (checkoutOrigin && redirectUrl.origin === checkoutOrigin) {
        redirect(session.checkoutUrl);
      }
      console.error("[retry] Checkout URL origin mismatch", {
        gatewayPaymentId,
        expected: checkoutOrigin,
        got: redirectUrl.origin,
      });
    } catch (error) {
      if (isRedirectError(error)) throw error;
      console.error("[retry] Checkout session failed", {
        gatewayPaymentId,
        error: error instanceof Error ? error.message : "unknown",
        category: categorizeFailure(error),
      });
    }
  }

  return renderFallback({ gatewayPaymentId, category: "unknown" });
}

function renderFallback({
  gatewayPaymentId,
  category,
}: {
  gatewayPaymentId: string;
  category: FailureCategory;
}) {
  const copy = FAILURE_COPY[category];
  return (
    <main
      className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16"
      style={{
        background:
          "radial-gradient(120% 70% at 50% 0%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 70%)",
      }}
    >
      <div className="w-full rounded-[2rem] border border-black/[0.08] bg-white p-8 shadow-[0_26px_120px_rgba(15,23,42,0.08)] dark:bg-[var(--surface,_#0f0f0f)]">
        <p
          className="text-[0.72rem] uppercase tracking-[0.28em]"
          style={{ color: "var(--accent)" }}
        >
          {platformBrand.name} · Pagamento
        </p>
        <h1 className="mt-4 max-w-[26ch] text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-300">
          {copy.body}
        </p>

        <div
          className="mt-6 rounded-[1.25rem] border px-5 py-4"
          style={{
            borderColor: "color-mix(in oklab, var(--accent) 25%, transparent)",
            background: "color-mix(in oklab, var(--accent) 8%, transparent)",
          }}
        >
          <p
            className="text-[0.68rem] uppercase tracking-[0.18em]"
            style={{ color: "var(--accent)" }}
          >
            Referência
          </p>
          <p className="mt-2 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
            {gatewayPaymentId}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/retry/${gatewayPaymentId}`}
            className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
            style={{ background: "var(--accent)" }}
          >
            {copy.cta}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:bg-[#111] dark:text-slate-100"
          >
            Voltar para a plataforma
          </Link>
        </div>
      </div>
    </main>
  );
}

async function renderPagouPixRetry(input: {
  gatewayPaymentId: string;
  transactionId: string;
}) {
  try {
    const transaction = await retrievePagouTransaction(input.transactionId);
    const pixCode = transaction.pixCode?.trim() ?? "";
    const expiresAt = transaction.pixExpiresAt ?? null;
    const qrCodeDataUrl = pixCode
      ? await QRCode.toDataURL(pixCode, {
          width: 320,
          margin: 1,
        })
      : null;

    return (
      <main
        className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 0%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%)",
        }}
      >
        <div className="grid w-full gap-6 rounded-[2rem] border border-black/[0.08] bg-white p-8 shadow-[0_26px_120px_rgba(15,23,42,0.08)] dark:bg-[var(--surface,_#0f0f0f)] lg:grid-cols-[minmax(0,0.95fr)_minmax(20rem,1.05fr)]">
          <section
            className="rounded-[1.5rem] border p-6"
            style={{
              borderColor: "color-mix(in oklab, var(--accent) 18%, transparent)",
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--accent) 6%, white), color-mix(in oklab, var(--accent) 0%, white))",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <p
                className="text-[0.72rem] uppercase tracking-[0.28em]"
                style={{ color: "var(--accent)" }}
              >
                Pix · {platformBrand.name}
              </p>
              {expiresAt ? <PixCountdown expiresAt={expiresAt} /> : null}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Pagamento pronto para copiar ou escanear.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Esta cobrança foi gerada pelo fluxo de recovery da {platformBrand.name}.
              Assim que o gateway confirmar, o checkout atualiza automaticamente.
            </p>

            <div className="mt-5 rounded-[1.25rem] border border-black/[0.05] bg-white p-4 shadow-inner">
              {qrCodeDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code Pix · ${formatCurrency(transaction.amount)} · ${input.gatewayPaymentId}`}
                  className="mx-auto h-64 w-64 rounded-xl bg-white object-contain"
                />
              ) : (
                <div
                  className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm"
                  style={{
                    borderColor: "color-mix(in oklab, var(--accent) 25%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  QR code indisponível no momento.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center">
              <CopyPixButton pixCode={pixCode} />
            </div>
          </section>

          <section className="flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <StatusCard status={transaction.status || "pending"} />

              <div className="rounded-[1.25rem] border border-black/[0.06] bg-white p-4 dark:bg-[#111]">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Código Pix copia e cola
                </p>
                <p
                  className="mt-3 break-all rounded-xl border px-4 py-3 font-mono text-xs leading-6 text-slate-900 dark:text-slate-100"
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--accent) 20%, transparent)",
                    background:
                      "color-mix(in oklab, var(--accent) 5%, white)",
                  }}
                >
                  {pixCode || "Não informado pelo gateway."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard
                  label="ID da cobrança"
                  value={input.gatewayPaymentId}
                  monospace
                />
                <InfoCard
                  label="Transação"
                  value={transaction.transactionId}
                  monospace
                />
                <InfoCard label="Valor" value={formatCurrency(transaction.amount)} />
                <InfoCard label="Método" value={transaction.method || "pix"} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:bg-[#111] dark:text-slate-100"
              >
                Voltar para a plataforma
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  } catch (error) {
    return renderFallback({
      gatewayPaymentId: input.gatewayPaymentId,
      category: categorizeFailure(error),
    });
  }
}

function StatusCard({ status }: { status: string }) {
  const friendly =
    status === "succeeded" || status === "paid"
      ? { label: "Pagamento confirmado", tone: "success" as const }
      : status === "pending" || status === "processing" || status === "waiting_payment"
        ? { label: "Aguardando pagamento", tone: "info" as const }
        : status === "expired"
          ? { label: "QR Code expirado", tone: "warning" as const }
          : { label: status, tone: "default" as const };

  const toneStyles: Record<typeof friendly.tone, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-[color:var(--accent)]/8 text-[color:var(--accent)] border-[color:var(--accent)]/25",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    default: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div
      className={`rounded-[1.25rem] border px-4 py-3 ${toneStyles[friendly.tone]}`}
      role="status"
    >
      <p className="text-xs uppercase tracking-[0.16em] opacity-70">Status atual</p>
      <p className="mt-1 text-base font-semibold">{friendly.label}</p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  monospace,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="rounded-[1.1rem] border border-black/[0.06] bg-slate-50 p-4 dark:bg-[#111]">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 break-all text-sm font-medium text-slate-900 dark:text-slate-100 ${
          monospace ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
