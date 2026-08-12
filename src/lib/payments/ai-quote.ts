/**
 * Structured AI quote response. Prices always come from the pricing engine;
 * this schema is what the AI is allowed to fill (complexity, model hint, reason).
 */

import { z } from "zod";
import type { PricingResult } from "@/lib/pricing/types";
import { buildQuotePaymentPlan, type QuotePaymentPlan } from "./quote-plan";
import type { ServicePaymentConfig } from "./strategy";
import {
  HARD_MAX_SERVICE_PERCENTAGE,
  normalizeInitialPercentage,
  PAYMENT_MODELS,
} from "./strategy";

export const AiQuoteSuggestionSchema = z.object({
  complexity: z.enum(["simple", "moderate", "complex"]).optional(),
  recommended_model: z.enum(PAYMENT_MODELS).optional(),
  recommended_percentage: z.number().min(1).max(100).optional(),
  reason: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1).optional(),
  requires_human_review: z.boolean().optional(),
});

export type AiQuoteSuggestion = z.infer<typeof AiQuoteSuggestionSchema>;

export interface ValidatedAiQuoteResponse {
  service_id: string;
  service_name: string;
  complexity: QuotePaymentPlan["complexity"];
  quote: {
    base_service_fee: number;
    additional_service_fees: number;
    travel_fee: number;
    third_party_estimate: number;
    required_upfront_costs: number;
    discount: number;
    total_estimate: number;
    currency: string;
  };
  payment_plan: {
    model: QuotePaymentPlan["model"];
    initial_percentage: number;
    initial_service_payment: number;
    required_upfront_costs: number;
    initial_payment_total: number;
    remaining_balance: number;
  };
  milestones: QuotePaymentPlan["milestones"];
  reason: string;
  confidence: number;
  requires_human_review: boolean;
  percentage_rejected: boolean;
}

/**
 * Combine engine pricing + optional AI suggestion into the strict JSON
 * the rest of the system consumes. AI percentages above the service max
 * are normalized/rejected here — never stored as-is.
 */
export function buildValidatedAiQuoteResponse(input: {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  pricing: PricingResult;
  config: ServicePaymentConfig;
  requirements?: Record<string, unknown>;
  aiSuggestion?: unknown;
}): ValidatedAiQuoteResponse {
  const parsed = AiQuoteSuggestionSchema.safeParse(input.aiSuggestion ?? {});
  const suggestion = parsed.success ? parsed.data : undefined;

  if (
    suggestion?.recommended_percentage != null &&
    suggestion.recommended_percentage > HARD_MAX_SERVICE_PERCENTAGE
  ) {
    // Force through normalize so tests can assert rejection of 50% / 90%.
    normalizeInitialPercentage(
      suggestion.recommended_percentage,
      input.config.maximum_normal_percentage
    );
  }

  const plan = buildQuotePaymentPlan({
    pricing: input.pricing,
    config: input.config,
    serviceSlug: input.serviceSlug,
    serviceName: input.serviceName,
    requirements: input.requirements,
    aiRecommendedPercentage: suggestion?.recommended_percentage,
    aiComplexity: suggestion?.complexity,
    aiConfidence: suggestion?.confidence,
    aiReason: suggestion?.reason,
  });

  const travelFee = input.pricing.lineItems
    .filter((l) => /travel/i.test(l.label) || l.id.includes("travel"))
    .reduce((acc, l) => acc + l.amount, 0);

  return {
    service_id: input.serviceId,
    service_name: input.serviceName,
    complexity: plan.complexity,
    quote: {
      base_service_fee: input.pricing.subtotal,
      additional_service_fees: input.pricing.addOnsTotal,
      travel_fee: travelFee,
      third_party_estimate: plan.estimated_third_party,
      required_upfront_costs: plan.required_upfront_costs,
      discount: input.pricing.discount,
      total_estimate: plan.total_estimate,
      currency: input.pricing.currency,
    },
    payment_plan: {
      model: plan.model,
      initial_percentage: plan.initial_percentage,
      initial_service_payment: plan.initial_service_payment,
      required_upfront_costs: plan.required_upfront_costs,
      initial_payment_total: plan.initial_payment_total,
      remaining_balance: plan.remaining_balance,
    },
    milestones: plan.milestones,
    reason: plan.reason,
    confidence: plan.confidence,
    requires_human_review: plan.requires_human_review,
    percentage_rejected: plan.percentage_rejected,
  };
}

export function parseAiQuoteSuggestion(raw: unknown): AiQuoteSuggestion | null {
  const parsed = AiQuoteSuggestionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
