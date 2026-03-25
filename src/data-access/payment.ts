import { prisma } from "@/lib/db";
import type { PaymentStatus, PaymentMethod } from "@prisma/client";

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: { include: { case: { include: { service: true } } } },
      case: true,
      proofDocument: true,
    },
  });
}

export async function getPaymentsByInvoiceId(invoiceId: string) {
  return prisma.payment.findMany({
    where: { invoiceId },
    include: { proofDocument: true },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getPaymentsByCaseId(caseId: string) {
  return prisma.payment.findMany({
    where: { caseId },
    include: { invoice: true, proofDocument: true },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getPaymentsPendingReview() {
  return prisma.payment.findMany({
    where: { status: "submitted" },
    include: {
      invoice: { include: { case: { include: { service: true, user: true } }, user: true } },
      proofDocument: true,
    },
    orderBy: { submittedAt: "asc" },
  });
}

export async function createPayment(data: {
  invoiceId: string;
  caseId: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  proofDocumentId?: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  metadata?: object | null;
  status?: PaymentStatus;
}) {
  return prisma.payment.create({
    data: {
      invoiceId: data.invoiceId,
      caseId: data.caseId,
      amount: data.amount,
      currency: data.currency ?? "THB",
      method: data.method,
      proofDocumentId: data.proofDocumentId,
      stripePaymentIntentId: data.stripePaymentIntentId ?? undefined,
      stripeChargeId: data.stripeChargeId ?? undefined,
      metadata: data.metadata ?? undefined,
      status: data.status ?? "submitted",
    },
  });
}

export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  return prisma.payment.update({
    where: { id },
    data: {
      status,
      ...(status === "approved" && { approvedAt: new Date() }),
    },
  });
}

export async function getPaymentByStripePaymentIntentId(stripePaymentIntentId: string) {
  return prisma.payment.findUnique({
    where: { stripePaymentIntentId },
  });
}

/** Maps Stripe intent outcomes to internal payment statuses. */
export async function updatePaymentByStripeIntentId(
  stripePaymentIntentId: string,
  data: { status: "succeeded" | "failed"; stripeChargeId?: string | null }
) {
  const internalStatus: PaymentStatus = data.status === "succeeded" ? "approved" : "rejected";
  return prisma.payment.update({
    where: { stripePaymentIntentId },
    data: {
      status: internalStatus,
      stripeChargeId: data.stripeChargeId ?? undefined,
      ...(internalStatus === "approved" && { approvedAt: new Date() }),
    },
  });
}
