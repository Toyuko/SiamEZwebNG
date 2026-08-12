/**
 * Deterministic SiamEZ pricing engine.
 * Never trusts client or AI for amounts — only requirements + config rules.
 */

import { evaluateCondition } from "@/components/wizard/lib/conditionals";
import type { WizardCondition } from "@/config/wizards/types";
import type {
  PricingLineItem,
  PricingLineRule,
  PricingResult,
  ServicePricingConfig,
} from "./types";

export function thbToSatang(thb: number): number {
  return Math.round(thb * 100);
}

export function satangToThb(satang: number): number {
  return satang / 100;
}

function readQuantity(requirements: Record<string, unknown>, field: string): number {
  const raw = requirements[field];
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function ruleApplies(
  rule: PricingLineRule,
  requirements: Record<string, unknown>
): boolean {
  if (!rule.when) return true;
  return evaluateCondition(rule.when as WizardCondition, requirements);
}

function computeRuleAmount(
  rule: PricingLineRule,
  requirements: Record<string, unknown>
): number {
  if (rule.perUnit) {
    const qty = readQuantity(requirements, rule.perUnit.field);
    if (qty <= 0) return 0;
    return thbToSatang(rule.perUnit.amountThb * qty);
  }
  if (typeof rule.amountThb === "number") {
    return thbToSatang(rule.amountThb);
  }
  return 0;
}

export interface CalculateQuoteInput {
  config: ServicePricingConfig;
  requirements: Record<string, unknown>;
  /** DB Service.priceAmount in satang — used for fixed mode fallback. */
  dbPriceAmount?: number | null;
  currency?: string;
}

/**
 * Calculate a quote from pricing rules + requirements.
 * Throws on missing config / invalid range mode without bounds.
 */
export function calculateQuote(input: CalculateQuoteInput): PricingResult {
  const { config, requirements } = input;
  const currency = input.currency ?? "THB";

  if (config.quoteMode === "range") {
    if (!config.rangeThb) {
      throw new Error(`Pricing rule missing: range bounds for ${config.serviceSlug}`);
    }
    const rangeMin = thbToSatang(config.rangeThb.min);
    const rangeMax = thbToSatang(config.rangeThb.max);
    if (rangeMin < 0 || rangeMax < rangeMin) {
      throw new Error(`Invalid range pricing for ${config.serviceSlug}`);
    }
    const mid = Math.round((rangeMin + rangeMax) / 2);
    const label = config.rangeThb.label ?? "Estimated project range";
    return {
      quoteType: "range",
      currency,
      total: mid,
      subtotal: mid,
      governmentFees: 0,
      addOnsTotal: 0,
      discount: 0,
      rangeMin,
      rangeMax,
      lineItems: [
        {
          id: "range",
          label,
          category: "service",
          amount: mid,
          feeGuarantee: "estimated",
        },
      ],
      summaryLabel: label,
    };
  }

  const lineItems: PricingLineItem[] = [];

  for (const rule of config.rules) {
    if (!ruleApplies(rule, requirements)) continue;
    const amount = computeRuleAmount(rule, requirements);
    if (amount === 0 && !rule.isDiscount) continue;
    lineItems.push({
      id: rule.id,
      label: rule.label,
      category: rule.category,
      amount: rule.isDiscount ? -Math.abs(amount) : amount,
      feeGuarantee: rule.feeGuarantee ?? "exact",
    });
  }

  // Fixed mode: fall back to DB service price when no service line produced
  if (
    config.quoteMode === "fixed" &&
    config.useDbFixedPrice &&
    !lineItems.some((l) => l.category === "service") &&
    input.dbPriceAmount != null &&
    input.dbPriceAmount > 0
  ) {
    lineItems.unshift({
      id: "db-base",
      label: "Service fee",
      category: "service",
      amount: input.dbPriceAmount,
      feeGuarantee: "exact",
    });
  }

  if (lineItems.length === 0) {
    throw new Error(
      `Pricing calculation failed: no applicable rules for ${config.serviceSlug}`
    );
  }

  let subtotal = 0;
  let governmentFees = 0;
  let addOnsTotal = 0;
  let discount = 0;

  for (const item of lineItems) {
    if (item.category === "government" || item.category === "third_party") {
      governmentFees += item.amount;
    } else if (item.category === "addon") {
      addOnsTotal += item.amount;
    } else if (item.category === "discount" || item.amount < 0) {
      discount += Math.abs(item.amount);
    } else {
      subtotal += item.amount;
    }
  }

  const total = Math.max(0, subtotal + governmentFees + addOnsTotal - discount);

  return {
    quoteType: config.quoteMode,
    currency,
    total,
    subtotal,
    governmentFees,
    addOnsTotal,
    discount,
    lineItems,
    summaryLabel:
      config.quoteMode === "fixed" ? "Fixed price" : "Calculated quote",
  };
}

/** Default quote validity in days (overridable via QUOTE_VALIDITY_DAYS). */
export function getDefaultQuoteValidityDays(): number {
  const raw = process.env.QUOTE_VALIDITY_DAYS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 14;
}

export function computeQuoteExpiry(validityDays?: number): Date {
  const days = validityDays ?? getDefaultQuoteValidityDays();
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isQuoteExpired(validUntil: Date | null | undefined, now = new Date()): boolean {
  if (!validUntil) return false;
  return validUntil.getTime() < now.getTime();
}
