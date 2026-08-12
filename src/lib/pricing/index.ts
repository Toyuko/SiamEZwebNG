/**
 * SiamEZ deterministic pricing engine.
 * AI extracts requirements; this module calculates prices from config rules.
 */
export {
  calculateQuote,
  computeQuoteExpiry,
  getDefaultQuoteValidityDays,
  isQuoteExpired,
  satangToThb,
  thbToSatang,
} from "./engine";
export type {
  CalculateQuoteInput,
} from "./engine";
export type {
  FeeGuarantee,
  PricingLineCategory,
  PricingLineItem,
  PricingLineRule,
  PricingResult,
  QuoteMode,
  ServicePricingConfig,
} from "./types";
