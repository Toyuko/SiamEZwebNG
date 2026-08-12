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

    const session = await getSession();
    const validUntil = computeQuoteExpiry(pricing.validityDays);

    const quote = await createQuote({
      serviceId: service.id,
      userId: session?.user?.id ?? null,
      amount: calculated.total,
      currency: calculated.currency,
      status: "generated",
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
    });

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
}): Promise<{ success: boolean; error?: string; expired?: boolean }> {
  try {
    const quote = await getQuoteById(input.quoteId);
    if (!quote) return { success: false, error: "Quote not found" };

    const session = await getSession();
    const owns =
      (session?.user?.id && quote.userId === session.user.id) ||
      (input.guestToken && quote.guestToken === input.guestToken) ||
      (!quote.userId && !input.guestToken && quote.status === "generated");

    // Soft-launch: allow accept when quote is freshly generated in same wizard session
    if (!owns && quote.status !== "generated" && quote.status !== "viewed") {
      return { success: false, error: "Not authorized to accept this quote" };
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

    await updateQuoteStatus(quote.id, "accepted", { acceptedAt: new Date() });
    return { success: true };
  } catch (e) {
    console.error("acceptSmartQuote", e);
    return { success: false, error: e instanceof Error ? e.message : "Accept failed" };
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
