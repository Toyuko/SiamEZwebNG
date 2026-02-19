"use server";

import { prisma } from "@/lib/db";
import { createPayment, updatePaymentStatus } from "@/data-access/payment";
import { getStripe } from "@/lib/stripe";
import type { PaymentStatus, PaymentType } from "@prisma/client";

export interface CreatePaymentIntentInput {
  caseId: string;
  invoiceId?: string;
}

export interface CreatePaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

/**
 * Creates a Stripe PaymentIntent for a case and records the payment in DB.
 * Amount is derived from case service (fixed-price) or latest quote/invoice.
 */
export async function createPaymentIntent(
  input: CreatePaymentIntentInput
): Promise<CreatePaymentIntentResult> {
  try {
    const c = await prisma.case.findUnique({
      where: { id: input.caseId },
      include: {
        service: true,
        quotes: { orderBy: { createdAt: "desc" }, take: 1 },
        invoices: input.invoiceId
          ? { where: { id: input.invoiceId }, take: 1 }
          : { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!c) return { success: false, error: "Case not found" };

    let amount: number;
    if (input.invoiceId && c.invoices[0]) {
      amount = c.invoices[0].amount;
    } else if (c.quotes[0] && c.quotes[0].status !== "rejected") {
      amount = c.quotes[0].amount;
    } else if (c.service.type === "fixed" && c.service.priceAmount != null) {
      amount = c.service.priceAmount;
    } else {
      return { success: false, error: "No price or quote available for this case" };
    }

    const currency = c.service.priceCurrency ?? "THB";

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata: { caseId: input.caseId, ...(input.invoiceId && { invoiceId: input.invoiceId }) },
      automatic_payment_methods: { enabled: true },
    });

    await createPayment({
      caseId: input.caseId,
      amount,
      type: "full",
      status: "pending",
      currency,
      stripePaymentIntentId: pi.id,
      metadata: input.invoiceId ? { invoiceId: input.invoiceId } : undefined,
    });

    return {
      success: true,
      clientSecret: pi.client_secret ?? undefined,
      amount,
      currency,
    };
  } catch (e) {
    console.error("createPaymentIntent error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create payment intent",
    };
  }
}

export interface RecordPaymentInput {
  caseId: string;
  amount: number;
  type?: PaymentType;
  status?: PaymentStatus;
  currency?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  invoiceId?: string;
}

export interface RecordPaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export async function recordPaymentAction(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  try {
    const caseRecord = await prisma.case.findUnique({
      where: { id: input.caseId },
      select: { id: true },
    });
    if (!caseRecord) {
      return { success: false, error: "Case not found" };
    }

    const metadata =
      input.invoiceId != null
        ? { invoiceId: input.invoiceId }
        : undefined;

    const payment = await createPayment({
      caseId: input.caseId,
      amount: input.amount,
      type: input.type ?? "full",
      status: input.status ?? "pending",
      currency: input.currency ?? "THB",
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeChargeId: input.stripeChargeId,
      metadata,
    });

    return { success: true, paymentId: payment.id };
  } catch (e) {
    console.error("recordPayment error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to record payment",
    };
  }
}

export interface UpdatePaymentStatusInput {
  paymentId: string;
  status: PaymentStatus;
  stripeChargeId?: string;
}

export interface UpdatePaymentStatusResult {
  success: boolean;
  error?: string;
}

export async function updatePaymentStatusAction(
  input: UpdatePaymentStatusInput
): Promise<UpdatePaymentStatusResult> {
  try {
    await updatePaymentStatus(input.paymentId, input.status, {
      stripeChargeId: input.stripeChargeId,
    });
    return { success: true };
  } catch (e) {
    console.error("updatePaymentStatus error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update payment status",
    };
  }
}
