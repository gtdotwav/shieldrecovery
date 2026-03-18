import type { InstallmentOption, InstallmentRule } from "../types";

/**
 * Computes all available installment options for a given amount and ruleset.
 * Works identically for any method: card, PIX parcelado, boleto parcelado, etc.
 */
export function computeInstallmentOptions(
  amount: number,
  rules: InstallmentRule[],
  currency = "BRL",
): InstallmentOption[] {
  const options: InstallmentOption[] = [];

  // Always include 1x (à vista)
  options.push({
    installments: 1,
    installmentAmount: amount,
    totalAmount: amount,
    interestRate: 0,
    interestFree: true,
    label: formatLabel(1, amount, amount, true, currency),
  });

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (amount < rule.minAmount) continue;

    const start = Math.max(rule.minInstallments, 2);
    const end = rule.maxInstallments;

    for (let n = start; n <= end; n++) {
      const interestFree = n <= rule.maxInterestFreeInstallments;
      let totalAmount: number;
      let installmentAmount: number;

      if (interestFree) {
        totalAmount = amount;
        installmentAmount = roundCents(amount / n);
      } else {
        // Compound interest: total = amount * (1 + rate/100)^n
        const rate = rule.interestRatePercent / 100;
        totalAmount = roundCents(amount * Math.pow(1 + rate, n));
        installmentAmount = roundCents(totalAmount / n);
      }

      options.push({
        installments: n,
        installmentAmount,
        totalAmount,
        interestRate: interestFree ? 0 : rule.interestRatePercent,
        interestFree,
        label: formatLabel(n, installmentAmount, totalAmount, interestFree, currency),
      });
    }
  }

  // Deduplicate by installment count (keep lowest total for each)
  const byCount = new Map<number, InstallmentOption>();
  for (const opt of options) {
    const existing = byCount.get(opt.installments);
    if (!existing || opt.totalAmount < existing.totalAmount) {
      byCount.set(opt.installments, opt);
    }
  }

  return Array.from(byCount.values()).sort(
    (a, b) => a.installments - b.installments,
  );
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatLabel(
  n: number,
  installmentAmount: number,
  totalAmount: number,
  interestFree: boolean,
  currency: string,
): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);

  if (n === 1) {
    return `${fmt(totalAmount)} à vista`;
  }

  const suffix = interestFree
    ? " sem juros"
    : ` (total ${fmt(totalAmount)})`;

  return `${n}x de ${fmt(installmentAmount)}${suffix}`;
}
