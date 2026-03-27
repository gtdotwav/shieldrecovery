export type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "elo"
  | "hipercard"
  | "diners"
  | "discover"
  | "unknown";

export function detectCardBrand(number: string): CardBrand {
  const d = number.replace(/\D/g, "");
  if (!d) return "unknown";

  // Elo (check first — some BINs overlap Visa/MC ranges)
  if (
    /^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(d)
  )
    return "elo";

  // Hipercard
  if (/^(606282|3841)/.test(d)) return "hipercard";

  // Amex
  if (/^3[47]/.test(d)) return "amex";

  // Visa
  if (/^4/.test(d)) return "visa";

  // Mastercard
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";

  // Diners
  if (/^(36|30[0-5])/.test(d)) return "diners";

  // Discover
  if (/^(6011|65|64[4-9])/.test(d)) return "discover";

  return "unknown";
}

export function getCardMaxLength(brand: CardBrand): number {
  if (brand === "amex") return 15;
  if (brand === "diners") return 14;
  return 16;
}

export function getCvvLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3;
}

export function formatCardNumber(value: string, brand: CardBrand): string {
  const digits = value.replace(/\D/g, "").slice(0, getCardMaxLength(brand));
  if (brand === "amex") {
    // 4-6-5
    return digits
      .replace(/(\d{4})(\d)/, "$1 $2")
      .replace(/(\d{4} \d{6})(\d)/, "$1 $2");
  }
  // Default 4-4-4-4
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function validateLuhn(number: string): boolean {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 13) return false;

  let sum = 0;
  let alt = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }

  return sum % 10 === 0;
}

export const BRAND_DISPLAY_NAME: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  elo: "Elo",
  hipercard: "Hipercard",
  diners: "Diners Club",
  discover: "Discover",
  unknown: "",
};
