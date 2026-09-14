/**
 * Server-side financial summary services.
 * All profit figures are derived from Payment + FinancialTransaction — never trusted from the client.
 */

import { prisma } from "@/lib/db";
import {
  computeBusinessFinancialSummary,
  computeCaseFinancialSummary,
  daysOverdue,
  receivableStatus,
  type BusinessFinancialSummary,
  type CaseFinancialSummary,
} from "./calculations";
import { bangkokDateKey, monthKeysInRange, type DateRange } from "./dates";
import { sumSatang } from "./money";

const ACTIVE_TX = {
  paymentStatus: { not: "CANCELLED" as const },
};

export async function getCaseFinancialSummary(
  caseId: string
): Promise<CaseFinancialSummary | null> {
  const caseRow = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      payments: { select: { amount: true, status: true } },
      invoices: { select: { amount: true, status: true, depositAmount: true } },
      quotes: { select: { amount: true, status: true } },
      financialTransactions: {
        select: { type: true, amount: true, paymentStatus: true },
      },
    },
  });
  if (!caseRow) return null;

  return computeCaseFinancialSummary({
    payments: caseRow.payments,
    invoices: caseRow.invoices,
    quotes: caseRow.quotes,
    transactions: caseRow.financialTransactions,
  });
}

export async function getFinancialSummary(range: DateRange): Promise<BusinessFinancialSummary> {
  const [payments, transactions, ar, ap] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "approved",
        OR: [
          { approvedAt: { gte: range.start, lte: range.end } },
          { approvedAt: null, submittedAt: { gte: range.start, lte: range.end } },
        ],
      },
      select: { amount: true },
    }),
    prisma.financialTransaction.findMany({
      where: {
        transactionDate: { gte: range.start, lte: range.end },
        ...ACTIVE_TX,
      },
      select: { type: true, amount: true, paymentStatus: true },
    }),
    getAccountsReceivableTotal(),
    getAccountsPayableTotal(),
  ]);

  return computeBusinessFinancialSummary({
    paidCustomerRevenue: sumSatang(payments.map((p) => p.amount)),
    transactions,
    accountsReceivable: ar,
    accountsPayable: ap,
  });
}

export async function getAccountsReceivableTotal(): Promise<number> {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["unpaid", "pending_verification"] },
    },
    include: {
      payments: { where: { status: "approved" }, select: { amount: true } },
    },
  });
  return sumSatang(
    invoices.map((inv) => {
      const paid = sumSatang(inv.payments.map((p) => p.amount));
      return Math.max(0, inv.amount - paid);
    })
  );
}

export async function getAccountsPayableTotal(): Promise<number> {
  const rows = await prisma.financialTransaction.findMany({
    where: {
      paymentStatus: { in: ["UNPAID", "APPROVED"] },
      type: { in: ["STAFF_PAYMENT", "CASE_EXPENSE", "OPERATING_EXPENSE", "OTHER_EXPENSE"] },
    },
    select: { amount: true },
  });
  return sumSatang(rows.map((r) => r.amount));
}

export type MonthlySeriesPoint = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export async function getMonthlyFinancialSeries(range: DateRange): Promise<MonthlySeriesPoint[]> {
  const months = monthKeysInRange(range.start, range.end);
  const [payments, transactions] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "approved",
        OR: [
          { approvedAt: { gte: range.start, lte: range.end } },
          { approvedAt: null, submittedAt: { gte: range.start, lte: range.end } },
        ],
      },
      select: { amount: true, approvedAt: true, submittedAt: true },
    }),
    prisma.financialTransaction.findMany({
      where: {
        transactionDate: { gte: range.start, lte: range.end },
        ...ACTIVE_TX,
      },
      select: {
        type: true,
        amount: true,
        paymentStatus: true,
        transactionDate: true,
      },
    }),
  ]);

  return months.map((month) => {
    const revenue =
      sumSatang(
        payments
          .filter((p) => {
            const d = p.approvedAt ?? p.submittedAt;
            return bangkokDateKey(d).startsWith(month);
          })
          .map((p) => p.amount)
      ) +
      sumSatang(
        transactions
          .filter(
            (t) =>
              (t.type === "REVENUE" || t.type === "OTHER_INCOME") &&
              bangkokDateKey(t.transactionDate).startsWith(month)
          )
          .map((t) => t.amount)
      );

    const refunds = sumSatang(
      transactions
        .filter(
          (t) =>
            t.type === "REFUND" && bangkokDateKey(t.transactionDate).startsWith(month)
        )
        .map((t) => t.amount)
    );

    const expenses = sumSatang(
      transactions
        .filter(
          (t) =>
            ["STAFF_PAYMENT", "CASE_EXPENSE", "OPERATING_EXPENSE", "OTHER_EXPENSE"].includes(
              t.type
            ) && bangkokDateKey(t.transactionDate).startsWith(month)
        )
        .map((t) => t.amount)
    );

    const netRevenue = revenue - refunds;
    return {
      month,
      revenue: netRevenue,
      expenses,
      profit: netRevenue - expenses,
    };
  });
}

export type ServiceProfitabilityRow = {
  serviceId: string;
  serviceName: string;
  jobs: number;
  revenue: number;
  directCosts: number;
  profit: number;
  margin: number;
};

export async function getServiceProfitability(range: DateRange): Promise<ServiceProfitabilityRow[]> {
  const cases = await prisma.case.findMany({
    where: {
      createdAt: { gte: range.start, lte: range.end },
    },
    include: {
      service: { select: { id: true, name: true } },
      payments: { select: { amount: true, status: true } },
      invoices: { select: { amount: true, status: true, depositAmount: true } },
      quotes: { select: { amount: true, status: true } },
      financialTransactions: {
        select: { type: true, amount: true, paymentStatus: true },
      },
    },
  });

  const byService = new Map<string, ServiceProfitabilityRow>();

  for (const c of cases) {
    const summary = computeCaseFinancialSummary({
      payments: c.payments,
      invoices: c.invoices,
      quotes: c.quotes,
      transactions: c.financialTransactions,
    });
    const existing = byService.get(c.serviceId) ?? {
      serviceId: c.serviceId,
      serviceName: c.service.name,
      jobs: 0,
      revenue: 0,
      directCosts: 0,
      profit: 0,
      margin: 0,
    };
    existing.jobs += 1;
    existing.revenue += summary.netRevenue;
    existing.directCosts += summary.totalDirectCosts;
    existing.profit += summary.grossProfit;
    byService.set(c.serviceId, existing);
  }

  return Array.from(byService.values())
    .map((row) => ({
      ...row,
      margin:
        row.revenue > 0
          ? Math.round((row.profit / row.revenue) * 10000) / 100
          : 0,
    }))
    .sort((a, b) => b.profit - a.profit);
}

export type StaffProfitabilityRow = {
  staffId: string;
  staffName: string;
  jobs: number;
  revenueGenerated: number;
  staffCost: number;
  otherCosts: number;
  profitContribution: number;
};

export async function getStaffProfitability(range: DateRange): Promise<StaffProfitabilityRow[]> {
  const assignments = await prisma.staffAssignment.findMany({
    where: {
      assignedAt: { gte: range.start, lte: range.end },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      case: {
        include: {
          payments: { select: { amount: true, status: true } },
          invoices: { select: { amount: true, status: true, depositAmount: true } },
          quotes: { select: { amount: true, status: true } },
          financialTransactions: {
            select: { type: true, amount: true, paymentStatus: true, staffId: true },
          },
          staffAssignments: { select: { userId: true } },
        },
      },
    },
  });

  const byStaff = new Map<string, StaffProfitabilityRow>();

  for (const a of assignments) {
    const summary = computeCaseFinancialSummary({
      payments: a.case.payments,
      invoices: a.case.invoices,
      quotes: a.case.quotes,
      transactions: a.case.financialTransactions,
    });
    const staffShare =
      a.case.staffAssignments.length > 0 ? 1 / a.case.staffAssignments.length : 1;
    // Attribute shared case revenue proportionally; staff cost is only their payments.
    const staffCost = sumSatang(
      a.case.financialTransactions
        .filter(
          (t) =>
            t.type === "STAFF_PAYMENT" &&
            t.staffId === a.userId &&
            t.paymentStatus !== "CANCELLED"
        )
        .map((t) => t.amount)
    );
    const otherCosts = Math.round(summary.otherDirectCosts * staffShare);
    const revenueGenerated = Math.round(summary.netRevenue * staffShare);
    const existing = byStaff.get(a.userId) ?? {
      staffId: a.userId,
      staffName: a.user.name ?? a.user.email,
      jobs: 0,
      revenueGenerated: 0,
      staffCost: 0,
      otherCosts: 0,
      profitContribution: 0,
    };
    existing.jobs += 1;
    existing.revenueGenerated += revenueGenerated;
    existing.staffCost += staffCost;
    existing.otherCosts += otherCosts;
    existing.profitContribution += revenueGenerated - staffCost - otherCosts;
    byStaff.set(a.userId, existing);
  }

  return Array.from(byStaff.values()).sort(
    (x, y) => y.profitContribution - x.profitContribution
  );
}

export type ReceivableRow = {
  invoiceId: string;
  customerName: string;
  caseId: string;
  caseNumber: string;
  total: number;
  paid: number;
  outstanding: number;
  dueDate: Date | null;
  daysOverdue: number;
  status: ReturnType<typeof receivableStatus>;
  currency: string;
};

export async function listReceivables(): Promise<ReceivableRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["unpaid", "pending_verification", "paid"] } },
    include: {
      user: { select: { name: true, email: true } },
      case: { select: { id: true, caseNumber: true, guestName: true, guestEmail: true } },
      payments: { where: { status: "approved" }, select: { amount: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  return invoices
    .map((inv) => {
      const paid = sumSatang(inv.payments.map((p) => p.amount));
      const outstanding = Math.max(0, inv.amount - paid);
      const status = receivableStatus(outstanding, inv.dueDate, now);
      return {
        invoiceId: inv.id,
        customerName:
          inv.user?.name ??
          inv.user?.email ??
          inv.case.guestName ??
          inv.case.guestEmail ??
          "Unknown",
        caseId: inv.case.id,
        caseNumber: inv.case.caseNumber,
        total: inv.amount,
        paid,
        outstanding,
        dueDate: inv.dueDate,
        daysOverdue: daysOverdue(inv.dueDate, now),
        status,
        currency: inv.currency,
      };
    })
    .filter((r) => r.status !== "PAID" || r.outstanding > 0)
    .filter((r) => r.outstanding > 0 || r.status === "PAID");
}

export type PayableRow = {
  id: string;
  payee: string;
  caseId: string | null;
  caseNumber: string | null;
  category: string;
  type: string;
  amount: number;
  dueDate: Date | null;
  status: string;
  currency: string;
};

export async function listPayables(filters?: {
  status?: string;
}): Promise<PayableRow[]> {
  const rows = await prisma.financialTransaction.findMany({
    where: {
      type: { in: ["STAFF_PAYMENT", "CASE_EXPENSE", "OPERATING_EXPENSE", "OTHER_EXPENSE"] },
      paymentStatus: filters?.status
        ? (filters.status as "UNPAID" | "APPROVED" | "PAID" | "CANCELLED")
        : { in: ["UNPAID", "APPROVED"] },
    },
    include: {
      staff: { select: { name: true, email: true } },
      case: { select: { id: true, caseNumber: true } },
    },
    orderBy: [{ dueDate: "asc" }, { transactionDate: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    payee: r.vendor ?? r.staff?.name ?? r.staff?.email ?? "—",
    caseId: r.case?.id ?? null,
    caseNumber: r.case?.caseNumber ?? null,
    category: r.category,
    type: r.type,
    amount: r.amount,
    dueDate: r.dueDate,
    status: r.paymentStatus,
    currency: r.currency,
  }));
}

export type CaseProfitabilityRow = {
  caseId: string;
  caseNumber: string;
  customerName: string;
  serviceName: string;
  status: string;
  revenue: number;
  staffCosts: number;
  otherCosts: number;
  profit: number;
  margin: number;
};

export async function getCaseProfitability(range: DateRange): Promise<CaseProfitabilityRow[]> {
  const cases = await prisma.case.findMany({
    where: { createdAt: { gte: range.start, lte: range.end } },
    include: {
      service: { select: { name: true } },
      user: { select: { name: true, email: true } },
      payments: { select: { amount: true, status: true } },
      invoices: { select: { amount: true, status: true, depositAmount: true } },
      quotes: { select: { amount: true, status: true } },
      financialTransactions: {
        select: { type: true, amount: true, paymentStatus: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return cases.map((c) => {
    const s = computeCaseFinancialSummary({
      payments: c.payments,
      invoices: c.invoices,
      quotes: c.quotes,
      transactions: c.financialTransactions,
    });
    return {
      caseId: c.id,
      caseNumber: c.caseNumber,
      customerName: c.user?.name ?? c.user?.email ?? c.guestName ?? c.guestEmail ?? "—",
      serviceName: c.service.name,
      status: c.status,
      revenue: s.netRevenue,
      staffCosts: s.staffCosts,
      otherCosts: s.otherDirectCosts,
      profit: s.grossProfit,
      margin: s.grossMargin,
    };
  });
}
