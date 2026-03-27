import {
  Lock,
  ShieldCheck,
} from "lucide-react";

function VisaIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="Visa">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
        fontStyle="italic"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="Mastercard">
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" />
      <path
        d="M24 10.3a8 8 0 0 1 0 11.4 8 8 0 0 1 0-11.4Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function EloIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="Elo">
      <rect width="48" height="32" rx="4" fill="#000" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fill="#FFCB05"
        fontSize="13"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        elo
      </text>
    </svg>
  );
}

function AmexIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="Amex">
      <rect width="48" height="32" rx="4" fill="#006FCF" />
      <text
        x="24"
        y="19"
        textAnchor="middle"
        fill="white"
        fontSize="8"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        AMEX
      </text>
    </svg>
  );
}

function PixIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-auto" aria-label="PIX">
      <rect width="48" height="32" rx="4" fill="#32BCAD" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        PIX
      </text>
    </svg>
  );
}

export function SecurityFooter() {
  return (
    <div className="mt-8 space-y-4">
      {/* Security badges */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Lock className="h-3.5 w-3.5 text-green-500" />
          <span>SSL 256-bit</span>
        </div>
        <div className="h-3 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
          <span>Pagamento seguro</span>
        </div>
      </div>

      {/* Accepted brands */}
      <div className="flex items-center justify-center gap-2">
        <VisaIcon />
        <MastercardIcon />
        <EloIcon />
        <AmexIcon />
        <PixIcon />
      </div>

      <p className="text-center text-[0.65rem] text-gray-300">
        Ambiente protegido com criptografia de ponta a ponta
      </p>
    </div>
  );
}
