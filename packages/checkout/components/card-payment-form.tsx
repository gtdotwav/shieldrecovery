"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, AlertCircle } from "lucide-react";

import {
  detectCardBrand,
  formatCardNumber,
  getCardMaxLength,
  getCvvLength,
  validateLuhn,
} from "../utils/card-brands";
import type { CardBrand } from "../utils/card-brands";

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

// ── Card Brand SVGs ────────────────────────────────────────────────

function BrandIcon({ brand }: { brand: CardBrand }) {
  if (brand === "visa") {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-auto">
        <rect width="48" height="32" rx="4" fill="#1A1F71" />
        <text x="24" y="20" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif" fontStyle="italic">VISA</text>
      </svg>
    );
  }
  if (brand === "mastercard") {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-auto">
        <rect width="48" height="32" rx="4" fill="#252525" />
        <circle cx="19" cy="16" r="8" fill="#EB001B" />
        <circle cx="29" cy="16" r="8" fill="#F79E1B" />
        <path d="M24 10.3a8 8 0 0 1 0 11.4 8 8 0 0 1 0-11.4Z" fill="#FF5F00" />
      </svg>
    );
  }
  if (brand === "amex") {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-auto">
        <rect width="48" height="32" rx="4" fill="#006FCF" />
        <text x="24" y="19" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">AMEX</text>
      </svg>
    );
  }
  if (brand === "elo") {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-auto">
        <rect width="48" height="32" rx="4" fill="#000" />
        <text x="24" y="20" textAnchor="middle" fill="#FFCB05" fontSize="13" fontWeight="bold" fontFamily="sans-serif">elo</text>
      </svg>
    );
  }
  if (brand === "hipercard") {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-auto">
        <rect width="48" height="32" rx="4" fill="#822124" />
        <text x="24" y="20" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">HIPER</text>
      </svg>
    );
  }
  if (brand === "diners") {
    return (
      <svg viewBox="0 0 48 32" className="h-7 w-auto">
        <rect width="48" height="32" rx="4" fill="#0079BE" />
        <text x="24" y="20" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">DINERS</text>
      </svg>
    );
  }
  return null;
}

// ── Component ──────────────────────────────────────────────────────

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

  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  const digits = cardNumber.replace(/\D/g, "");
  const brand = detectCardBrand(digits);
  const maxLen = getCardMaxLength(brand);
  const cvvLen = getCvvLength(brand);

  const isPagnet = gateway === "pagnet";

  // Load PagNet tokenization SDK
  useEffect(() => {
    if (!isPagnet || !publicKey || sdkLoaded.current) return;

    const script = document.createElement("script");
    script.src = "https://api.pagnetbrasil.com/v1/js";
    script.async = true;
    script.onload = async () => {
      try {
        const moduleName = window.ShieldHelper?.getModuleName?.();
        const module = moduleName
          ? (window as unknown as Record<string, unknown>)[moduleName]
          : window.PagNet;

        if (module && typeof (module as Record<string, unknown>).setPublicKey === "function") {
          await (module as { setPublicKey: (k: string) => Promise<void> }).setPublicKey(publicKey);
          sdkLoaded.current = true;
        }
      } catch {
        console.warn("PagNet SDK setPublicKey failed");
      }
    };
    document.head.appendChild(script);
  }, [isPagnet, publicKey]);

  const tokenizeCard = useCallback(async (): Promise<string> => {
    const raw = cardNumber.replace(/\D/g, "");
    const [expMonth, expYear] = expiry.split("/").map(Number);
    const fullYear = expYear < 100 ? 2000 + expYear : expYear;

    if (!validateLuhn(raw)) {
      throw new Error("Numero do cartao invalido");
    }

    if (isPagnet) {
      const moduleName = window.ShieldHelper?.getModuleName?.();
      const module = moduleName
        ? (window as unknown as Record<string, unknown>)[moduleName]
        : window.PagNet;

      if (!module || typeof (module as Record<string, unknown>).encrypt !== "function") {
        throw new Error("SDK PagNet nao carregou. Recarregue a pagina.");
      }

      if (window.ShieldHelper?.prepareThreeDS && amount) {
        const cents = window.ShieldHelper.convertDecimalToCents(amount, "BRL");
        await window.ShieldHelper.prepareThreeDS({ amount: cents, installments });
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
        number: raw,
        holderName: name,
        expMonth,
        expYear: fullYear,
        cvv,
      });

      return token;
    }

    return `card_${Date.now()}_${raw.slice(-4)}`;
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
        err instanceof Error ? err.message : "Erro ao processar dados do cartao",
      );
    } finally {
      setTokenizing(false);
    }
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value, brand);
    setCardNumber(formatted);

    // Auto-advance to expiry
    const rawDigits = value.replace(/\D/g, "");
    if (rawDigits.length >= maxLen) {
      expiryRef.current?.focus();
    }
  };

  const handleExpiryChange = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 4);
    if (d.length >= 3) {
      setExpiry(`${d.slice(0, 2)}/${d.slice(2)}`);
    } else {
      setExpiry(d);
    }
    // Auto-advance to CVV
    if (d.length === 4) {
      cvvRef.current?.focus();
    }
  };

  const isProcessing = loading || tokenizing;
  const isCardValid = digits.length >= 13 && validateLuhn(digits);

  const inputBase =
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-300 disabled:opacity-50";
  const inputFocus =
    "focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20";
  const inputBorder = "border-gray-200";

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Card Preview Mini */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black p-5 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/5" />

        <div className="flex items-center justify-between">
          <div className="h-8 w-10 rounded bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-80" />
          <AnimatePresence mode="wait">
            {brand !== "unknown" ? (
              <motion.div
                key={brand}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <BrandIcon brand={brand} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <p className="mt-4 font-mono text-lg tracking-[0.15em] text-white/90">
          {digits
            ? formatCardNumber(digits, brand)
            : "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022"}
        </p>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-wider text-white/40">
              Titular
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-white/80">
              {name || "SEU NOME AQUI"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.6rem] uppercase tracking-wider text-white/40">
              Validade
            </p>
            <p className="font-mono text-xs text-white/80">
              {expiry || "MM/AA"}
            </p>
          </div>
        </div>
      </div>

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

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Nome no cartao
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          placeholder="Como esta no cartao"
          required
          disabled={isProcessing}
          autoComplete="cc-name"
          className={`${inputBase} ${inputBorder} ${inputFocus}`}
        />
      </div>

      {/* Card number */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Numero do cartao
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => handleCardNumberChange(e.target.value)}
            placeholder="0000 0000 0000 0000"
            required
            disabled={isProcessing}
            autoComplete="cc-number"
            className={`${inputBase} ${inputBorder} ${inputFocus} pr-16 font-mono`}
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <AnimatePresence mode="wait">
              {brand !== "unknown" ? (
                <motion.div
                  key={brand}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                >
                  <BrandIcon brand={brand} />
                </motion.div>
              ) : null}
            </AnimatePresence>
            {isCardValid ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Expiry + CVV */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Validade
          </label>
          <input
            ref={expiryRef}
            type="text"
            inputMode="numeric"
            value={expiry}
            onChange={(e) => handleExpiryChange(e.target.value)}
            placeholder="MM/AA"
            required
            disabled={isProcessing}
            autoComplete="cc-exp"
            className={`${inputBase} ${inputBorder} ${inputFocus} font-mono`}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
            CVV
          </label>
          <input
            ref={cvvRef}
            type="text"
            inputMode="numeric"
            value={cvv}
            onChange={(e) =>
              setCvv(e.target.value.replace(/\D/g, "").slice(0, cvvLen))
            }
            placeholder={cvvLen === 4 ? "0000" : "000"}
            required
            disabled={isProcessing}
            autoComplete="cc-csc"
            className={`${inputBase} ${inputBorder} ${inputFocus} font-mono`}
          />
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Lock className="h-3.5 w-3.5 text-green-500" />
        <span>Dados criptografados {isPagnet ? "via PagNet" : "com seguranca"}</span>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={isProcessing}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-50 disabled:shadow-none"
      >
        {tokenizing
          ? "Criptografando..."
          : loading
            ? "Processando pagamento..."
            : "Pagar com cartao"}
      </motion.button>
    </motion.form>
  );
}
