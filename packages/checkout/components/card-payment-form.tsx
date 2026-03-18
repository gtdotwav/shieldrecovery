"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    PagNet?: {
      setPublicKey: (key: string) => Promise<void>;
      encrypt: (card: {
        number: string;
        holderName: string;
        expMonth: number;
        expYear: number;
        cvv: string;
      }) => Promise<string>;
    };
    ShieldHelper?: {
      getModuleName: () => string;
      getIframeId: () => string;
      convertDecimalToCents: (amount: number, currency: string) => number;
      prepareThreeDS: (opts: {
        amount: number;
        installments: number;
      }) => Promise<void>;
      finishThreeDS: (
        transaction: unknown,
        opts: { disableRedirect: boolean },
      ) => Promise<void>;
    };
  }
}

type Props = {
  onSubmit: (cardToken: string) => void;
  loading: boolean;
  gateway?: string;
  publicKey?: string;
  amount?: number;
  installments?: number;
};

export function CardPaymentForm({
  onSubmit,
  loading,
  gateway,
  publicKey,
  amount,
  installments = 1,
}: Props) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [tokenizing, setTokenizing] = useState(false);
  const [error, setError] = useState<string>();
  const sdkLoaded = useRef(false);

  const isPagnet = gateway === "pagnet";

  // Load PagNet tokenization SDK
  useEffect(() => {
    if (!isPagnet || !publicKey || sdkLoaded.current) return;

    const script = document.createElement("script");
    script.src = "https://api.pagnetbrasil.com/v1/js";
    script.async = true;
    script.onload = async () => {
      try {
        // The SDK exposes the module dynamically
        const moduleName = window.ShieldHelper?.getModuleName?.();
        const module = moduleName ? (window as unknown as Record<string, unknown>)[moduleName] : window.PagNet;

        if (module && typeof (module as Record<string, unknown>).setPublicKey === "function") {
          await (module as { setPublicKey: (k: string) => Promise<void> }).setPublicKey(publicKey);
          sdkLoaded.current = true;
        }
      } catch {
        console.warn("PagNet SDK setPublicKey failed");
      }
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount — SDK state persists
    };
  }, [isPagnet, publicKey]);

  const tokenizeCard = useCallback(async (): Promise<string> => {
    const digits = cardNumber.replace(/\D/g, "");
    const [expMonth, expYear] = expiry.split("/").map(Number);
    const fullYear = expYear < 100 ? 2000 + expYear : expYear;

    if (isPagnet) {
      // Use PagNet SDK to encrypt
      const moduleName = window.ShieldHelper?.getModuleName?.();
      const module = moduleName
        ? (window as unknown as Record<string, unknown>)[moduleName]
        : window.PagNet;

      if (!module || typeof (module as Record<string, unknown>).encrypt !== "function") {
        throw new Error("SDK PagNet não carregou. Recarregue a página.");
      }

      // Prepare 3DS if ShieldHelper is available
      if (window.ShieldHelper?.prepareThreeDS && amount) {
        const cents = window.ShieldHelper.convertDecimalToCents(amount, "BRL");
        await window.ShieldHelper.prepareThreeDS({
          amount: cents,
          installments,
        });
      }

      const token = await (module as {
        encrypt: (card: {
          number: string;
          holderName: string;
          expMonth: number;
          expYear: number;
          cvv: string;
        }) => Promise<string>;
      }).encrypt({
        number: digits,
        holderName: name,
        expMonth,
        expYear: fullYear,
        cvv,
      });

      return token;
    }

    // Fallback for mock/other gateways
    return `card_${Date.now()}_${digits.slice(-4)}`;
  }, [cardNumber, expiry, cvv, name, isPagnet, amount, installments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setTokenizing(true);

    try {
      const token = await tokenizeCard();
      onSubmit(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao processar dados do cartão",
      );
    } finally {
      setTokenizing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const isProcessing = loading || tokenizing;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Nome no cartão
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como está no cartão"
          required
          disabled={isProcessing}
          autoComplete="cc-name"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Número do cartão
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          placeholder="0000 0000 0000 0000"
          required
          disabled={isProcessing}
          autoComplete="cc-number"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Validade
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/AA"
            required
            disabled={isProcessing}
            autoComplete="cc-exp"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
            CVV
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cvv}
            onChange={(e) =>
              setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="000"
            required
            disabled={isProcessing}
            autoComplete="cc-csc"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 disabled:opacity-50"
          />
        </div>
      </div>

      {isPagnet ? (
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg
            className="h-3.5 w-3.5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Dados criptografados via PagNet
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isProcessing}
        className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
      >
        {tokenizing
          ? "Criptografando..."
          : loading
            ? "Processando pagamento..."
            : "Pagar com cartão"}
      </button>
    </form>
  );
}
