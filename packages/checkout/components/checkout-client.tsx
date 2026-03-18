"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CheckoutMethodType,
  CheckoutPaymentProvider,
  CheckoutSession,
  InstallmentOption,
  ProcessPaymentResult,
} from "../types";
import { BoletoPaymentView } from "./boleto-payment-view";
import { CardPaymentForm } from "./card-payment-form";
import { CheckoutStatus } from "./checkout-status";
import { CheckoutSummary } from "./checkout-summary";
import { CryptoPaymentView } from "./crypto-payment-view";
import { InstallmentPicker } from "./installment-picker";
import { PaymentMethodSelector } from "./payment-method-selector";
import { PixPaymentView } from "./pix-payment-view";

type Props = {
  session: CheckoutSession;
  providers: CheckoutPaymentProvider[];
  installmentOptions: Record<string, InstallmentOption[]>;
};

export function CheckoutClient({
  session: initialSession,
  providers,
  installmentOptions,
}: Props) {
  const [session, setSession] = useState(initialSession);
  const [selectedMethodType, setSelectedMethodType] =
    useState<CheckoutMethodType>();
  const [selectedProviderId, setSelectedProviderId] = useState<string>();
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [paymentResult, setPaymentResult] =
    useState<ProcessPaymentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  // Track page view
  useEffect(() => {
    fetch("/api/checkout/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        eventType: "page_viewed",
      }),
    }).catch(() => {});
  }, [session.id]);

  const handleMethodSelect = useCallback(
    (methodType: CheckoutMethodType, providerId: string) => {
      setSelectedMethodType(methodType);
      setSelectedProviderId(providerId);
      setSelectedInstallments(1);
      setPaymentResult(null);
      setError(undefined);

      fetch("/api/checkout/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: "method_selected",
          methodType,
          providerId,
        }),
      }).catch(() => {});
    },
    [session.id],
  );

  const handleInstallmentSelect = useCallback(
    (installments: number) => {
      setSelectedInstallments(installments);

      fetch("/api/checkout/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: "installment_selected",
          methodType: selectedMethodType,
          providerId: selectedProviderId,
          metadata: { installments },
        }),
      }).catch(() => {});
    },
    [session.id, selectedMethodType, selectedProviderId],
  );

  const processPayment = useCallback(
    async (cardToken?: string) => {
      if (!selectedProviderId || !selectedMethodType) return;

      setLoading(true);
      setError(undefined);

      try {
        const res = await fetch("/api/checkout/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            providerId: selectedProviderId,
            methodType: selectedMethodType,
            installments: selectedInstallments,
            cardToken,
          }),
        });

        const result: ProcessPaymentResult = await res.json();
        setPaymentResult(result);

        if (result.status === "approved") {
          setSession((s) => ({ ...s, status: "paid" }));
        } else if (result.status === "failed") {
          setError(result.errorMessage ?? "Pagamento recusado");
        }
      } catch {
        setError("Erro de conexão. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [session.id, selectedProviderId, selectedMethodType, selectedInstallments],
  );

  // Terminal states
  if (
    session.status === "paid" ||
    session.status === "expired" ||
    session.status === "abandoned"
  ) {
    return (
      <div className="space-y-6">
        <CheckoutSummary session={session} />
        <CheckoutStatus status={session.status} />
      </div>
    );
  }

  const currentOptions = selectedProviderId
    ? (installmentOptions[selectedProviderId] ?? [])
    : [];

  const selectedProvider = selectedProviderId
    ? providers.find((p) => p.id === selectedProviderId)
    : undefined;

  return (
    <div className="space-y-6">
      <CheckoutSummary session={session} />

      <PaymentMethodSelector
        providers={providers}
        selectedMethodType={selectedMethodType}
        onSelect={handleMethodSelect}
      />

      {selectedProviderId && currentOptions.length > 1 ? (
        <InstallmentPicker
          options={currentOptions}
          selectedInstallments={selectedInstallments}
          onSelect={handleInstallmentSelect}
        />
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Payment action area */}
      {selectedMethodType === "card" && !paymentResult ? (
        <CardPaymentForm
          onSubmit={(token) => processPayment(token)}
          loading={loading}
          gateway={selectedProvider?.gateway}
          publicKey={selectedProvider?.publicKey}
          amount={session.amount}
          installments={selectedInstallments}
        />
      ) : null}

      {selectedMethodType === "pix" && !paymentResult ? (
        <button
          type="button"
          onClick={() => processPayment()}
          disabled={loading}
          className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Gerando PIX..." : "Gerar código PIX"}
        </button>
      ) : null}

      {selectedMethodType === "boleto" && !paymentResult ? (
        <button
          type="button"
          onClick={() => processPayment()}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Gerando boleto..." : "Gerar boleto"}
        </button>
      ) : null}

      {selectedMethodType === "crypto" && !paymentResult ? (
        <button
          type="button"
          onClick={() => processPayment()}
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Gerando endereço..." : "Gerar endereço crypto"}
        </button>
      ) : null}

      {/* Post-payment views */}
      {paymentResult?.status === "approved" ? (
        <CheckoutStatus status="paid" />
      ) : null}

      {paymentResult?.pixCode ? (
        <PixPaymentView
          pixCode={paymentResult.pixCode}
          pixQrCode={paymentResult.pixQrCode}
        />
      ) : null}

      {paymentResult?.boletoBarcode || paymentResult?.boletoUrl ? (
        <BoletoPaymentView
          boletoBarcode={paymentResult.boletoBarcode}
          boletoUrl={paymentResult.boletoUrl}
        />
      ) : null}

      {paymentResult?.cryptoAddress ? (
        <CryptoPaymentView
          cryptoAddress={paymentResult.cryptoAddress}
          cryptoCurrency={paymentResult.cryptoCurrency}
        />
      ) : null}
    </div>
  );
}
