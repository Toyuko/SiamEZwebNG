import { prisma } from "@/lib/db";
import type { QuoteStatus } from "@prisma/client";

export async function getQuoteById(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: { case: true, invoices: true },
  });
}

export async function getQuotesByCaseId(caseId: string) {
  return prisma.quote.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveQuoteByCaseId(caseId: string) {
  return prisma.quote.findFirst({
    where: { caseId, status: { in: ["draft", "sent", "accepted"] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createQuote(data: {
  caseId: string;
  amount: number;
  currency?: string;
  status?: QuoteStatus;
  validUntil?: Date;
  notes?: string;
}) {
  return prisma.quote.create({
    data: {
      caseId: data.caseId,
      amount: data.amount,
      currency: data.currency ?? "THB",
      status: data.status ?? "draft",
      validUntil: data.validUntil ?? undefined,
      notes: data.notes ?? undefined,
    },
  });
}

export async function updateQuoteStatus(id: string, status: QuoteStatus, sentAt?: Date) {
  return prisma.quote.update({
    where: { id },
    data: { status, ...(sentAt && { sentAt }) },
  });
}
