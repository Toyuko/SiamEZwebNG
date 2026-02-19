import { prisma } from "@/lib/db";
import type { InvoiceStatus } from "@prisma/client";

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      case: { include: { service: true } },
      quote: true,
      user: true,
    },
  });
}

export async function getInvoiceByIdForUser(id: string, userId: string) {
  return prisma.invoice.findFirst({
    where: { id, userId },
    include: {
      case: { include: { service: true } },
      quote: true,
    },
  });
}

export async function getInvoicesByCaseId(caseId: string) {
  return prisma.invoice.findMany({
    where: { caseId },
    include: { quote: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoicesByUserId(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    include: { case: { include: { service: true } }, quote: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createInvoice(data: {
  caseId: string;
  quoteId?: string | null;
  userId: string;
  amount: number;
  currency?: string;
  status?: InvoiceStatus;
  dueDate?: Date | null;
  lineItems?: object | null;
}) {
  return prisma.invoice.create({
    data: {
      ...data,
      quoteId: data.quoteId ?? undefined,
      currency: data.currency ?? "THB",
      status: data.status ?? "draft",
      dueDate: data.dueDate ?? undefined,
      lineItems: data.lineItems ?? undefined,
    },
  });
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  return prisma.invoice.update({
    where: { id },
    data: {
      status,
      ...(status === "paid" && { paidAt: new Date() }),
      ...(status === "sent" && { sentAt: new Date() }),
    },
  });
}

export async function updateInvoicePaid(id: string) {
  return prisma.invoice.update({
    where: { id },
    data: { status: "paid", paidAt: new Date() },
  });
}
