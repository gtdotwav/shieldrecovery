"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

import type {
  CheckoutMethodType,
  CheckoutPaymentProvider,
  CheckoutSession,
  InstallmentOption,
  ProcessPaymentResult,
} from "../types";
import { formatDocument, validateDocument } from "../utils/cpf-cnpj";
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

const slideVariants = {
  enter: { opacity: 0, y: 12 },
  active: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
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
  const [customerDocument, setCustomerDocument] = useState("");
  const [documentError, setDocumentError] = useState<string>();
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

  const handleDocumentChange = (value: string) => {
    const formatted = formatDocument(value);
    setCustomerDocument(formatted);

    const digits = value.replace(/\D/g, "");
    if (digits.length === 11 || digits.length === 14) {
      if (!validateDocument(digits)) {
        setDocumentError(
          digits.length === 11
            ? "CPF invalido"
            : "CNPJ invalido",
        );
      } else {
        setDocumentError(undefined);
      }
    } else {
      setDocumentError(undefined);
    }
  };

  const processPayment = useCallback(
    async (cardToken?: string) => {
      if (!selectedProviderId || !selectedMethodType) return;

      // Validate document before processing
      const docDigits = customerDocument.replace(/\D/g, "");
      if (docDigits.length > 0 && !validateDocument(docDigits)) {
        setError("CPF/CNPJ invalido. Verifique e tente novamente.");
        return;
      }

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
            customerDocument: docDigits || undefined,
          }),
        });

        const result: ProcessPaymentResult = await res.json();
        setPaymentResult(result);

        if (result.status === "approved") {
          setSession((s) => ({ ...s, status: "paid", paidAt: new Date().toISOString() }));
        } else if (result.status === "failed") {
          setError(result.errorMessage ?? "Pagamento recusado");
        }
      } catch {
        setError("Erro de conexao. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [
      session.id,
      selectedProviderId,
      selectedMethodType,
      selectedInstallments,
      customerDocument,
    ],
  );

  const handlePixConfirmed = useCallback(() => {
    setSession((s) => ({ ...s, status: "paid", paidAt: new Date().toISOString() }));
    setPaymentResult((r) => (r ? { ...r, status: "approved" } : r));
  }, []);

  // Terminal states
  if (
    session.status === "paid" ||
    session.status === "expired" ||
    session.status === "abandoned"
  ) {
    return (
      <div className="space-y-6">
        <CheckoutSummary session={session} />
        <CheckoutStatus
          status={session.status}
          providerPaymentId={session.providerPaymentId ?? paymentResult?.providerPaymentId}
          methodType={session.selectedMethodType ?? selectedMethodType}
          paidAt={session.paidAt}
        />
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
    <div className="space-y-5">
      <CheckoutSummary session={session} />

      <PaymentMethodSelector
        providers={providers}
        selectedMethodType={selectedMethodType}
        onSelect={handleMethodSelect}
      />

      <AnimatePresence mode="wait">
        {/* Installments */}
        {selectedProviderId && currentOptions.length > 1 ? (
          <motion.div
            key="installments"
            variants={slideVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <InstallmentPicker
              options={currentOptions}
              selectedInstallments={selectedInstallments}
              onSelect={handleInstallmentSelect}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* CPF / CNPJ */}
        {selectedMethodType && !paymentResult ? (
          <motion.div
            key="document"
            variants={slideVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2, delay: 0.05 }}
            className="space-y-2"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              CPF / CNPJ
            </p>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={customerDocument}
                onChange={(e) => handleDocumentChange(e.target.value)}
                placeholder="000.000.000-00"
                className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-300 ${
                  documentError
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                    : "border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                }`}
              />
              {/* Validation indicator */}
              {customerDocument.replace(/\D/g, "").length >= 11 ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {documentError ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </div>
              ) : null}
            </div>
            {documentError ? (
              <p className="text-xs text-red-500">{documentError}</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Payment action area */}
      <AnimatePresence mode="wait">
        {selectedMethodType === "card" && !paymentResult ? (
          <motion.div
            key="card-form"
            variants={slideVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <CardPaymentForm
              onSubmit={(token) => processPayment(token)}
              loading={loading}
              gateway={selectedProvider?.gateway}
              publicKey={selectedProvider?.publicKey}
              amount={session.amount}
              installments={selectedInstallments}
            />
          </motion.div>
        ) : null}

        {selectedMethodType === "pix" && !paymentResult ? (
          <motion.div
            key="pix-btn"
            variants={slideVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <motion.button
              type="button"
              onClick={() => processPayment()}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/25 transition-all hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Gerando PIX..." : "Gerar codigo PIX"}
            </motion.button>
          </motion.div>
        ) : null}

        {selectedMethodType === "boleto" && !paymentResult ? (
          <motion.div
            key="boleto-btn"
            variants={slideVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <motion.button
              type="button"
              onClick={() => processPayment()}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Gerando boleto..." : "Gerar boleto"}
            </motion.button>
          </motion.div>
        ) : null}

        {selectedMethodType === "crypto" && !paymentResult ? (
          <motion.div
            key="crypto-btn"
            variants={slideVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <motion.button
              type="button"
              onClick={() => processPayment()}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Gerando endereco..." : "Pagar com criptomoeda"}
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Post-payment views */}
      <AnimatePresence>
        {paymentResult?.status === "approved" ? (
          <motion.div
            key="status-paid"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckoutStatus
              status="paid"
              providerPaymentId={paymentResult.providerPaymentId}
              methodType={selectedMethodType}
              paidAt={new Date().toISOString()}
            />
          </motion.div>
        ) : null}

        {paymentResult?.pixCode ? (
          <motion.div
            key="pix-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PixPaymentView
              pixCode={paymentResult.pixCode}
              pixQrCode={paymentResult.pixQrCode}
              sessionId={session.id}
              expiresAt={session.expiresAt}
              onPaymentConfirmed={handlePixConfirmed}
            />
          </motion.div>
        ) : null}

        {paymentResult?.boletoBarcode || paymentResult?.boletoUrl ? (
          <motion.div
            key="boleto-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BoletoPaymentView
              boletoBarcode={paymentResult.boletoBarcode}
              boletoUrl={paymentResult.boletoUrl}
            />
          </motion.div>
        ) : null}

        {paymentResult?.cryptoAddress ? (
          <motion.div
            key="crypto-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CryptoPaymentView
              cryptoAddress={paymentResult.cryptoAddress}
              cryptoCurrency={paymentResult.cryptoCurrency}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
