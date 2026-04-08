import { getStorageService } from "@/server/recovery/services/storage";
import type { NegotiationOffer, NegotiationContext } from "@/server/recovery/types";

/* ── Progressive discount strategies ── */

type DiscountTier = {
  stepThreshold: number;
  discountPct: number;
  label: string;
};

/**
 * Progressive strategy: discount increases with cadence step.
 * Step 4-5: small discount, Step 6-7: medium, Step 8+: max.
 */
function getProgressiveTiers(maxDiscount: number): DiscountTier[] {
  return [
    { stepThreshold: 4, discountPct: Math.round(maxDiscount * 0.3), label: "cortesia inicial" },
    { stepThreshold: 6, discountPct: Math.round(maxDiscount * 0.6), label: "oferta especial" },
    { stepThreshold: 8, discountPct: maxDiscount, label: "melhor oferta" },
  ];
}

/**
 * Fixed strategy: same discount at any step.
 */
function getFixedTiers(maxDiscount: number): DiscountTier[] {
  return [
    { stepThreshold: 4, discountPct: maxDiscount, label: "desconto exclusivo" },
  ];
}

/**
 * Conditional strategy: discount only if customer showed interest but didn't convert.
 */
function getConditionalTiers(maxDiscount: number): DiscountTier[] {
  return [
    { stepThreshold: 5, discountPct: Math.round(maxDiscount * 0.5), label: "oferta para finalizar" },
    { stepThreshold: 7, discountPct: maxDiscount, label: "ultima oferta" },
  ];
}

/**
 * Calculate the negotiation offer for the current context.
 * Returns null if no discount should be offered at this step.
 */
export async function calculateOffer(
  context: NegotiationContext,
): Promise<NegotiationOffer | null> {
  const { currentStep, maxDiscountPct, previousOffers } = context;

  if (maxDiscountPct <= 0) return null;

  // Don't offer discount if one was already offered at this step
  if (previousOffers.some((o) => o.discountPct > 0)) {
    const lastOffer = previousOffers[previousOffers.length - 1];
    // If last offer was the max, don't escalate further
    if (lastOffer && lastOffer.discountPct >= maxDiscountPct) return null;
  }

  // Load seller's negotiation strategy
  const storage = getStorageService();
  const controls = await storage.getSellerAdminControls();
  const sellerControl = controls.find((c) =>
    context.leadId ? true : false, // Just load all for now
  );

  const strategy =
    (sellerControl?.aiNegotiationStrategy as string) ?? "progressive";

  let tiers: DiscountTier[];
  switch (strategy) {
    case "fixed":
      tiers = getFixedTiers(maxDiscountPct);
      break;
    case "conditional":
      tiers = getConditionalTiers(maxDiscountPct);
      break;
    default:
      tiers = getProgressiveTiers(maxDiscountPct);
  }

  // Find the applicable tier for the current step
  const applicableTier = [...tiers]
    .reverse()
    .find((t) => currentStep >= t.stepThreshold);

  if (!applicableTier) return null;

  // Don't repeat the same discount
  const alreadyOffered = previousOffers.some(
    (o) => o.discountPct === applicableTier.discountPct,
  );
  if (alreadyOffered) return null;

  return {
    discountPct: applicableTier.discountPct,
    strategy: strategy as NegotiationOffer["strategy"],
    reason: applicableTier.label,
  };
}

/**
 * Format a discount offer into a human-readable Portuguese message snippet.
 */
export function formatOfferMessage(
  offer: NegotiationOffer,
  customerName: string,
): string {
  if (offer.discountPct <= 0) return "";

  const couponPart = offer.couponCode
    ? ` Use o cupom ${offer.couponCode}.`
    : "";

  return (
    `Como ${offer.reason}, estou oferecendo ${offer.discountPct}% de desconto.` +
    couponPart
  );
}

/**
 * Check if AI negotiation is enabled for a seller.
 */
export async function isNegotiationEnabled(
  sellerKey?: string,
): Promise<{ enabled: boolean; maxDiscountPct: number; strategy: string }> {
  if (!sellerKey) {
    return { enabled: false, maxDiscountPct: 0, strategy: "progressive" };
  }

  const storage = getStorageService();
  const controls = await storage.getSellerAdminControls();
  const control = controls.find((c) => c.sellerKey === sellerKey);

  return {
    enabled: control?.aiNegotiationEnabled ?? false,
    maxDiscountPct: control?.aiMaxDiscountPct ?? 15,
    strategy: control?.aiNegotiationStrategy ?? "progressive",
  };
}

/* ── Singleton ── */

let _instance: NegotiationService | undefined;

export function getNegotiationService(): NegotiationService {
  if (!_instance) {
    _instance = new NegotiationService();
  }
  return _instance;
}

export class NegotiationService {
  calculateOffer = calculateOffer;
  formatOfferMessage = formatOfferMessage;
  isNegotiationEnabled = isNegotiationEnabled;
}
