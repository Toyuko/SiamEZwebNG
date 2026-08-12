/**
 * Conversion-first payment strategy engine.
 *
 * Never asks the customer for more money upfront than SiamEZ reasonably
 * needs to begin the service. AI may recommend a model; this module is
 * the source of truth and always selects the lowest safe initial payment.
 *
 * Amounts are in satang (smallest currency unit) unless noted.
 */

import { thbToSatang } from "@/lib/pricing/engine";

export const PAYMENT_MODELS = ["BOOK_NOW", "START_SERVICE", "PROJECT_CUSTOM"] as const;
export type PaymentModel = (typeof PAYMENT_MODELS)[number];

export const EXPOSURE_STRATEGIES = [
  "LOW_EXPOSURE",
  "NORMAL_EXPOSURE",
  "HIGH_EXPOSURE",
] as const;
export type ExposureStrategy = (typeof EXPOSURE_STRATEGIES)[number];

export const COMPLEXITY_LEVELS = ["simple", "moderate", "complex"] as const;
export type QuoteComplexity = (typeof COMPLEXITY_LEVELS)[number];

export const EXPOSURE_PERCENTAGE: Record<ExposureStrategy, 10 | 20 | 30> = {
  LOW_EXPOSURE: 10,
  NORMAL_EXPOSURE: 20,
  HIGH_EXPOSURE: 30,
};

export const MODEL_FOR_EXPOSURE: Record<ExposureStrategy, PaymentModel> = {
  LOW_EXPOSURE: "BOOK_NOW",
  NORMAL_EXPOSURE: "START_SERVICE",
  HIGH_EXPOSURE: "PROJECT_CUSTOM",
};

export const EXPOSURE_FOR_MODEL: Record<PaymentModel, ExposureStrategy> = {
  BOOK_NOW: "LOW_EXPOSURE",
  START_SERVICE: "NORMAL_EXPOSURE",
  PROJECT_CUSTOM: "HIGH_EXPOSURE",
};

/** Default floor for the SiamEZ booking portion (not including required upfront costs). */
export const DEFAULT_MINIMUM_INITIAL_THB = 500;
export const DEFAULT_MAXIMUM_NORMAL_PERCENTAGE = 30;

/** Percentages above this are never a "normal" deposit — only allowed to fund named external costs. */
export const HARD_MAX_SERVICE_PERCENTAGE = 30;

export const DEFAULT_PROJECT_MILESTONES: ReadonlyArray<{
  name: string;
  description: string;
  percentage: number;
  dueCondition: string;
}> = [
  {
    name: "Project Start",
    description: "Start work and allocate the SiamEZ team",
    percentage: 30,
    dueCondition: "booking_confirmed",
  },
  {
    name: "Phase 1 Complete",
    description: "First delivery milestone",
    percentage: 30,
    dueCondition: "phase_1_complete",
  },
  {
    name: "Phase 2 Complete",
    description: "Second delivery milestone",
    percentage: 20,
    dueCondition: "phase_2_complete",
  },
  {
    name: "Final Completion",
    description: "Project complete",
    percentage: 20,
    dueCondition: "project_complete",
  },
];

export interface ServicePaymentConfig {
  payment_strategy: ExposureStrategy;
  default_initial_percentage: 10 | 20 | 30;
  minimum_initial_payment: number;
  /** THB. Converted to satang at calculation time. */
  maximum_normal_percentage: number;
  allow_milestones: boolean;
  allow_full_payment: boolean;
  /** Optional named refund policy key for admin display. */
  refund_policy?: string;
}

export interface MilestoneDraft {
  name: string;
  description?: string;
  percentage: number;
  amount: number;
  dueCondition?: string;
  dueDate?: string | null;
  status?: "pending" | "due" | "paid" | "waived";
}

export interface CalculateInitialPaymentInput {
  /** SiamEZ service fee only (base + add-ons − discount). Satang. */
  serviceFeeSatang: number;
  /** Requested / configured percentage (10 / 20 / 30). */
  initialPercentage: number;
  /** Minimum SiamEZ booking portion. Satang. */
  minimumInitialSatang: number;
  /** Confirmed government / third-party / material costs that must be paid now. Satang. */
  requiredUpfrontCostsSatang: number;
  /** Ceiling for the SiamEZ booking percentage (default 30). */
  maximumNormalPercentage?: number;
}

export interface InitialPaymentBreakdown {
  /** Percentage actually applied after normalization. */
  initialPercentage: number;
  /** max(serviceFee × %, minimum). Does not include upfront costs. */
  baseBookingPayment: number;
  requiredUpfrontCosts: number;
  /** baseBookingPayment + requiredUpfrontCosts */
  initialPaymentTotal: number;
  /** True when the AI/client percentage was capped or rejected. */
  percentageNormalized: boolean;
  /** True when percentage was above the hard max and rejected down. */
  percentageRejected: boolean;
}

/**
 * Normalize an AI- or client-supplied percentage.
 * 50–90% is never a normal deposit — cap to maximum_normal_percentage
 * unless the service config explicitly permits a higher ceiling.
 */
export function normalizeInitialPercentage(
  requested: number,
  maximumNormalPercentage = DEFAULT_MAXIMUM_NORMAL_PERCENTAGE
): { percentage: number; normalized: boolean; rejected: boolean } {
  if (!Number.isFinite(requested) || requested <= 0) {
    return { percentage: 10, normalized: true, rejected: true };
  }
  const rounded = Math.round(requested);
  const cap = Math.min(
    Math.max(1, Math.round(maximumNormalPercentage)),
    100
  );
  if (rounded > cap) {
    return {
      percentage: Math.min(cap, HARD_MAX_SERVICE_PERCENTAGE) === cap
        ? cap
        : Math.min(cap, HARD_MAX_SERVICE_PERCENTAGE),
      normalized: true,
      rejected: rounded > HARD_MAX_SERVICE_PERCENTAGE || rounded > cap,
    };
  }
  if (rounded > HARD_MAX_SERVICE_PERCENTAGE && cap <= HARD_MAX_SERVICE_PERCENTAGE) {
    return { percentage: HARD_MAX_SERVICE_PERCENTAGE, normalized: true, rejected: true };
  }
  return { percentage: rounded, normalized: false, rejected: false };
}

/**
 * Base booking payment = max(serviceFee × percentage, minimum).
 * Does not include required upfront costs.
 */
export function calculateBaseBookingPayment(
  serviceFeeSatang: number,
  percentage: number,
  minimumInitialSatang: number
): number {
  const fee = Math.max(0, Math.round(serviceFeeSatang));
  const min = Math.max(0, Math.round(minimumInitialSatang));
  const pct = Math.round((fee * percentage) / 100);
  return Math.max(pct, min);
}

/**
 * Customer initial payment = Base Booking Payment + Required Actual Upfront Costs.
 */
export function calculateInitialPayment(
  input: CalculateInitialPaymentInput
): InitialPaymentBreakdown {
  const maxPct =
    input.maximumNormalPercentage ?? DEFAULT_MAXIMUM_NORMAL_PERCENTAGE;
  const { percentage, normalized, rejected } = normalizeInitialPercentage(
    input.initialPercentage,
    maxPct
  );
  const baseBookingPayment = calculateBaseBookingPayment(
    input.serviceFeeSatang,
    percentage,
    input.minimumInitialSatang
  );
  const requiredUpfrontCosts = Math.max(
    0,
    Math.round(input.requiredUpfrontCostsSatang)
  );
  return {
    initialPercentage: percentage,
    baseBookingPayment,
    requiredUpfrontCosts,
    initialPaymentTotal: baseBookingPayment + requiredUpfrontCosts,
    percentageNormalized: normalized,
    percentageRejected: rejected,
  };
}

export function remainingBalance(
  totalSatang: number,
  initialPaymentTotal: number
): number {
  return Math.max(0, Math.round(totalSatang) - Math.round(initialPaymentTotal));
}

export function minimumSatangFromConfig(config: ServicePaymentConfig): number {
  return thbToSatang(config.minimum_initial_payment);
}

/**
 * Split a total into milestone amounts that sum exactly (no rounding drift).
 * The last milestone absorbs remainder satang.
 */
export function allocateMilestoneAmounts(
  totalSatang: number,
  percentages: number[]
): number[] {
  if (percentages.length === 0) return [];
  const sumPct = percentages.reduce((a, b) => a + b, 0);
  if (sumPct !== 100) {
    throw new Error(`Milestone percentages must sum to 100 (got ${sumPct})`);
  }
  const total = Math.max(0, Math.round(totalSatang));
  const amounts = percentages.map((p) => Math.floor((total * p) / 100));
  const allocated = amounts.reduce((a, b) => a + b, 0);
  amounts[amounts.length - 1] += total - allocated;
  return amounts;
}

export function buildDefaultProjectMilestones(totalSatang: number): MilestoneDraft[] {
  const percentages = DEFAULT_PROJECT_MILESTONES.map((m) => m.percentage);
  const amounts = allocateMilestoneAmounts(totalSatang, percentages);
  return DEFAULT_PROJECT_MILESTONES.map((m, i) => ({
    name: m.name,
    description: m.description,
    percentage: m.percentage,
    amount: amounts[i] ?? 0,
    dueCondition: m.dueCondition,
    status: i === 0 ? "due" : "pending",
  }));
}

export function assertMilestonesBalance(
  totalSatang: number,
  milestones: Array<{ amount: number }>
): void {
  const sum = milestones.reduce((acc, m) => acc + Math.round(m.amount), 0);
  if (sum !== Math.round(totalSatang)) {
    throw new Error(
      `Milestone amounts must equal total (${sum} !== ${Math.round(totalSatang)})`
    );
  }
}

export function modelFromPercentage(percentage: number): PaymentModel {
  if (percentage <= 10) return "BOOK_NOW";
  if (percentage <= 20) return "START_SERVICE";
  return "PROJECT_CUSTOM";
}

export function strategyFromPercentage(percentage: number): ExposureStrategy {
  return EXPOSURE_FOR_MODEL[modelFromPercentage(percentage)];
}

export function isPaymentModel(value: unknown): value is PaymentModel {
  return typeof value === "string" && (PAYMENT_MODELS as readonly string[]).includes(value);
}

export function isExposureStrategy(value: unknown): value is ExposureStrategy {
  return (
    typeof value === "string" &&
    (EXPOSURE_STRATEGIES as readonly string[]).includes(value)
  );
}
