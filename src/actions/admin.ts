"use server";

import { prisma } from "@/lib/db";
import type { CaseStatus, InvoiceStatus, ServiceType } from "@prisma/client";

// ----- Admin data fetchers -----

export async function getAdminStats() {
  const [openCases, totalClients, paidPayments, pendingInvoices] = await Promise.all([
    prisma.case.count({ where: { status: { notIn: ["completed", "cancelled"] as CaseStatus[] } } }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.payment.aggregate({
      where: { status: "succeeded" },
      _sum: { amount: true },
    }),
    prisma.invoice.count({ where: { status: { in: ["sent", "draft"] as InvoiceStatus[] } } }),
  ]);
  return {
    openCases,
    totalClients,
    revenue: paidPayments._sum.amount ?? 0,
    pendingInvoices,
  };
}

export async function getCases(status?: CaseStatus | "all") {
  const where =
    status && status !== "all"
      ? { status }
      : { status: { notIn: ["completed", "cancelled"] as CaseStatus[] } };

  return prisma.case.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { id: true, name: true, slug: true, type: true } },
      staffAssignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCaseById(id: string) {
  return prisma.case.findUnique({
    where: { id },
    include: {
      user: true,
      service: true,
      staffAssignments: { include: { user: true } },
      caseNotes: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" } },
      documents: true,
      payments: { orderBy: { createdAt: "desc" } },
      invoices: { include: { quote: true }, orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getStaffUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["admin", "staff"] }, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function getServices() {
  return prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function getInvoices(status?: InvoiceStatus | "all") {
  const where =
    status && status !== "all"
      ? { status }
      : undefined;

  return prisma.invoice.findMany({
    where,
    include: {
      case: { select: { id: true, caseNumber: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClients() {
  return prisma.user.findMany({
    where: { role: "customer" },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

// ----- Mutations -----

export async function updateService(
  id: string,
  data: { priceAmount?: number | null; type?: ServiceType }
) {
  return prisma.service.update({
    where: { id },
    data,
  });
}

export async function createInvoice(
  caseId: string,
  userId: string,
  amount: number,
  dueDate?: Date
) {
  return prisma.invoice.create({
    data: {
      caseId,
      userId,
      amount,
      currency: "THB",
      status: "draft",
      dueDate: dueDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
}
