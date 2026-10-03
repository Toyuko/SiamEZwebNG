import { Prisma, type SalesCommissionStatus, type SalesCommissionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/finance/dates";
import {
  sumApprovedCustomerPayments,
  sumInvoicedAmount,
  sumQuotedAmount,
  sumRefunds,
  sumStaffCosts,
} from "@/lib/finance/calculations";
import {
  SALES_COMMISSION_CATEGORY,
  SALES_SETTINGS_KEY,
  assertEligibleSalesperson,
  computeCommissionSatang,
  parseSalesSettings,
  planAttributionChange,
  resolveClosedAt,
  resolveDealValue,
  type SalesCommissionType as CommissionType,
  type SalesDeal,
  type SalesSettings,
} from "@/lib/finance/sales";

const dealInclude = {
  salesPerson: { select: { id: true, name: true, email: true } },
  service: { select: { id: true, name: true, priceAmount: true } },
  user: { select: { id: true, name: true, email: true } },
  payments: { select: { amount: true, status: true, method: true } },
  invoices: { select: { amount: true, status: true, depositAmount: true } },
  quotes: { select: { amount: true, status: true } },
  staffAssignments: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  financialTransactions: {
    select: { type: true, amount: true, paymentStatus: true, category: true },
  },
  salesCommission: true,
} satisfies Prisma.CaseInclude;

type DealRow = Prisma.CaseGetPayload<{ include: typeof dealInclude }>;

export async function getSalesSettings(): Promise<SalesSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: SALES_SETTINGS_KEY } });
  return parseSalesSettings(row?.value);
}

export async function saveSalesSettings(settings: SalesSettings): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SALES_SETTINGS_KEY },
    create: { key: SALES_SETTINGS_KEY, value: settings },
    update: { value: settings },
  });
}

function customerName(row: DealRow): string {
  return row.user?.name ?? row.user?.email ?? row.guestName ?? row.guestEmail ?? "Guest";
}

export function mapCaseToSalesDeal(row: DealRow): SalesDeal {
  const paid = sumApprovedCustomerPayments(row.payments);
  const refunds = sumRefunds(row.financialTransactions);
  const approvedMethod =
    row.payments.find((p) => p.status === "approved")?.method ?? row.payments[0]?.method ?? null;
  return {
    caseId: row.id,
    caseNumber: row.caseNumber,
    customerName: customerName(row),
    clientId: row.userId,
    serviceId: row.serviceId,
    serviceName: row.otherServiceName?.trim() || row.service?.name || "Other",
    status: row.status,
    salesPersonId: row.salesPersonId,
    salesPersonName: row.salesPerson?.name ?? row.salesPerson?.email ?? null,
    staffIds: row.staffAssignments.map((a) => a.userId),
    staffNames: row.staffAssignments.map((a) => a.user.name ?? a.user.email),
    staffCompensation: sumStaffCosts(row.financialTransactions),
    closedAt: row.closedAt,
    dealValue: resolveDealValue({
      explicit: row.dealValue,
      invoiced: sumInvoicedAmount(row.invoices),
      quoted: sumQuotedAmount(row.quotes),
      servicePrice: row.service?.priceAmount,
    }),
    paid,
    refunds,
    commissionAmount: row.salesCommission?.amount ?? 0,
    commissionStatus: row.salesCommission?.status ?? null,
    commissionType: row.salesCommission?.commissionType ?? null,
    paymentMethod: approvedMethod,
  };
}

export async function listSalesDeals(where: Prisma.CaseWhereInput = {}): Promise<SalesDeal[]> {
  const rows = await prisma.case.findMany({
    where,
    include: dealInclude,
    orderBy: { closedAt: "desc" },
  });
  return rows.map(mapCaseToSalesDeal);
}

export async function listClosedDealsInRange(range: DateRange, salesPersonId?: string | null) {
  return listSalesDeals({
    closedAt: { gte: range.start, lte: range.end },
    ...(salesPersonId ? { salesPersonId } : {}),
  });
}

/** Quotes and vehicle leads assigned to a salesperson. Used only when a denominator exists. */
export async function countSalesOpportunities(
  range: DateRange,
  salesPersonIds: string[]
): Promise<Record<string, number>> {
  if (salesPersonIds.length === 0) return {};
  const [quotes, leads] = await Promise.all([
    prisma.quote.groupBy({
      by: ["salesPersonId"],
      where: {
        salesPersonId: { in: salesPersonIds },
        createdAt: { gte: range.start, lte: range.end },
      },
      _count: { _all: true },
    }),
    prisma.vehicleLead.groupBy({
      by: ["assignedStaffId"],
      where: {
        assignedStaffId: { in: salesPersonIds },
        createdAt: { gte: range.start, lte: range.end },
      },
      _count: { _all: true },
    }),
  ]);
  const out: Record<string, number> = {};
  for (const q of quotes) {
    if (!q.salesPersonId) continue;
    out[q.salesPersonId] = (out[q.salesPersonId] ?? 0) + q._count._all;
  }
  for (const l of leads) {
    if (!l.assignedStaffId) continue;
    out[l.assignedStaffId] = (out[l.assignedStaffId] ?? 0) + l._count._all;
  }
  return out;
}

async function loadEligibleSalesperson(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, name: true, email: true },
  });
  assertEligibleSalesperson(user);
  return user!;
}

export async function assignCaseSalesPerson(input: {
  caseId: string;
  salesPersonId: string;
  changedById: string;
  reason?: string | null;
  closedAt?: Date | null;
  dealValue?: number | null;
  salesNotes?: string | null;
  isNew?: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  await loadEligibleSalesperson(input.salesPersonId);
  const existing = await prisma.case.findUnique({
    where: { id: input.caseId },
    select: { id: true, salesPersonId: true, closedAt: true },
  });
  if (!existing) throw new Error("Case not found");

  const change = planAttributionChange({
    previousSalesPersonId: existing.salesPersonId,
    newSalesPersonId: input.salesPersonId,
    changedById: input.changedById,
    reason: input.reason,
    now,
  });
  const resolvedClosedAt = resolveClosedAt({
    existingClosedAt: existing.closedAt,
    providedClosedAt: input.closedAt ?? null,
    isNew: input.isNew === true,
    now,
  });

  await prisma.$transaction(async (tx) => {
    await tx.case.update({
      where: { id: input.caseId },
      data: {
        salesPersonId: input.salesPersonId,
        closedAt: resolvedClosedAt,
        ...(input.dealValue != null ? { dealValue: input.dealValue } : {}),
        ...(input.salesNotes !== undefined ? { salesNotes: input.salesNotes } : {}),
      },
    });
    if (change) {
      await tx.salesAttributionAudit.create({
        data: {
          caseId: input.caseId,
          previousSalesPersonId: change.previousSalesPersonId,
          newSalesPersonId: change.newSalesPersonId,
          changedById: change.changedById,
          reason: change.reason,
          createdAt: change.at,
        },
      });
    }
    if (existing.salesPersonId && existing.salesPersonId !== input.salesPersonId) {
      const commission = await tx.salesCommission.findUnique({
        where: { caseId: input.caseId },
        select: { financialTransactionId: true },
      });
      await tx.salesCommission.updateMany({
        where: { caseId: input.caseId },
        data: { salesPersonId: input.salesPersonId },
      });
      if (commission?.financialTransactionId) {
        await tx.financialTransaction.update({
          where: { id: commission.financialTransactionId },
          data: { staffId: input.salesPersonId },
        });
      }
    }
  });

  return prisma.case.findUnique({
    where: { id: input.caseId },
    include: { salesPerson: { select: { id: true, name: true, email: true } } },
  });
}

function ledgerStatusForCommission(
  status: SalesCommissionStatus
): "UNPAID" | "APPROVED" | "PAID" | "CANCELLED" {
  if (status === "paid") return "PAID";
  if (status === "approved") return "APPROVED";
  if (status === "cancelled") return "CANCELLED";
  return "UNPAID";
}

export async function upsertCaseCommission(input: {
  caseId: string;
  type: CommissionType;
  ratePercent?: number | null;
  fixedAmount?: number | null;
  customAmount?: number | null;
  status?: SalesCommissionStatus;
  notes?: string | null;
  actorId: string;
}) {
  const existing = await prisma.case.findUnique({
    where: { id: input.caseId },
    include: {
      payments: { select: { amount: true, status: true } },
      financialTransactions: { select: { type: true, amount: true, paymentStatus: true } },
      invoices: { select: { amount: true, status: true, depositAmount: true } },
      quotes: { select: { amount: true, status: true } },
      service: { select: { priceAmount: true, id: true } },
      salesCommission: true,
    },
  });
  if (!existing) throw new Error("Case not found");
  if (!existing.salesPersonId) {
    throw new Error("Assign a salesperson before setting commission");
  }

  const dealValue = resolveDealValue({
    explicit: existing.dealValue,
    invoiced: sumInvoicedAmount(existing.invoices),
    quoted: sumQuotedAmount(existing.quotes),
    servicePrice: existing.service?.priceAmount,
  });
  const paid = sumApprovedCustomerPayments(existing.payments);
  const refunds = sumRefunds(existing.financialTransactions);
  const amount = computeCommissionSatang({
    type: input.type,
    dealValue,
    paid,
    refunds,
    ratePercent: input.ratePercent,
    fixedAmount: input.fixedAmount,
    customAmount: input.customAmount,
  });
  const effectiveStatus: SalesCommissionStatus =
    input.type === "none" ? "cancelled" : (input.status ?? existing.salesCommission?.status ?? "pending");
  const rate =
    input.type === "percent_of_deal" || input.type === "percent_of_collected"
      ? new Prisma.Decimal((input.ratePercent ?? 0).toFixed(4))
      : null;
  const commissionType = input.type as SalesCommissionType;
  const clearLedger = input.type === "none" || amount === 0;

  await prisma.$transaction(async (tx) => {
    const paymentStatus = ledgerStatusForCommission(effectiveStatus);
    let financialTransactionId = existing.salesCommission?.financialTransactionId ?? null;

    if (clearLedger) {
      if (financialTransactionId) {
        await tx.financialTransaction.update({
          where: { id: financialTransactionId },
          data: {
            paymentStatus: "CANCELLED",
            cancelledAt: new Date(),
            cancelledById: input.actorId,
            amount: 0,
          },
        });
      }
    } else if (financialTransactionId) {
      await tx.financialTransaction.update({
        where: { id: financialTransactionId },
        data: {
          amount,
          staffId: existing.salesPersonId,
          paymentStatus,
          category: SALES_COMMISSION_CATEGORY,
          paidAt: effectiveStatus === "paid" ? (existing.salesCommission?.paidAt ?? new Date()) : null,
          cancelledAt: null,
          cancelledById: null,
          description: "Sales commission",
        },
      });
    } else {
      const created = await tx.financialTransaction.create({
        data: {
          caseId: existing.id,
          clientId: existing.userId,
          staffId: existing.salesPersonId,
          serviceId: existing.serviceId,
          type: "CASE_EXPENSE",
          category: SALES_COMMISSION_CATEGORY,
          description: "Sales commission",
          amount,
          currency: "THB",
          transactionDate: existing.closedAt ?? new Date(),
          paymentStatus,
          paidAt: effectiveStatus === "paid" ? new Date() : null,
          createdById: input.actorId,
          notes: input.notes ?? null,
        },
      });
      financialTransactionId = created.id;
    }

    await tx.salesCommission.upsert({
      where: { caseId: existing.id },
      create: {
        caseId: existing.id,
        salesPersonId: existing.salesPersonId!,
        commissionType,
        ratePercent: rate,
        amount: input.type === "none" ? 0 : amount,
        status: effectiveStatus,
        paidAt: effectiveStatus === "paid" ? new Date() : null,
        notes: input.notes ?? null,
        financialTransactionId,
      },
      update: {
        salesPersonId: existing.salesPersonId!,
        commissionType,
        ratePercent: rate,
        amount: input.type === "none" ? 0 : amount,
        status: effectiveStatus,
        paidAt: effectiveStatus === "paid" ? (existing.salesCommission?.paidAt ?? new Date()) : null,
        notes: input.notes ?? null,
        financialTransactionId,
      },
    });
  });
}

export async function listAttributionAudits(caseId: string) {
  return prisma.salesAttributionAudit.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
    include: {
      previousSalesPerson: { select: { id: true, name: true, email: true } },
      newSalesPerson: { select: { id: true, name: true, email: true } },
      changedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getCaseSalesDetail(caseId: string) {
  const row = await prisma.case.findUnique({
    where: { id: caseId },
    include: dealInclude,
  });
  if (!row) return null;
  const audits = await listAttributionAudits(caseId);
  return {
    deal: mapCaseToSalesDeal(row),
    salesNotes: row.salesNotes,
    audits,
    closedAt: row.closedAt,
    dealValue: row.dealValue,
    commissionRatePercent: row.salesCommission?.ratePercent?.toString() ?? null,
  };
}

export async function upsertSalesTarget(input: {
  salesPersonId: string;
  period: "monthly" | "quarterly" | "annual";
  periodKey: string;
  targetAmount: number;
}) {
  await loadEligibleSalesperson(input.salesPersonId);
  return prisma.salesTarget.upsert({
    where: {
      salesPersonId_period_periodKey: {
        salesPersonId: input.salesPersonId,
        period: input.period,
        periodKey: input.periodKey,
      },
    },
    create: input,
    update: { targetAmount: input.targetAmount },
  });
}

export async function getSalesTarget(
  salesPersonId: string,
  period: "monthly" | "quarterly" | "annual",
  periodKey: string
) {
  return prisma.salesTarget.findUnique({
    where: {
      salesPersonId_period_periodKey: { salesPersonId, period, periodKey },
    },
  });
}
