"use server";

import { getSession, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { getServicePricingConfig } from "@/config/pricing";
import {
  calculateQuote,
  computeQuoteExpiry,
  isQuoteExpired,
} from "@/lib/pricing/engine";
import { extractQuoteRequirements } from "@/lib/ai/quote-extract";
import {
  applyAdminQuoteAdjustment,
  createQuote,
  getQuoteById,
  listQuotes,
  updateQuoteAdmin,
  updateQuoteStatus,
} from "@/data-access/quote";
import { resolveServicePaymentConfig } from "@/lib/payments/service-config";
import {
  buildPricingSnapshot,
  buildQuotePaymentPlan,
  parseStoredPaymentPlan,
  type PaymentChoice,
  type QuotePaymentPlan,
} from "@/lib/payments/quote-plan";
import { trackPlatformEvent } from "@/lib/analytics/track";
import { assertQuoteOwnership, CheckoutValidationError } from "@/lib/payments/checkout-guard";

export type GenerateQuoteResult =
  | {
      success: true;
      quoteId: string;
      guestToken?: string | null;
      quoteNumber?: string | null;
      quoteType: string;
      currency: string;
      total: number;
      subtotal: number;
      governmentFees: number;
      addOnsTotal: number;
      discount: number;
      rangeMin?: number;
      rangeMax?: number;
      lineItems: {
        id: string;
        label: string;
        category: string;
        amount: number;
        feeGuarantee: string;
      }[];
      validUntil: string;
      requirements: Record<string, unknown>;
      summaryLabel: string;
      paymentPlan: QuotePaymentPlan;
      pricingVersion: string;
    }
  | { success: false; error: string };

/**
 * Generate a persistent quote from wizard requirements via the pricing engine.
 * Browser totals are display-only; this server amount is authoritative.
 */
export async function generateSmartQuote(input: {
  serviceId: string;
  serviceSlug: string;
  requirements: Record<string, unknown>;
}): Promise<GenerateQuoteResult> {
  try {
    const pricing = getServicePricingConfig(input.serviceSlug);
    if (!pricing) {
      return { success: false, error: "Smart quoting is not available for this service." };
    }

    const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
    if (!service || !service.active) {
      return { success: false, error: "Service unavailable" };
    }
    if (service.slug !== input.serviceSlug) {
      return { success: false, error: "Service mismatch" };
    }

    const calculated = calculateQuote({
      config: pricing,
      requirements: input.requirements,
      dbPriceAmount: service.priceAmount,
      currency: service.priceCurrency ?? "THB",
    });

    const paymentConfig = resolveServicePaymentConfig({
      serviceSlug: service.slug,
      dbPaymentConfig: service.paymentConfig,
    });
    const paymentPlan = buildQuotePaymentPlan({
      pricing: calculated,
      config: paymentConfig,
      serviceSlug: service.slug,
      serviceName: service.name,
      requirements: input.requirements,
    });
    const snapshot = buildPricingSnapshot({ plan: paymentPlan, pricing: calculated });

    const session = await getSession();
    const validUntil = computeQuoteExpiry(pricing.validityDays);
    const quoteStatus = paymentPlan.requires_human_review
      ? "custom_quote_required"
      : "generated";

    const quote = await createQuote({
      serviceId: service.id,
      userId: session?.user?.id ?? null,
      amount: calculated.total,
      currency: calculated.currency,
      status: quoteStatus,
      quoteType: calculated.quoteType,
      validUntil,
      requirements: input.requirements as unknown as Prisma.InputJsonValue,
      pricingBreakdown: {
        lineItems: calculated.lineItems,
        summaryLabel: calculated.summaryLabel,
      } as unknown as Prisma.InputJsonValue,
      subtotal: calculated.subtotal,
      governmentFees: calculated.governmentFees,
      addOnsTotal: calculated.addOnsTotal,
      discount: calculated.discount,
      rangeMin: calculated.rangeMin,
      rangeMax: calculated.rangeMax,
      originalAmount: calculated.total,
      paymentPlan: paymentPlan as unknown as Prisma.InputJsonValue,
      pricingSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      pricingVersion: snapshot.pricing_version,
      complexity: paymentPlan.complexity,
      aiConfidence: paymentPlan.confidence,
      requiresHumanReview: paymentPlan.requires_human_review,
      paymentReason: paymentPlan.reason,
      paymentModel: paymentPlan.model,
      initialPercentage: paymentPlan.initial_percentage,
      initialPaymentTotal: paymentPlan.initial_payment_total,
      remainingBalance: paymentPlan.remaining_balance,
      requiredUpfrontCosts: paymentPlan.required_upfront_costs,
    });

    if (paymentPlan.milestones.length > 0) {
      await prisma.paymentMilestone.createMany({
        data: paymentPlan.milestones.map((m, i) => ({
          quoteId: quote.id,
          name: m.name,
          description: m.description ?? null,
          amount: m.amount,
          percentage: m.percentage,
          status: i === 0 ? "due" : "pending",
          dueCondition: m.dueCondition ?? null,
          sortOrder: i,
        })),
      });
    }

    void trackPlatformEvent(
      "quote_generated",
      {
        serviceSlug: service.slug,
        quoteId: quote.id,
        paymentModel: paymentPlan.model,
        initialPercentage: paymentPlan.initial_percentage,
        initialPaymentTotal: paymentPlan.initial_payment_total,
        requiredUpfrontCosts: paymentPlan.required_upfront_costs,
        total: calculated.total,
        requiresHumanReview: paymentPlan.requires_human_review,
      },
      session?.user?.id
    );
    void trackPlatformEvent(
      "initial_payment_shown",
      {
        serviceSlug: service.slug,
        quoteId: quote.id,
        initialPercentage: paymentPlan.initial_percentage,
        initialPaymentTotal: paymentPlan.initial_payment_total,
      },
      session?.user?.id
    );

    return {
      success: true,
      quoteId: quote.id,
      guestToken: quote.guestToken,
      quoteNumber: quote.quoteNumber,
      quoteType: calculated.quoteType,
      currency: calculated.currency,
      total: calculated.total,
      subtotal: calculated.subtotal,
      governmentFees: calculated.governmentFees,
      addOnsTotal: calculated.addOnsTotal,
      discount: calculated.discount,
      rangeMin: calculated.rangeMin,
      rangeMax: calculated.rangeMax,
      lineItems: calculated.lineItems,
      validUntil: validUntil.toISOString(),
      requirements: input.requirements,
      summaryLabel: calculated.summaryLabel,
      paymentPlan,
      pricingVersion: snapshot.pricing_version,
    };
  } catch (e) {
    console.error("generateSmartQuote", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Quote calculation failure",
    };
  }
}

export async function acceptSmartQuote(input: {
  quoteId: string;
  guestToken?: string;
  paymentChoice?: PaymentChoice;
}): Promise<{ success: boolean; error?: string; expired?: boolean }> {
  try {
    const quote = await getQuoteById(input.quoteId);
    if (!quote) return { success: false, error: "Quote not found" };

    const session = await getSession();
    try {
      assertQuoteOwnership({
        quoteUserId: quote.userId,
        quoteGuestToken: quote.guestToken,
        sessionUserId: session?.user?.id,
        guestToken: input.guestToken,
      });
    } catch (e) {
      const owns =
        (session?.user?.id && quote.userId === session.user.id) ||
        (input.guestToken && quote.guestToken === input.guestToken) ||
        (!quote.userId && !input.guestToken && quote.status === "generated");
      if (!owns && quote.status !== "generated" && quote.status !== "viewed") {
        return { success: false, error: "Not authorized to accept this quote" };
      }
      if (e instanceof CheckoutValidationError && !owns) {
        return { success: false, error: e.message };
      }
    }

    if (quote.requiresHumanReview || quote.status === "custom_quote_required") {
      return {
        success: false,
        error: "This request requires a custom quote from our SiamEZ team.",
      };
    }

    if (isQuoteExpired(quote.validUntil)) {
      await updateQuoteStatus(quote.id, "expired");
      return {
        success: false,
        expired: true,
        error:
          "This quote has expired. Pricing may have changed — please recalculate your quote.",
      };
    }

    const choice: PaymentChoice = input.paymentChoice === "full" ? "full" : "initial";
    const plan = parseStoredPaymentPlan(quote.paymentPlan);
    if (choice === "full" && plan && !plan.allow_full_payment) {
      return { success: false, error: "Full payment is not available for this service." };
    }

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        paymentChoice: choice,
      },
    });

    void trackPlatformEvent(
      choice === "full" ? "full_payment_selected" : "quote_completed",
      {
        quoteId: quote.id,
        paymentChoice: choice,
        initialPercentage: quote.initialPercentage ?? undefined,
      },
      session?.user?.id
    );

    return { success: true };
  } catch (e) {
    console.error("acceptSmartQuote", e);
    return { success: false, error: e instanceof Error ? e.message : "Accept failed" };
  }
}

export async function requestCustomQuote(input: {
  quoteId: string;
  guestToken?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const quote = await getQuoteById(input.quoteId);
    if (!quote) return { success: false, error: "Quote not found" };
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "custom_quote_required", requiresHumanReview: true },
    });
    void trackPlatformEvent("custom_quote_requested", { quoteId: quote.id });
    return { success: true };
  } catch (e) {
    console.error("requestCustomQuote", e);
    return { success: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}

export async function extractBookingRequirements(input: {
  serviceSlug: string;
  message: string;
  currentRequirements?: Record<string, unknown>;
}) {
  return extractQuoteRequirements(input);
}

export async function getQuoteForPayment(quoteId: string) {
  const quote = await getQuoteById(quoteId);
  if (!quote) return null;
  if (isQuoteExpired(quote.validUntil)) return { expired: true as const, quote };
  return { expired: false as const, quote };
}

/** Staff: list quotes for admin inbox. */
export async function adminListQuotes(filters?: {
  status?: QuoteStatus;
  serviceId?: string;
  search?: string;
}) {
  await requireStaff();
  return listQuotes(filters);
}

export async function adminGetQuote(id: string) {
  await requireStaff();
  return getQuoteById(id);
}

export async function adminUpdateQuote(input: {
  quoteId: string;
  status?: QuoteStatus;
  amount?: number;
  notes?: string;
  adminNotes?: string;
  validUntil?: string | null;
}) {
  await requireStaff();
  return updateQuoteAdmin({
    quoteId: input.quoteId,
    status: input.status,
    amount: input.amount,
    notes: input.notes,
    adminNotes: input.adminNotes,
    validUntil:
      input.validUntil === undefined
        ? undefined
        : input.validUntil
          ? new Date(input.validUntil)
          : null,
  });
}

export async function adminAdjustQuote(input: {
  quoteId: string;
  adjustmentAmountThb: number;
  reason: string;
  adminNotes?: string;
}) {
  const session = await requireStaff();
  const adjustmentAmount = Math.round(input.adjustmentAmountThb * 100);
  return applyAdminQuoteAdjustment({
    quoteId: input.quoteId,
    adjustmentAmount,
    reason: input.reason,
    adminUserId: session.user.id,
    adminNotes: input.adminNotes,
  });
}

export async function adminConvertQuoteToBooking(quoteId: string) {
  await requireStaff();
  const quote = await getQuoteById(quoteId);
  if (!quote) throw new Error("Quote not found");
  if (quote.caseId) return { caseId: quote.caseId, alreadyLinked: true };

  const reqs =
    quote.requirements && typeof quote.requirements === "object"
      ? (quote.requirements as Record<string, unknown>)
      : {};
  const guestEmail =
    (typeof reqs.email === "string" && reqs.email.trim()) ||
    quote.user?.email ||
    null;
  if (!guestEmail && !quote.userId) {
    throw new Error(
      "Cannot convert quote: add a customer email in requirements or link a user first."
    );
  }

  const { createBookingCase } = await import("@/lib/domain/cases");
  const result = await createBookingCase({
    serviceId: quote.serviceId,
    isGuest: !quote.userId,
    userId: quote.userId ?? undefined,
    guestEmail: guestEmail ?? undefined,
    guestName: typeof reqs.name === "string" ? reqs.name : undefined,
    guestPhone: typeof reqs.phone === "string" ? reqs.phone : undefined,
    formData: {
      ...reqs,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      pricingBreakdown: quote.pricingBreakdown,
    },
    quoteId: quote.id,
  });

  return { caseId: result.caseId, caseNumber: result.caseNumber, alreadyLinked: false };
}
