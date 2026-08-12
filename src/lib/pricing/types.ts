/**
 * Deterministic SiamEZ pricing engine types.
 * AI never invents prices — it only fills requirements; this engine calculates.
 */

import type { WizardCondition, WizardFieldConfig } from "@/config/wizards/types";

export type QuoteMode = "fixed" | "calculated" | "range";

export type PricingLineCategory =
  | "service"
  | "addon"
  | "government"
  | "third_party"
  | "discount"
  | "tax"
  | "deposit";

export type FeeGuarantee = "exact" | "estimated";

export interface PricingLineRule {
  id: string;
  label: string;
  category: PricingLineCategory;
  /** Amount in THB (whole baht). Converted to satang by the engine. */
  amountThb?: number;
  /** Per-unit pricing: amountThb × quantity from requirements[field]. */
  perUnit?: { field: string; amountThb: number };
  /** Apply only when condition matches requirements. */
  when?: WizardCondition;
  feeGuarantee?: FeeGuarantee;
  /** Negative for discounts when using fixed amountThb. */
  isDiscount?: boolean;
}

export interface ServicePricingConfig {
  serviceSlug: string;
  quoteMode: QuoteMode;
  /** Days until quote expires (default from env / 14). */
  validityDays?: number;
  /** Smart-quote questions (subset of wizard fields). Empty = use wizard fields only. */
  questions: WizardFieldConfig[];
  /** Deterministic line rules. */
  rules: PricingLineRule[];
  /**
   * For quoteMode "fixed": use Service.priceAmount from DB when true
   * and no matching service rule produces an amount.
   */
  useDbFixedPrice?: boolean;
  /** For quoteMode "range": project estimate bounds in THB. */
  rangeThb?: { min: number; max: number; label?: string };
  /** Optional AI conversational prompt hint for this service. */
  conciergeHint?: string;
}

export interface PricingLineItem {
  id: string;
  label: string;
  category: PricingLineCategory;
  /** Satang */
  amount: number;
  feeGuarantee: FeeGuarantee;
}

export interface PricingResult {
  quoteType: QuoteMode;
  currency: string;
  /** Satang — authoritative total (or mid-range). */
  total: number;
  subtotal: number;
  governmentFees: number;
  addOnsTotal: number;
  discount: number;
  rangeMin?: number;
  rangeMax?: number;
  lineItems: PricingLineItem[];
  /** Human-readable summary for UI / AI (no invented numbers). */
  summaryLabel: string;
}
