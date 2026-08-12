import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { nextCaseNumber } from "@/lib/utils";
import { createCase as createCaseRecord } from "@/data-access/case";
import { createInvoice } from "@/data-access/invoice";
import {
  createMarketplaceJobForCase,
  notifyFreelancers,
} from "@/lib/domain/marketplace-jobs";
import type { CaseStatus, InvoiceKind } from "@prisma/client";
import { assertCaseStatusTransition } from "@/lib/domain/case-status";
import { attachOwnedDocumentsToCase } from "@/lib/documents/ownership";
import { sendBookingConfirmationEmail } from "@/lib/email/messages";
import { parseStoredPaymentPlan } from "@/lib/payments/quote-plan";
import { CheckoutValidationError, validateCheckoutAmount } from "@/lib/payments/checkout-guard";
import { trackPlatformEvent } from "@/lib/analytics/track";

export interface CreateBookingCaseInput {
  serviceId: string;
  isGuest: boolean;
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  formData?: Record<string, unknown>;
  documentIds?: string[];
  postToMarketplace?: boolean;
  /** When set, attach this quote to the case and use its amount for invoicing. */
  quoteId?: string;
  /** Authoritative satang amount from server-side quote (never trust client). */
  quoteAmountOverride?: number;
  /** initial (default) or full — never below the required initial payment. */
  paymentChoice?: "initial" | "full";
}

export async function getUserCases(userId: string) {
  return prisma.case.findMany({
    where: { userId },
    include: {
      service: true,
      invoices: true,
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserCaseById(userId: string, caseId: string) {
  return prisma.case.findFirst({
    where: { id: caseId, userId },
    include: {
      service: true,
      invoices: true,
      documents: true,
      payments: true,
      quotes: true,
    },
  });
}

export async function updateCaseStatus(caseId: string, status: CaseStatus) {
  const existing = await prisma.case.findUnique({
    where: { id: caseId },
    select: { status: true },
  });
  if (!existing) {
    throw new Error("Case not found");
  }
  assertCaseStatusTransition(existing.status, status);
  return prisma.case.update({
    where: { id: caseId },
    data: { status },
  });
}

export async function createBookingCase(input: CreateBookingCaseInput) {
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
  });
  if (!service || !service.active) {
    throw new Error("Service not found or inactive");
  }

  const userId = input.isGuest ? undefined : input.userId;
  if (!userId && !input.isGuest) {
    throw new Error("User ID required for logged-in booking");
  }
  if (input.isGuest && !input.guestEmail?.trim()) {
    throw new Error("Guest email required");
  }

  const status: CaseStatus = service.type === "fixed" ? "new" : "under_review";
  const guestCheckoutToken = input.isGuest ? randomBytes(32).toString("hex") : undefined;

  // Resolve authoritative invoice amount: quote engine > fixed service price
  let invoiceAmount: number | null = null;
  let invoiceCurrency = service.priceCurrency ?? "THB";
  let treatAsPayable = service.type === "fixed";
  let invoiceKind: InvoiceKind = "full";
  let caseStatus: CaseStatus = status;
  let quotePaymentChoice: "initial" | "full" = input.paymentChoice === "full" ? "full" : "initial";

  if (input.quoteId) {
    const quote = await prisma.quote.findUnique({
      where: { id: input.quoteId },
      include: { paymentMilestones: true },
    });
    if (!quote) throw new Error("Quote not found");
    if (quote.serviceId !== input.serviceId) throw new Error("Quote service mismatch");
    if (quote.status === "expired" || (quote.validUntil && quote.validUntil < new Date())) {
      throw new Error("Quote expired — please recalculate before booking");
    }
    if (quote.status === "converted_to_booking" && quote.caseId) {
      throw new Error("This quote already has a booking");
    }
    if (quote.requiresHumanReview || quote.status === "custom_quote_required") {
      invoiceAmount = null;
      treatAsPayable = false;
      caseStatus = "custom_quote_required";
    } else {
      const storedPlan = parseStoredPaymentPlan(quote.paymentPlan);
      const choice =
        (quote.paymentChoice === "full" || quote.paymentChoice === "initial"
          ? quote.paymentChoice
          : quotePaymentChoice) as "initial" | "full";
      quotePaymentChoice = choice;
      if (storedPlan) {
        try {
          const validated = validateCheckoutAmount({ plan: storedPlan, choice });
          invoiceAmount = validated.amountSatang;
          invoiceKind = choice === "full" ? "full" : "initial";
          treatAsPayable = true;
          caseStatus =
            choice === "full" ? "awaiting_payment" : "awaiting_initial_payment";
        } catch (e) {
          if (e instanceof CheckoutValidationError && e.code === "HUMAN_REVIEW_REQUIRED") {
            treatAsPayable = false;
            caseStatus = "custom_quote_required";
          } else {
            throw e;
          }
        }
      } else {
        invoiceAmount = quote.amount;
        invoiceCurrency = quote.currency;
        if (quote.quoteType === "fixed" || quote.quoteType === "calculated") {
          treatAsPayable = true;
          caseStatus = "awaiting_payment";
        }
      }
      invoiceCurrency = quote.currency;
    }
  } else if (input.quoteAmountOverride != null && input.quoteAmountOverride > 0) {
    invoiceAmount = input.quoteAmountOverride;
    treatAsPayable = true;
  } else if (service.type === "fixed" && service.priceAmount != null && service.priceAmount > 0) {
    invoiceAmount = service.priceAmount;
  }

  const c = await createCaseRecord({
    caseNumber: nextCaseNumber(),
    userId: userId ?? null,
    serviceId: input.serviceId,
    status:
      caseStatus !== status
        ? caseStatus
        : treatAsPayable && invoiceAmount && invoiceAmount > 0
          ? "new"
          : status,
    isGuest: input.isGuest,
    guestCheckoutToken: guestCheckoutToken ?? null,
    guestEmail: input.guestEmail?.trim() || null,
    guestName: input.guestName?.trim() || null,
    guestPhone: input.guestPhone?.trim() || null,
    formData: (input.formData ?? {}) as object,
    postToMarketplace: input.postToMarketplace ?? false,
  });

  if (input.quoteId) {
    await prisma.quote.update({
      where: { id: input.quoteId },
      data: {
        caseId: c.id,
        status: "converted_to_booking",
        acceptedAt: new Date(),
        userId: userId ?? undefined,
        paymentChoice: quotePaymentChoice,
      },
    });
    await prisma.paymentMilestone.updateMany({
      where: { quoteId: input.quoteId },
      data: { caseId: c.id },
    });
  }

  if (input.documentIds?.length) {
    await attachOwnedDocumentsToCase({
      caseId: c.id,
      documentIds: input.documentIds,
      userId: userId ?? null,
    });
  }

  if (treatAsPayable && invoiceAmount != null && invoiceAmount > 0) {
    const firstMilestone = input.quoteId
      ? await prisma.paymentMilestone.findFirst({
          where: { quoteId: input.quoteId },
          orderBy: { sortOrder: "asc" },
        })
      : null;
    await createInvoice({
      caseId: c.id,
      userId: userId ?? null,
      amount: invoiceAmount,
      currency: invoiceCurrency,
      status: "unpaid",
      quoteId: input.quoteId ?? undefined,
      kind: invoiceKind,
      milestoneId:
        invoiceKind === "initial" && firstMilestone ? firstMilestone.id : undefined,
    });
    void trackPlatformEvent("payment_started", {
      caseId: c.id,
      quoteId: input.quoteId,
      amount: invoiceAmount,
      kind: invoiceKind,
    });
  }

  if (input.postToMarketplace) {
    try {
      const { jobId } = await createMarketplaceJobForCase({
        caseId: c.id,
        serviceId: input.serviceId,
        formData: input.formData,
      });
      await notifyFreelancers(jobId);
    } catch (marketplaceError) {
      console.error(
        "Marketplace job creation failed for case",
        c.id,
        marketplaceError,
      );
    }
  }

  let recipientEmail = input.guestEmail?.trim() || null;
  let recipientName = input.guestName?.trim() || null;
  if (!recipientEmail && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    recipientEmail = user?.email ?? null;
    recipientName = recipientName || user?.name || null;
  }

  if (recipientEmail) {
    sendBookingConfirmationEmail({
      to: recipientEmail,
      name: recipientName,
      caseNumber: c.caseNumber,
      caseId: c.id,
      serviceName: service.name,
      isGuest: input.isGuest,
      isFixed: treatAsPayable && invoiceAmount != null && invoiceAmount > 0,
      guestCheckoutToken,
    });
  }

  return {
    caseId: c.id,
    caseNumber: c.caseNumber,
    isFixed: treatAsPayable && invoiceAmount != null && invoiceAmount > 0,
    guestCheckoutToken,
  };
}
