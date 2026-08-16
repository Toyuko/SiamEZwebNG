/**
 * Per-service payment strategy defaults.
 * Admin `Service.paymentConfig` overrides these at runtime.
 * Never duplicates Service pricing — only payment timing / exposure.
 */

import type { ServicePaymentConfig, ExposureStrategy } from "./strategy";
import {
  DEFAULT_MAXIMUM_NORMAL_PERCENTAGE,
  DEFAULT_MINIMUM_INITIAL_THB,
  EXPOSURE_PERCENTAGE,
  isExposureStrategy,
} from "./strategy";

function config(
  strategy: ExposureStrategy,
  extras?: Partial<ServicePaymentConfig>
): ServicePaymentConfig {
  return {
    payment_strategy: strategy,
    default_initial_percentage: EXPOSURE_PERCENTAGE[strategy],
    minimum_initial_payment: DEFAULT_MINIMUM_INITIAL_THB,
    maximum_normal_percentage: DEFAULT_MAXIMUM_NORMAL_PERCENTAGE,
    allow_milestones: strategy === "HIGH_EXPOSURE",
    allow_full_payment: true,
    refund_policy: "applied_to_service_fee",
    ...extras,
  };
}

/**
 * Catalog defaults. AI may select a *lower* exposure than this ceiling
 * when the booking is clearly low-risk; it may not exceed maximum_normal_percentage.
 */
export const SERVICE_PAYMENT_DEFAULTS: Record<string, ServicePaymentConfig> = {
  "basic-translation": config("LOW_EXPOSURE"),
  "translation-services": config("LOW_EXPOSURE"),
  "police-clearance": config("LOW_EXPOSURE"),
  /** 50% deposit at booking; balance after you get your license. */
  "driver-license": config("NORMAL_EXPOSURE", {
    default_initial_percentage: 50,
    maximum_normal_percentage: 50,
    allow_milestones: false,
  }),
  "vehicle-registration": config("NORMAL_EXPOSURE"),
  "marriage-registration": config("NORMAL_EXPOSURE"),
  "visa-services": config("NORMAL_EXPOSURE"),
  "transportation-services": config("NORMAL_EXPOSURE"),
  "private-driver-service": config("NORMAL_EXPOSURE"),
  "construction-handyman": config("HIGH_EXPOSURE", {
    minimum_initial_payment: 1000,
    allow_milestones: true,
  }),
  "real-estate-services": config("HIGH_EXPOSURE", {
    minimum_initial_payment: 1000,
    allow_milestones: true,
  }),
  /** Fixed ฿5,000 at booking checkout — milestones unused for this service. */
  "car-motorbike-finder-selling-service": config("LOW_EXPOSURE", {
    minimum_initial_payment: 5000,
    allow_milestones: false,
    allow_full_payment: true,
  }),
  "event-planning-venue-services": config("HIGH_EXPOSURE", {
    allow_milestones: true,
  }),
};

export const FALLBACK_PAYMENT_CONFIG: ServicePaymentConfig = config("NORMAL_EXPOSURE");

export function getDefaultPaymentConfig(serviceSlug: string): ServicePaymentConfig {
  return SERVICE_PAYMENT_DEFAULTS[serviceSlug] ?? FALLBACK_PAYMENT_CONFIG;
}

function asPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

/**
 * Merge admin JSON over catalog defaults. Invalid values fall back.
 */
export function parseServicePaymentConfig(
  raw: unknown,
  serviceSlug?: string
): ServicePaymentConfig {
  const defaults = serviceSlug
    ? getDefaultPaymentConfig(serviceSlug)
    : FALLBACK_PAYMENT_CONFIG;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const obj = raw as Record<string, unknown>;

  const strategy = isExposureStrategy(obj.payment_strategy)
    ? obj.payment_strategy
    : defaults.payment_strategy;

  const pctRaw = asPositiveInt(
    obj.default_initial_percentage,
    defaults.default_initial_percentage || EXPOSURE_PERCENTAGE[strategy]
  );
  const default_initial_percentage = Math.min(100, Math.max(1, pctRaw));

  return {
    payment_strategy: strategy,
    default_initial_percentage,
    minimum_initial_payment: asPositiveInt(
      obj.minimum_initial_payment,
      defaults.minimum_initial_payment
    ),
    maximum_normal_percentage: Math.min(
      100,
      Math.max(
        default_initial_percentage,
        asPositiveInt(
          obj.maximum_normal_percentage,
          defaults.maximum_normal_percentage
        )
      )
    ),
    allow_milestones: asBoolean(obj.allow_milestones, defaults.allow_milestones),
    allow_full_payment: asBoolean(obj.allow_full_payment, defaults.allow_full_payment),
    refund_policy:
      typeof obj.refund_policy === "string"
        ? obj.refund_policy
        : defaults.refund_policy,
  };
}

export function resolveServicePaymentConfig(input: {
  serviceSlug: string;
  dbPaymentConfig?: unknown;
}): ServicePaymentConfig {
  const defaults = getDefaultPaymentConfig(input.serviceSlug);
  if (input.dbPaymentConfig == null) return defaults;
  return parseServicePaymentConfig(input.dbPaymentConfig, input.serviceSlug);
}
