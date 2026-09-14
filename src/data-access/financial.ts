/**
 * Data-access for FinancialTransaction + audit log.
 */

import { prisma } from "@/lib/db";
import type {
  FinancialPaymentMethod,
  FinancialPaymentStatus,
  FinancialTransactionType,
  Prisma,
} from "@prisma/client";

export type CreateFinancialTransactionInput = {
  caseId?: string | null;
  clientId?: string | null;
  staffId?: string | null;
  serviceId?: string | null;
  type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  currency?: string;
  transactionDate: Date;
  dueDate?: Date | null;
  paymentStatus?: FinancialPaymentStatus;
  paymentMethod?: FinancialPaymentMethod | null;
  reference?: string | null;
  vendor?: string | null;
  notes?: string | null;
  receiptDocumentId?: string | null;
  isRecurring?: boolean;
  relatedPaymentId?: string | null;
  createdById?: string | null;
  paidAt?: Date | null;
};

export async function createFinancialTransaction(
  data: CreateFinancialTransactionInput,
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.financialTransaction.create({
      data: {
        caseId: data.caseId ?? undefined,
        clientId: data.clientId ?? undefined,
        staffId: data.staffId ?? undefined,
        serviceId: data.serviceId ?? undefined,
        type: data.type,
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency ?? "THB",
        transactionDate: data.transactionDate,
        dueDate: data.dueDate ?? undefined,
        paymentStatus: data.paymentStatus ?? "UNPAID",
        paymentMethod: data.paymentMethod ?? undefined,
        reference: data.reference ?? undefined,
        vendor: data.vendor ?? undefined,
        notes: data.notes ?? undefined,
        receiptDocumentId: data.receiptDocumentId ?? undefined,
        isRecurring: data.isRecurring ?? false,
        relatedPaymentId: data.relatedPaymentId ?? undefined,
        createdById: data.createdById ?? actorId ?? undefined,
        paidAt: data.paidAt ?? undefined,
      },
    });

    await tx.financialAuditLog.create({
      data: {
        transactionId: row.id,
        action: "created",
        actorId: actorId ?? undefined,
        newValues: {
          type: row.type,
          amount: row.amount,
          paymentStatus: row.paymentStatus,
          category: row.category,
        },
      },
    });

    return row;
  });
}

export async function updateFinancialTransaction(
  id: string,
  data: Partial<CreateFinancialTransactionInput> & {
    paymentStatus?: FinancialPaymentStatus;
    cancelledAt?: Date | null;
    cancelledById?: string | null;
    paidAt?: Date | null;
  },
  actorId?: string | null
) {
  const existing = await prisma.financialTransaction.findUnique({ where: { id } });
  if (!existing) throw new Error("Transaction not found");

  return prisma.$transaction(async (tx) => {
    const row = await tx.financialTransaction.update({
      where: { id },
      data: {
        ...(data.caseId !== undefined && { caseId: data.caseId }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.staffId !== undefined && { staffId: data.staffId }),
        ...(data.serviceId !== undefined && { serviceId: data.serviceId }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.transactionDate !== undefined && {
          transactionDate: data.transactionDate,
        }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
        ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
        ...(data.reference !== undefined && { reference: data.reference }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.receiptDocumentId !== undefined && {
          receiptDocumentId: data.receiptDocumentId,
        }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
        ...(data.cancelledAt !== undefined && { cancelledAt: data.cancelledAt }),
        ...(data.cancelledById !== undefined && { cancelledById: data.cancelledById }),
        ...(data.paidAt !== undefined && { paidAt: data.paidAt }),
      },
    });

    const action =
      data.paymentStatus === "CANCELLED"
        ? "cancelled"
        : data.paymentStatus && data.paymentStatus !== existing.paymentStatus
          ? "status_changed"
          : "updated";

    await tx.financialAuditLog.create({
      data: {
        transactionId: id,
        action,
        actorId: actorId ?? undefined,
        oldValues: {
          amount: existing.amount,
          paymentStatus: existing.paymentStatus,
          category: existing.category,
          description: existing.description,
        },
        newValues: {
          amount: row.amount,
          paymentStatus: row.paymentStatus,
          category: row.category,
          description: row.description,
        },
      },
    });

    return row;
  });
}

export async function cancelFinancialTransaction(id: string, actorId: string) {
  return updateFinancialTransaction(
    id,
    {
      paymentStatus: "CANCELLED",
      cancelledAt: new Date(),
      cancelledById: actorId,
    },
    actorId
  );
}

export async function markFinancialTransactionPaid(id: string, actorId: string) {
  return updateFinancialTransaction(
    id,
    {
      paymentStatus: "PAID",
      paidAt: new Date(),
    },
    actorId
  );
}

export type FinancialTransactionFilters = {
  type?: FinancialTransactionType | FinancialTransactionType[];
  paymentStatus?: FinancialPaymentStatus | FinancialPaymentStatus[];
  paymentMethod?: FinancialPaymentMethod;
  staffId?: string;
  serviceId?: string;
  caseId?: string;
  clientId?: string;
  q?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
};

export async function listFinancialTransactions(filters: FinancialTransactionFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const where: Prisma.FinancialTransactionWhereInput = {};

  if (filters.type) {
    where.type = Array.isArray(filters.type) ? { in: filters.type } : filters.type;
  }
  if (filters.paymentStatus) {
    where.paymentStatus = Array.isArray(filters.paymentStatus)
      ? { in: filters.paymentStatus }
      : filters.paymentStatus;
  }
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.staffId) where.staffId = filters.staffId;
  if (filters.serviceId) where.serviceId = filters.serviceId;
  if (filters.caseId) where.caseId = filters.caseId;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.startDate || filters.endDate) {
    where.transactionDate = {
      ...(filters.startDate && { gte: filters.startDate }),
      ...(filters.endDate && { lte: filters.endDate }),
    };
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { vendor: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { case: { caseNumber: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.financialTransaction.count({ where }),
    prisma.financialTransaction.findMany({
      where,
      include: {
        case: { select: { id: true, caseNumber: true } },
        client: { select: { id: true, name: true, email: true } },
        staff: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getFinancialTransactionsByCaseId(caseId: string) {
  return prisma.financialTransaction.findMany({
    where: { caseId },
    include: {
      staff: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      receiptDocument: true,
    },
    orderBy: { transactionDate: "desc" },
  });
}

export async function getStaffPaymentStats(range?: { start: Date; end: Date }) {
  const baseWhere = {
    type: "STAFF_PAYMENT" as const,
    paymentStatus: { not: "CANCELLED" as const },
  };

  const [unpaid, paidInRange, paidYear] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: {
        type: "STAFF_PAYMENT",
        paymentStatus: { in: ["UNPAID", "APPROVED"] },
      },
      _sum: { amount: true },
      _count: true,
    }),
    range
      ? prisma.financialTransaction.aggregate({
          where: {
            ...baseWhere,
            paymentStatus: "PAID",
            paidAt: { gte: range.start, lte: range.end },
          },
          _sum: { amount: true },
          _count: true,
        })
      : Promise.resolve({ _sum: { amount: null }, _count: 0 }),
    prisma.financialTransaction.aggregate({
      where: {
        type: "STAFF_PAYMENT",
        paymentStatus: "PAID",
        paidAt: {
          gte: new Date(`${new Date().getFullYear()}-01-01T00:00:00+07:00`),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    unpaidTotal: unpaid._sum.amount ?? 0,
    unpaidCount: unpaid._count,
    paidInRangeTotal: paidInRange._sum.amount ?? 0,
    paidInRangeCount: paidInRange._count,
    paidYearTotal: paidYear._sum.amount ?? 0,
    paidYearCount: paidYear._count,
  };
}
