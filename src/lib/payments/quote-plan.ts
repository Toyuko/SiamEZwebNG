/**
 * Build a customer-facing payment plan from a deterministic pricing result.
 * AI never invents amounts — this uses engine line items + service payment config.
 */

import type { PricingLineItem, PricingResult } from "@/lib/pricing/types";
import { getPaymentExperimentConfig } from "./copy";
import type { ServicePaymentConfig } from "./strategy";
import {
  buildDefaultProjectMilestones,
  calculateInitialPayment,
  minimumSatangFromConfig,
  modelFromPercentage,
  remainingBalance,
  strategyFromPercentage,
  type MilestoneDraft,
  type PaymentModel,
  type QuoteComplexity,
} from "./strategy";

export type PaymentChoice = "initial" | "full";

export interface QuotePaymentPlan {
  model: PaymentModel;
  strategy: ReturnType<typeof strategyFromPercentage>;
  complexity: QuoteComplexity;
  initial_percentage: number;
  initial_service_payment: number;
  required_upfront_costs: number;
  estimated_third_party: number;
  initial_payment_total: number;
  remaining_balance: number;
  total_estimate: number;
  service_fee_total: number;
  allow_full_payment: boolean;
  allow_milestones: boolean;
  milestones: MilestoneDraft[];
  reason: string;
  customer_message: string;
  requires_human_review: boolean;
  confidence: number;
  percentage_rejected: boolean;
}

export interface BuildPaymentPlanInput {
  pricing: PricingResult;
  config: ServicePaymentConfig;
  serviceSlug: string;
  serviceName?: string;
  requirements?: Record<string, unknown>;
  /** AI-suggested percentage — validated and capped server-side. */
  aiRecommendedPercentage?: number;
  aiComplexity?: QuoteComplexity;
  aiConfidence?: number;
  aiReason?: string;
}

const HIGH_CUSTOM_SLUGS = new Set([
  "construction-handyman",
  "real-estate-services",
  "event-planning-venue-services",
]);

const LARGE_QUOTE_SATANG = 50_000 * 100; // 50,000 THB

function sumCategory(
  items: PricingLineItem[],
  categories: PricingLineItem["category"][],
  guarantee?: PricingLineItem["feeGuarantee"]
): number {
  return items
    .filter(
      (l) =>
        categories.includes(l.category) &&
        (guarantee ? l.feeGuarantee === guarantee : true) &&
        l.amount > 0
    )
    .reduce((acc, l) => acc + l.amount, 0);
}

export function splitFeeBuckets(pricing: PricingResult): {
  serviceFee: number;
  requiredUpfront: number;
  estimatedThirdParty: number;
} {
  const requiredUpfront = sumCategory(
    pricing.lineItems,
    ["government", "third_party"],
    "exact"
  );
  const estimatedThirdParty = sumCategory(
    pricing.lineItems,
    ["government", "third_party"],
    "estimated"
  );
  const serviceFee = Math.max(
    0,
    pricing.subtotal + pricing.addOnsTotal - pricing.discount
  );
  return { serviceFee, requiredUpfront, estimatedThirdParty };
}

function detectComplexity(
  input: BuildPaymentPlanInput,
  serviceFee: number
): QuoteComplexity {
  if (input.aiComplexity) return input.aiComplexity;
  if (input.pricing.quoteType === "range") return "complex";
  if (HIGH_CUSTOM_SLUGS.has(input.serviceSlug)) return "complex";
  if (serviceFee >= LARGE_QUOTE_SATANG) return "complex";

  const req = input.requirements ?? {};
  const urgent = Boolean(req.express || req.addonFastTrack);
  const extras =
    Boolean(req.needsLegalization) ||
    Boolean(req.mfaLegalization) ||
    Boolean(req.needsTranslation) ||
    Boolean(req.travelRequired || req.needsTravel);
  if (input.config.payment_strategy === "HIGH_EXPOSURE") return "complex";
  if (urgent || extras) return "moderate";
  return "simple";
}

/**
 * Always prefer the lowest reasonable percentage that still protects SiamEZ.
 * Service config is the default ceiling — AI may lower it, never raise it.
 */
export function selectLowestPercentage(input: {
  config: ServicePaymentConfig;
  complexity: QuoteComplexity;
  pricing: PricingResult;
  serviceSlug: string;
  requirements?: Record<string, unknown>;
  aiRecommendedPercentage?: number;
}): { percentage: number; reason: string } {
  const ceiling = Math.min(
    input.config.default_initial_percentage,
    input.config.maximum_normal_percentage
  );

  let percentage = ceiling;
  let reason = reasonForPercentage(percentage);

  // Services with an explicit high deposit (e.g. driver-license 50%) keep that
  // rate; AI may only lower percentages on the standard ≤30% ladder.
  const allowAiLower = ceiling <= 30;

  if (
    allowAiLower &&
    typeof input.aiRecommendedPercentage === "number" &&
    Number.isFinite(input.aiRecommendedPercentage)
  ) {
    const ai = Math.round(input.aiRecommendedPercentage);
    if (ai > 0 && ai < percentage) {
      percentage = ai;
      reason =
        "We kept your initial payment as low as possible for this booking. The amount is applied toward your service fee.";
    }
  }

  percentage = Math.min(percentage, ceiling);
  return { percentage, reason };
}

function reasonForPercentage(percentage: number): string {
  if (percentage <= 10) {
    return "This service has low upfront cost, so only a small payment is needed to secure your booking.";
  }
  if (percentage <= 20) {
    return "A 20% initial payment allows our team to begin preparing and processing your service. This payment is applied toward your final balance.";
  }
  if (percentage >= 50) {
    return "A 50% deposit reserves your appointment and starts document prep. The remaining balance is due before your DLT visit.";
  }
  return "This is a more involved project, so a 30% start payment lets our team begin work. Remaining amounts follow your payment plan.";
}

function customerMessage(
  model: PaymentModel,
  initialThbHint: number,
  percentage?: number
): string {
  if (percentage != null && percentage >= 50) {
    return `Pay a ${percentage}% deposit of ${initialThbHint.toLocaleString("en-US")} THB today to reserve your booking. The balance is due before your DLT visit.`;
  }
  if (model === "BOOK_NOW") {
    return `Secure your booking with a small ${initialThbHint.toLocaleString("en-US")} THB payment. This amount is applied toward your final service fee.`;
  }
  if (model === "START_SERVICE") {
    return "A 20% initial payment allows our team to begin preparing and processing your service. This payment is applied toward your final balance.";
  }
  return "Your project uses milestone payments so you are not asked for the full amount up front. Today's payment starts the work.";
}

export function needsHumanReview(input: {
  pricing: PricingResult;
  complexity: QuoteComplexity;
  serviceSlug: string;
  confidence: number;
  percentageRejected: boolean;
  estimatedThirdParty: number;
  requiredUpfront: number;
}): boolean {
  if (input.pricing.quoteType === "range") return true;
  if (HIGH_CUSTOM_SLUGS.has(input.serviceSlug)) return true;
  if (input.complexity === "complex") return true;
  if (input.confidence < 0.7) return true;
  if (input.percentageRejected) return true;
  if (input.pricing.total >= LARGE_QUOTE_SATANG) return true;
  if (input.estimatedThirdParty > 0 && input.requiredUpfront === 0 && input.estimatedThirdParty >= 10_000 * 100) {
    return true;
  }
  return false;
}

export function buildQuotePaymentPlan(input: BuildPaymentPlanInput): QuotePaymentPlan {
  const experiment = getPaymentExperimentConfig();
  const config: ServicePaymentConfig = experiment.minimumThbOverride
    ? { ...input.config, minimum_initial_payment: experiment.minimumThbOverride }
    : input.config;

  const buckets = splitFeeBuckets(input.pricing);
  const complexity = detectComplexity(input, buckets.serviceFee);
  const selected = selectLowestPercentage({
    config,
    complexity,
    pricing: input.pricing,
    serviceSlug: input.serviceSlug,
    requirements: input.requirements,
    aiRecommendedPercentage: input.aiRecommendedPercentage,
  });

  const aiOverMax =
    typeof input.aiRecommendedPercentage === "number" &&
    Number.isFinite(input.aiRecommendedPercentage) &&
    input.aiRecommendedPercentage > config.maximum_normal_percentage;

  const calc = calculateInitialPayment({
    serviceFeeSatang: buckets.serviceFee,
    initialPercentage: selected.percentage,
    minimumInitialSatang: minimumSatangFromConfig(config),
    requiredUpfrontCostsSatang: buckets.requiredUpfront,
    maximumNormalPercentage: config.maximum_normal_percentage,
  });

  const totalEstimate = input.pricing.total;
  const remaining = remainingBalance(totalEstimate, calc.initialPaymentTotal);
  const model = modelFromPercentage(calc.initialPercentage);
  const confidence =
    typeof input.aiConfidence === "number" && Number.isFinite(input.aiConfidence)
      ? Math.min(1, Math.max(0, input.aiConfidence))
      : input.pricing.quoteType === "range"
        ? 0.45
        : 0.92;

  const review = needsHumanReview({
    pricing: input.pricing,
    complexity,
    serviceSlug: input.serviceSlug,
    confidence,
    percentageRejected: calc.percentageRejected,
    estimatedThirdParty: buckets.estimatedThirdParty,
    requiredUpfront: buckets.requiredUpfront,
  });

  const useMilestones =
    config.allow_milestones &&
    (model === "PROJECT_CUSTOM" || complexity === "complex") &&
    !review;

  const milestones = useMilestones
    ? buildDefaultProjectMilestones(totalEstimate)
    : [];

  // First milestone should include required upfront on top of the service start %
  // when we are not in human-review (range) mode. For standard 30/30/20/20 the
  // first amount already equals 30% of total; required upfront is already inside total
  // when those lines are exact. Keep engine amounts as-is.

  const reason = input.aiReason?.trim() || selected.reason;
  const initialThb = Math.round(calc.initialPaymentTotal / 100);

  return {
    model,
    strategy: strategyFromPercentage(calc.initialPercentage),
    complexity,
    initial_percentage: calc.initialPercentage,
    initial_service_payment: calc.baseBookingPayment,
    required_upfront_costs: calc.requiredUpfrontCosts,
    estimated_third_party: buckets.estimatedThirdParty,
    initial_payment_total: calc.initialPaymentTotal,
    remaining_balance: remaining,
    total_estimate: totalEstimate,
    service_fee_total: buckets.serviceFee,
    allow_full_payment: config.allow_full_payment,
    allow_milestones: config.allow_milestones,
    milestones,
    reason,
    customer_message: customerMessage(model, initialThb, calc.initialPercentage),
    requires_human_review: review,
    confidence,
    percentage_rejected: calc.percentageRejected || aiOverMax,
  };
}

export function payableAmountForChoice(
  plan: QuotePaymentPlan,
  choice: PaymentChoice
): number {
  if (choice === "full") {
    if (!plan.allow_full_payment) {
      throw new Error("Full payment is not available for this service");
    }
    return plan.total_estimate;
  }
  return plan.initial_payment_total;
}

export function currentPricingVersion(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}-v1`;
}

export function buildPricingSnapshot(input: {
  plan: QuotePaymentPlan;
  pricing: PricingResult;
  version?: string;
}) {
  return {
    pricing_version: input.version ?? currentPricingVersion(),
    base_price: input.pricing.subtotal,
    additional_fees: input.pricing.addOnsTotal,
    government_fees: input.pricing.governmentFees,
    discount: input.pricing.discount,
    initial_percentage: input.plan.initial_percentage,
    upfront_costs: input.plan.required_upfront_costs,
    estimated_third_party: input.plan.estimated_third_party,
    total: input.plan.total_estimate,
    initial_payment_total: input.plan.initial_payment_total,
    remaining_balance: input.plan.remaining_balance,
    model: input.plan.model,
    currency: input.pricing.currency,
    lineItems: input.pricing.lineItems,
  };
}

/** Re-read a stored plan; never trust a client-supplied clone. */
export function parseStoredPaymentPlan(raw: unknown): QuotePaymentPlan | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Partial<QuotePaymentPlan>;
  if (
    typeof p.initial_payment_total !== "number" ||
    typeof p.total_estimate !== "number" ||
    typeof p.initial_percentage !== "number"
  ) {
    return null;
  }
  return p as QuotePaymentPlan;
}
