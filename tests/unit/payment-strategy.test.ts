import { describe, expect, it } from "vitest";
import { thbToSatang } from "@/lib/pricing/engine";
import { calculateQuote } from "@/lib/pricing/engine";
import { marriageRegistrationPricing } from "@/config/pricing";
import {
  allocateMilestoneAmounts,
  assertMilestonesBalance,
  buildDefaultProjectMilestones,
  calculateBaseBookingPayment,
  calculateInitialPayment,
  HARD_MAX_SERVICE_PERCENTAGE,
  normalizeInitialPercentage,
  remainingBalance,
} from "@/lib/payments/strategy";
import { getDefaultPaymentConfig } from "@/lib/payments/service-config";
import { buildQuotePaymentPlan } from "@/lib/payments/quote-plan";
import { buildValidatedAiQuoteResponse } from "@/lib/payments/ai-quote";
import {
  shouldProcessWebhookEvent,
  validateCheckoutAmount,
  CheckoutValidationError,
} from "@/lib/payments/checkout-guard";

describe("payment strategy — conversion-first 10/20/30", () => {
  it("Test 1 — Low exposure: 5,000 THB at 10% with 500 minimum → 500 THB", () => {
    const result = calculateInitialPayment({
      serviceFeeSatang: thbToSatang(5000),
      initialPercentage: 10,
      minimumInitialSatang: thbToSatang(500),
      requiredUpfrontCostsSatang: 0,
    });
    expect(result.initialPaymentTotal).toBe(thbToSatang(500));
    expect(result.baseBookingPayment).toBe(thbToSatang(500));
  });

  it("Test 2 — Normal: 10,000 THB at 20% → 2,000 THB", () => {
    const result = calculateInitialPayment({
      serviceFeeSatang: thbToSatang(10_000),
      initialPercentage: 20,
      minimumInitialSatang: thbToSatang(500),
      requiredUpfrontCostsSatang: 0,
    });
    expect(result.initialPaymentTotal).toBe(thbToSatang(2000));
    expect(remainingBalance(thbToSatang(10_000), result.initialPaymentTotal)).toBe(
      thbToSatang(8000)
    );
  });

  it("Test 3 — High: 20,000 THB at 30% → 6,000 THB", () => {
    const result = calculateInitialPayment({
      serviceFeeSatang: thbToSatang(20_000),
      initialPercentage: 30,
      minimumInitialSatang: thbToSatang(500),
      requiredUpfrontCostsSatang: 0,
    });
    expect(result.initialPaymentTotal).toBe(thbToSatang(6000));
    expect(remainingBalance(thbToSatang(20_000), result.initialPaymentTotal)).toBe(
      thbToSatang(14_000)
    );
  });

  it("Test 4 — Actual upfront cost is added on top of the booking payment", () => {
    const result = calculateInitialPayment({
      serviceFeeSatang: thbToSatang(10_000),
      initialPercentage: 10,
      minimumInitialSatang: thbToSatang(500),
      requiredUpfrontCostsSatang: thbToSatang(2000),
    });
    expect(result.baseBookingPayment).toBe(thbToSatang(1000));
    expect(result.requiredUpfrontCosts).toBe(thbToSatang(2000));
    expect(result.initialPaymentTotal).toBe(thbToSatang(3000));
  });

  it("Test 5 — Minimum floors a 10% calculation below 500 THB", () => {
    const result = calculateInitialPayment({
      serviceFeeSatang: thbToSatang(2000),
      initialPercentage: 10,
      minimumInitialSatang: thbToSatang(500),
      requiredUpfrontCostsSatang: 0,
    });
    expect(calculateBaseBookingPayment(thbToSatang(2000), 10, thbToSatang(500))).toBe(
      thbToSatang(500)
    );
    expect(result.initialPaymentTotal).toBe(thbToSatang(500));
  });

  it("Test 6 — AI 50% for a normal service is normalized to ≤ 30%", () => {
    const norm = normalizeInitialPercentage(50, 30);
    expect(norm.rejected).toBe(true);
    expect(norm.percentage).toBeLessThanOrEqual(HARD_MAX_SERVICE_PERCENTAGE);
    expect(norm.percentage).toBe(30);

    const plan = buildQuotePaymentPlan({
      pricing: {
        quoteType: "calculated",
        currency: "THB",
        total: thbToSatang(10_000),
        subtotal: thbToSatang(10_000),
        governmentFees: 0,
        addOnsTotal: 0,
        discount: 0,
        lineItems: [
          {
            id: "svc",
            label: "Service",
            category: "service",
            amount: thbToSatang(10_000),
            feeGuarantee: "exact",
          },
        ],
        summaryLabel: "test",
      },
      config: getDefaultPaymentConfig("vehicle-registration"),
      serviceSlug: "vehicle-registration",
      aiRecommendedPercentage: 50,
    });
    expect(plan.initial_percentage).toBeLessThanOrEqual(30);
    expect(plan.initial_percentage).not.toBe(50);
    expect(plan.percentage_rejected).toBe(true);
  });

  it("driver-license uses a fixed 50% deposit", () => {
    const config = getDefaultPaymentConfig("driver-license");
    expect(config.default_initial_percentage).toBe(50);
    expect(config.maximum_normal_percentage).toBe(50);

    const plan = buildQuotePaymentPlan({
      pricing: {
        quoteType: "calculated",
        currency: "THB",
        total: thbToSatang(15_000),
        subtotal: thbToSatang(15_000),
        governmentFees: 0,
        addOnsTotal: 0,
        discount: 0,
        lineItems: [
          {
            id: "svc",
            label: "License conversion (car)",
            category: "service",
            amount: thbToSatang(15_000),
            feeGuarantee: "exact",
          },
        ],
        summaryLabel: "driver-license",
      },
      config,
      serviceSlug: "driver-license",
      aiRecommendedPercentage: 10,
    });
    expect(plan.initial_percentage).toBe(50);
    expect(plan.initial_payment_total).toBe(thbToSatang(7500));
    expect(plan.remaining_balance).toBe(thbToSatang(7500));
    expect(plan.requires_human_review).toBe(false);
  });

  it("Test 7 — AI 90% is rejected", () => {
    const norm = normalizeInitialPercentage(90, 30);
    expect(norm.rejected).toBe(true);
    expect(norm.percentage).toBe(30);

    const validated = buildValidatedAiQuoteResponse({
      serviceId: "svc_1",
      serviceName: "Vehicle Registration",
      serviceSlug: "vehicle-registration",
      pricing: {
        quoteType: "calculated",
        currency: "THB",
        total: thbToSatang(10_000),
        subtotal: thbToSatang(10_000),
        governmentFees: 0,
        addOnsTotal: 0,
        discount: 0,
        lineItems: [
          {
            id: "svc",
            label: "Service",
            category: "service",
            amount: thbToSatang(10_000),
            feeGuarantee: "exact",
          },
        ],
        summaryLabel: "test",
      },
      config: getDefaultPaymentConfig("vehicle-registration"),
      aiSuggestion: { recommended_percentage: 90, complexity: "simple" },
    });
    expect(validated.payment_plan.initial_percentage).toBeLessThanOrEqual(30);
    expect(validated.payment_plan.initial_percentage).not.toBe(90);
    expect(validated.percentage_rejected).toBe(true);
  });

  it("Test 8 — client-manipulated amount is rejected", () => {
    const plan = buildQuotePaymentPlan({
      pricing: {
        quoteType: "calculated",
        currency: "THB",
        total: thbToSatang(10_000),
        subtotal: thbToSatang(10_000),
        governmentFees: 0,
        addOnsTotal: 0,
        discount: 0,
        lineItems: [
          {
            id: "svc",
            label: "Service",
            category: "service",
            amount: thbToSatang(10_000),
            feeGuarantee: "exact",
          },
        ],
        summaryLabel: "test",
      },
      config: getDefaultPaymentConfig("vehicle-registration"),
      serviceSlug: "vehicle-registration",
    });
    expect(() =>
      validateCheckoutAmount({
        plan,
        choice: "initial",
        claimedAmountSatang: thbToSatang(1),
      })
    ).toThrow(CheckoutValidationError);
    expect(() =>
      validateCheckoutAmount({
        plan,
        choice: "initial",
        claimedAmountSatang: thbToSatang(1),
      })
    ).toThrow(/does not match/);
    const ok = validateCheckoutAmount({
      plan,
      choice: "initial",
      claimedAmountSatang: plan.initial_payment_total,
    });
    expect(ok.amountSatang).toBe(plan.initial_payment_total);
  });

  it("Test 9 — duplicate payment webhook is a no-op", () => {
    const first = shouldProcessWebhookEvent({
      eventId: "evt_123",
      alreadyProcessed: false,
      paymentAlreadyApproved: false,
    });
    expect(first.process).toBe(true);
    const second = shouldProcessWebhookEvent({
      eventId: "evt_123",
      alreadyProcessed: true,
      paymentAlreadyApproved: false,
    });
    expect(second.process).toBe(false);
    expect(second.reason).toBe("duplicate_event");
    const alreadyPaid = shouldProcessWebhookEvent({
      eventId: "evt_456",
      alreadyProcessed: false,
      paymentAlreadyApproved: true,
    });
    expect(alreadyPaid.process).toBe(false);
    expect(alreadyPaid.reason).toBe("already_approved");
  });

  it("Test 10 — 100,000 THB project milestones 30/30/20/20 sum exactly", () => {
    const total = thbToSatang(100_000);
    const amounts = allocateMilestoneAmounts(total, [30, 30, 20, 20]);
    expect(amounts).toEqual([
      thbToSatang(30_000),
      thbToSatang(30_000),
      thbToSatang(20_000),
      thbToSatang(20_000),
    ]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(total);
    const milestones = buildDefaultProjectMilestones(total);
    assertMilestonesBalance(total, milestones);
    expect(milestones).toHaveLength(4);
  });
});

describe("payment plan from pricing engine", () => {
  it("keeps estimated government fees out of the required upfront add-on", () => {
    const pricing = calculateQuote({
      config: marriageRegistrationPricing,
      requirements: {
        marriageType: "thai_thai",
        needsLegalization: true,
      },
    });
    const plan = buildQuotePaymentPlan({
      pricing,
      config: getDefaultPaymentConfig("marriage-registration"),
      serviceSlug: "marriage-registration",
      requirements: { marriageType: "thai_thai", needsLegalization: true },
    });
    expect(plan.estimated_third_party).toBe(thbToSatang(3000));
    expect(plan.required_upfront_costs).toBe(0);
    expect(plan.initial_percentage).toBeLessThanOrEqual(20);
    expect(plan.initial_payment_total).toBeLessThan(plan.total_estimate);
  });

  it("does not charge the customer when human review is required", () => {
    const plan = buildQuotePaymentPlan({
      pricing: {
        quoteType: "range",
        currency: "THB",
        total: thbToSatang(100_000),
        subtotal: thbToSatang(100_000),
        governmentFees: 0,
        addOnsTotal: 0,
        discount: 0,
        rangeMin: thbToSatang(80_000),
        rangeMax: thbToSatang(120_000),
        lineItems: [
          {
            id: "range",
            label: "Range",
            category: "service",
            amount: thbToSatang(100_000),
            feeGuarantee: "estimated",
          },
        ],
        summaryLabel: "range",
      },
      config: getDefaultPaymentConfig("construction-handyman"),
      serviceSlug: "construction-handyman",
    });
    expect(plan.requires_human_review).toBe(true);
    expect(() =>
      validateCheckoutAmount({ plan, choice: "initial" })
    ).toThrow(/custom quote/i);
  });

  it("adds exact third-party costs to pay-today", () => {
    const plan = buildQuotePaymentPlan({
      pricing: {
        quoteType: "calculated",
        currency: "THB",
        total: thbToSatang(6500),
        subtotal: thbToSatang(5000),
        governmentFees: thbToSatang(500),
        addOnsTotal: thbToSatang(1000),
        discount: 0,
        lineItems: [
          {
            id: "svc",
            label: "SiamEZ service fee",
            category: "service",
            amount: thbToSatang(5000),
            feeGuarantee: "exact",
          },
          {
            id: "addon",
            label: "Additional service",
            category: "addon",
            amount: thbToSatang(1000),
            feeGuarantee: "exact",
          },
          {
            id: "gov",
            label: "Required government fee",
            category: "government",
            amount: thbToSatang(500),
            feeGuarantee: "exact",
          },
        ],
        summaryLabel: "test",
      },
      config: getDefaultPaymentConfig("vehicle-registration"),
      serviceSlug: "vehicle-registration",
    });
    expect(plan.service_fee_total).toBe(thbToSatang(6000));
    expect(plan.required_upfront_costs).toBe(thbToSatang(500));
    expect(plan.initial_service_payment).toBe(thbToSatang(1200));
    expect(plan.initial_payment_total).toBe(thbToSatang(1700));
    expect(plan.remaining_balance).toBe(thbToSatang(4800));
  });
});
