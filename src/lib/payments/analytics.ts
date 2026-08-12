/**
 * Quote / payment funnel events.
 * Tracked both client-side (dataLayer) and server-side (PlatformMetricEvent).
 */

export const QUOTE_PAYMENT_EVENTS = [
  "quote_started",
  "quote_completed",
  "quote_generated",
  "initial_payment_shown",
  "payment_started",
  "initial_payment_completed",
  "booking_confirmed",
  "quote_abandoned",
  "custom_quote_requested",
  "full_payment_selected",
  "milestone_payment_due",
  "milestone_payment_completed",
  "refund_requested",
  "refund_completed",
] as const;

export type QuotePaymentEvent = (typeof QUOTE_PAYMENT_EVENTS)[number];

export type QuotePaymentEventMeta = {
  serviceSlug?: string;
  quoteId?: string;
  caseId?: string;
  paymentModel?: string;
  initialPercentage?: number;
  initialPaymentTotal?: number;
  requiredUpfrontCosts?: number;
  remainingBalance?: number;
  total?: number;
  paymentChoice?: "initial" | "full";
  requiresHumanReview?: boolean;
};
