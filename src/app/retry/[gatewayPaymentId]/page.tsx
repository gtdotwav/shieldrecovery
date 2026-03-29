import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";

import { platformBrand } from "@/lib/platform";
import { retrievePagouTransaction } from "@/server/pagouai/client";
import { createCheckoutSession } from "@/server/checkout";
import { getStorageService } from "@/server/recovery/services/storage";

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
  }>;
};

export default async function RetryPaymentPage({
  params,
  searchParams,
}: RetryPaymentPageProps) {
  const { gatewayPaymentId } = await params;
  const { provider, transactionId, method } = await searchParams;

  if (
    provider === platformBrand.gateway.slug &&
    transactionId &&
    method === "pix"
  ) {
    return renderPagouPixRetry({
      gatewayPaymentId,
      transactionId,
    });
  }

  // Try to redirect to Substratum checkout
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
        },
      });

      redirect(session.checkoutUrl);
    } catch {
      // Checkout platform unavailable — fall through to fallback
    }
  }

  return renderFallback(gatewayPaymentId);
}

function renderFallback(gatewayPaymentId: string) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="w-full rounded-[2rem] border border-black/[0.08] bg-white p-8 shadow-[0_26px_120px_rgba(15,23,42,0.08)]">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-sky-600">
          Pagamento
        </p>
        <h1 className="mt-4 max-w-[18ch] text-4xl font-semibold tracking-tight text-[#082f49]">
          Estamos preparando seu pagamento.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[#64748b]">
          O checkout nao esta disponivel neste momento. Por favor, tente
          novamente em alguns instantes ou entre em contato com o suporte.
        </p>

        <div className="mt-6 rounded-[1.25rem] border border-sky-100 bg-sky-50 px-5 py-4">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-sky-500">
            Referencia
          </p>
          <p className="mt-2 break-all font-mono text-sm text-[#082f49]">
            {gatewayPaymentId}
          </p>
        </div>

        <div className="mt-6">
          <Link
            href={`/retry/${gatewayPaymentId}`}
            className="inline-flex items-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
          >
            Tentar novamente
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
    const qrCodeDataUrl = pixCode
      ? await QRCode.toDataURL(pixCode, {
          width: 320,
          margin: 1,
        })
      : null;

    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
        <div className="grid w-full gap-6 rounded-[2rem] border border-black/[0.08] bg-white p-8 shadow-[0_26px_120px_rgba(15,23,42,0.08)] lg:grid-cols-[minmax(0,0.95fr)_minmax(20rem,1.05fr)]">
          <section className="rounded-[1.5rem] border border-sky-100 bg-[linear-gradient(180deg,#eff6ff,#f8fafc)] p-6">
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-sky-600">
              Pix {platformBrand.name}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#082f49]">
              Pagamento pronto para copiar ou escanear.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#475569]">
              Esta cobranca foi criada para o fluxo de recovery da{" "}
              {platformBrand.name}. Assim que o gateway confirmar o pagamento,
              o webhook atualiza o caso automaticamente.
            </p>

            <div className="mt-5 rounded-[1.25rem] border border-sky-200 bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Pix"
                  className="mx-auto h-64 w-64 rounded-xl bg-white object-contain"
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50 text-sm text-sky-700">
                  QR code indisponivel no momento.
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col justify-between">
            <div>
              <div className="rounded-[1.25rem] border border-black/[0.06] bg-gray-50 dark:bg-[#111111] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#94a3b8]">
                  Status atual
                </p>
                <p className="mt-2 text-base font-semibold text-[#082f49]">
                  {transaction.status || "pending"}
                </p>
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-black/[0.06] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#94a3b8]">
                  Codigo Pix copia e cola
                </p>
                <p className="mt-3 break-all rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 font-mono text-xs leading-6 text-[#0f172a]">
                  {pixCode || "Nao informado pelo gateway."}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoCard label="Gateway payment id" value={input.gatewayPaymentId} />
                <InfoCard label="Pagou transaction id" value={transaction.transactionId} />
                <InfoCard label="Valor" value={formatCurrency(transaction.amount)} />
                <InfoCard label="Metodo" value={transaction.method || "pix"} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#082f49] transition-colors hover:bg-gray-50 dark:bg-[#111111]"
              >
                Voltar para a plataforma
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <div className="w-full rounded-[2rem] border border-red-100 bg-white p-8 shadow-[0_26px_120px_rgba(15,23,42,0.08)]">
          <p className="text-[0.72rem] uppercase tracking-[0.28em] text-red-500">
            Reemissao indisponivel
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#082f49]">
            Nao foi possivel carregar a cobranca Pix agora.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#64748b]">
            A transacao do gateway nao respondeu neste momento. Tente novamente
            em instantes ou use o fluxo de reenvio dentro da plataforma.
          </p>
          <div className="mt-6 rounded-[1.25rem] border border-red-100 bg-red-50 px-5 py-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-red-500">
              Gateway payment id
            </p>
            <p className="mt-2 break-all font-mono text-sm text-[#082f49]">
              {input.gatewayPaymentId}
            </p>
          </div>
        </div>
      </main>
    );
  }
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-black/[0.06] bg-gray-50 dark:bg-[#111111] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[#94a3b8]">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-[#082f49]">{value}</p>
    </div>
  );
}

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((amountInCents || 0) / 100);
}
