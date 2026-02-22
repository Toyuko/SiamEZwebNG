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
}) {
  return prisma.payment.create({
    data: {
      ...data,
      currency: data.currency ?? "THB",
      status: "submitted",
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
