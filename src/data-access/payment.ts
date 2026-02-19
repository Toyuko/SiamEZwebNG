import { prisma } from "@/lib/db";
import type { PaymentStatus, PaymentType } from "@prisma/client";

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: { case: true },
  });
}

export async function getPaymentsByCaseId(caseId: string) {
  return prisma.payment.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPayment(data: {
  caseId: string;
  amount: number;
  type?: PaymentType;
  status?: PaymentStatus;
  currency?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  metadata?: object;
}) {
  return prisma.payment.create({
    data: {
      caseId: data.caseId,
      amount: data.amount,
      type: data.type ?? "full",
      status: data.status ?? "pending",
      currency: data.currency ?? "THB",
      stripePaymentIntentId: data.stripePaymentIntentId ?? undefined,
      stripeChargeId: data.stripeChargeId ?? undefined,
      metadata: data.metadata ?? undefined,
    },
  });
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  extras?: { stripeChargeId?: string }
) {
  return prisma.payment.update({
    where: { id },
    data: { status, ...extras },
  });
}

export async function getPaymentByStripePaymentIntentId(stripePaymentIntentId: string) {
  return prisma.payment.findUnique({
    where: { stripePaymentIntentId },
    include: { case: true },
  });
}

export async function updatePaymentByStripeIntentId(
  stripePaymentIntentId: string,
  data: { status: PaymentStatus; stripeChargeId?: string }
) {
  return prisma.payment.update({
    where: { stripePaymentIntentId },
    data,
  });
}
