"use server";

import { prisma } from "@/lib/db";
import { requireAuth, getSession } from "@/lib/auth";
import { getCaseByIdWithToken } from "@/data-access/case";
import * as invoiceDA from "@/data-access/invoice";
import * as paymentDA from "@/data-access/payment";
import { getStripe } from "@/lib/stripe";

export type PaymentMethodInput = "qr" | "bank" | "wise";

export interface CreatePaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

/**
 * Creates Stripe PaymentIntent for checkout.
 * Supports: (a) logged-in user who owns the case; (b) guest with valid token.
 */
export async function createPaymentIntent(input: {
  caseId: string;
  invoiceId?: string;
  guestToken?: string;
}): Promise<CreatePaymentIntentResult> {
  try {
    const session = await getSession();
    let invoice = null;

    if (input.guestToken && typeof input.guestToken === "string") {
      const guestCase = await getCaseByIdWithToken(input.caseId, input.guestToken);
      if (!guestCase) return { success: false, error: "Invalid or expired checkout link" };
      const invoices = await invoiceDA.getInvoicesByCaseId(input.caseId);
      invoice =
        input.invoiceId
          ? invoices.find((i) => i.id === input.invoiceId && (i.status === "unpaid" || i.status === "draft"))
          : invoices.find((i) => (i.status === "unpaid" || i.status === "draft"))
        ?? null;
    } else if (session?.user?.id) {
      invoice = input.invoiceId
        ? await invoiceDA.getInvoiceByIdForUser(input.invoiceId, session.user.id)
        : (await invoiceDA.getInvoicesByCaseId(input.caseId)).find(
            (i) => i.userId === session.user.id && (i.status === "unpaid" || i.status === "draft")
          ) ?? null;
    }

    if (!invoice) return { success: false, error: "Invoice not found" };

    let stripe: import("stripe").Stripe;
    try {
      stripe = getStripe();
    } catch {
      return { success: false, error: "Stripe is not configured" };
    }

    const pi = await stripe.paymentIntents.create({
      amount: invoice.amount,
      currency: invoice.currency.toLowerCase(),
      metadata: { caseId: invoice.caseId, invoiceId: invoice.id },
      automatic_payment_methods: { enabled: true },
    });

    return {
      success: true,
      clientSecret: pi.client_secret ?? undefined,
      amount: invoice.amount,
      currency: invoice.currency,
    };
  } catch (e) {
    console.error("createPaymentIntent error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create payment",
    };
  }
}

export interface SubmitPaymentWithProofInput {
  invoiceId: string;
  method: PaymentMethodInput;
  proofDocumentId: string;
}

export interface SubmitPaymentWithProofResult {
  success: boolean;
  error?: string;
}

/**
 * Client submits payment with proof (slip/screenshot).
 * Creates Payment record, sets invoice to pending_verification.
 */
export async function submitPaymentWithProof(
  input: SubmitPaymentWithProofInput
): Promise<SubmitPaymentWithProofResult> {
  try {
    const session = await requireAuth();
    const invoice = await invoiceDA.getInvoiceByIdForUser(input.invoiceId, session.user.id);
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status === "paid") return { success: false, error: "Invoice already paid" };
    if (invoice.status === "rejected") return { success: false, error: "Invoice was rejected" };

    const methodMap = { qr: "qr" as const, bank: "bank" as const, wise: "wise" as const };
    const method = methodMap[input.method];

    const doc = await prisma.document.findFirst({
      where: {
        id: input.proofDocumentId,
        caseId: invoice.caseId,
        documentType: "payment_proof",
      },
    });
    if (!doc) return { success: false, error: "Payment proof document not found" };

    await paymentDA.createPayment({
      invoiceId: input.invoiceId,
      caseId: invoice.caseId,
      amount: invoice.amount,
      currency: invoice.currency,
      method,
      proofDocumentId: input.proofDocumentId,
    });

    await invoiceDA.updateInvoiceStatus(input.invoiceId, "pending_verification");
    await invoiceDA.updateInvoicePaymentMethod(input.invoiceId, method);

    return { success: true };
  } catch (e) {
    console.error("submitPaymentWithProof error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to submit payment",
    };
  }
}

export interface ApprovePaymentResult {
  success: boolean;
  error?: string;
}

/**
 * Admin approves payment -> marks invoice paid, updates case status.
 */
export async function approvePayment(paymentId: string): Promise<ApprovePaymentResult> {
  try {
    const session = await requireAuth();
    if (session.user.role !== "admin" && session.user.role !== "staff") {
      return { success: false, error: "Unauthorized" };
    }
    const payment = await paymentDA.getPaymentById(paymentId);
    if (!payment) return { success: false, error: "Payment not found" };
    if (payment.status !== "submitted") return { success: false, error: "Payment already processed" };

    await prisma.$transaction([
      paymentDA.updatePaymentStatus(paymentId, "approved"),
      invoiceDA.updateInvoiceStatus(payment.invoiceId, "paid"),
      prisma.case.update({
        where: { id: payment.caseId },
        data: { status: "in_progress" },
      }),
    ]);

    return { success: true };
  } catch (e) {
    console.error("approvePayment error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to approve payment",
    };
  }
}

export interface RejectPaymentResult {
  success: boolean;
  error?: string;
}

/**
 * Admin rejects payment -> marks invoice rejected.
 */
export async function rejectPayment(paymentId: string): Promise<RejectPaymentResult> {
  try {
    const session = await requireAuth();
    if (session.user.role !== "admin" && session.user.role !== "staff") {
      return { success: false, error: "Unauthorized" };
    }
    const payment = await paymentDA.getPaymentById(paymentId);
    if (!payment) return { success: false, error: "Payment not found" };
    if (payment.status !== "submitted") return { success: false, error: "Payment already processed" };

    await prisma.$transaction([
      paymentDA.updatePaymentStatus(paymentId, "rejected"),
      invoiceDA.updateInvoiceStatus(payment.invoiceId, "rejected"),
    ]);

    return { success: true };
  } catch (e) {
    console.error("rejectPayment error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to reject payment",
    };
  }
}
