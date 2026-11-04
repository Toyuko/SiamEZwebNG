/**
 * Database reads for collected revenue.
 * Uses the same approved-payment date rule as the financial dashboard:
 * approval time, otherwise submission time. Never the booking creation date.
 */

import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/finance/dates";
import {
  bangkokMonthRange,
  buildFinanceStatement,
  resolveStaffName,
  type FinanceStatement,
  type LedgerFact,
  type PaymentFact,
  type StaffCandidate,
  type StaffResolution,
} from "@/lib/finance/collected";
import { approvedPageMatchesDatabase, reconcileTotals, type CommissionFact, type DealFact, type ExpenseFact } from "@/lib/finance/picture";
import { readEveryPage } from "@/lib/finance/read-all";

export { bangkokMonthRange };

export type CollectedFilters = {
  salesPersonId?: string | null;
  serviceQuery?: string | null;
};

export type AuditedStatement = FinanceStatement & { complete: boolean; auditNote: string };

function paymentWindow(range: DateRange) {
  return {
    OR: [
      { approvedAt: { gte: range.start, lte: range.end } },
      { approvedAt: null, submittedAt: { gte: range.start, lte: range.end } },
    ],
  };
}

const PAYMENT_SELECT = {
  id: true,
  amount: true,
  status: true,
  method: true,
  kind: true,
  approvedAt: true,
  submittedAt: true,
  caseId: true,
  case: {
    select: {
      caseNumber: true,
      guestName: true,
      otherServiceName: true,
      salesPersonId: true,
      service: { select: { name: true } },
      user: { select: { name: true, email: true } },
      salesPerson: { select: { name: true, email: true } },
    },
  },
} as const;

function mapPayment(payment: {
  id: string;
  amount: number;
  status: string;
  method: string;
  kind: string;
  approvedAt: Date | null;
  submittedAt: Date;
  caseId: string;
  case: {
    caseNumber: string;
    guestName: string | null;
    otherServiceName: string | null;
    salesPersonId: string | null;
    service: { name: string } | null;
    user: { name: string | null; email: string } | null;
    salesPerson: { name: string | null; email: string } | null;
  };
}): PaymentFact {
  return {
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    method: payment.method,
    kind: payment.kind,
    approvedAt: payment.approvedAt,
    submittedAt: payment.submittedAt,
    caseId: payment.caseId,
    caseNumber: payment.case.caseNumber,
    customerName: payment.case.user?.name || payment.case.guestName || payment.case.user?.email || "Unknown customer",
    serviceName: payment.case.service?.name ?? payment.case.otherServiceName ?? "Unspecified service",
    salesPersonId: payment.case.salesPersonId,
    salesPersonName: payment.case.salesPerson?.name || payment.case.salesPerson?.email || null,
  };
}

async function loadFacts(range: DateRange): Promise<{ payments: PaymentFact[]; ledger: LedgerFact[]; complete: boolean; auditNote: string }> {
  const [paymentRead, ledgerRead, aggregate] = await Promise.all([
    readEveryPage((cursor, take) =>
      prisma.payment.findMany({
        where: paymentWindow(range),
        orderBy: { id: "asc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: PAYMENT_SELECT,
      }).then((rows) => rows.map(mapPayment))
    ),
    readEveryPage((cursor, take) =>
      prisma.financialTransaction.findMany({
        where: {
          type: { in: ["REFUND", "REVENUE", "OTHER_INCOME"] },
          transactionDate: { gte: range.start, lte: range.end },
        },
        orderBy: { id: "asc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          type: true,
          amount: true,
          paymentStatus: true,
          transactionDate: true,
          relatedPaymentId: true,
          caseId: true,
          case: { select: { caseNumber: true, guestName: true, salesPersonId: true, salesPerson: { select: { name: true, email: true } } } },
          service: { select: { name: true } },
          client: { select: { name: true, email: true } },
        },
      }).then((rows) => rows.flatMap((row) => {
        if (row.type !== "REFUND" && row.type !== "REVENUE" && row.type !== "OTHER_INCOME") return [];
        const mapped: LedgerFact = {
          id: row.id,
          type: row.type,
          amount: row.amount,
          paymentStatus: row.paymentStatus,
          transactionDate: row.transactionDate,
          relatedPaymentId: row.relatedPaymentId,
          caseId: row.caseId,
          caseNumber: row.case?.caseNumber ?? null,
          customerName: row.client?.name || row.case?.guestName || row.client?.email || "Manual ledger entry",
          serviceName: row.service?.name ?? "Unspecified service",
          salesPersonId: row.case?.salesPersonId ?? null,
          salesPersonName: row.case?.salesPerson?.name || row.case?.salesPerson?.email || null,
        };
        return [mapped];
      }))
    ),
    prisma.payment.aggregate({
      where: { status: "approved", ...paymentWindow(range) },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const paged = approvedPageMatchesDatabase(paymentRead.rows, range.start, range.end);
  const audit = reconcileTotals({
    complete: paymentRead.complete && ledgerRead.complete,
    queriedCount: paged.count,
    databaseCount: aggregate._count._all,
    queriedSatang: paged.satang,
    databaseSatang: aggregate._sum.amount ?? 0,
  });
  const auditNote = audit.reconciled
    ? `Retrieved ${audit.queriedCount} approved payments (${audit.queriedSatang} satang). That matches the database count and total for the same approval rule.`
    : paymentRead.note ?? ledgerRead.note ?? `Retrieved ${audit.queriedCount} approved payments, while the database reports ${audit.databaseCount}. This result is incomplete.`;
  return {
    payments: paymentRead.rows,
    ledger: ledgerRead.rows,
    complete: audit.reconciled,
    auditNote,
  };
}

export async function getRevenueByDateRange(range: DateRange, filters: CollectedFilters = {}): Promise<AuditedStatement> {
  const facts = await loadFacts(range);
  const statement = buildFinanceStatement({
    payments: facts.payments,
    ledger: facts.ledger,
    start: range.start,
    end: range.end,
    salesPersonId: filters.salesPersonId,
    serviceQuery: filters.serviceQuery,
  });
  return { ...statement, complete: facts.complete, auditNote: facts.auditNote };
}

export async function getRevenueByStaff(staffId: string, range: DateRange, serviceQuery?: string | null): Promise<AuditedStatement> {
  return getRevenueByDateRange(range, { salesPersonId: staffId, serviceQuery });
}

export async function getRevenueByService(range: DateRange, serviceQuery?: string | null): Promise<AuditedStatement> {
  return getRevenueByDateRange(range, { serviceQuery });
}

export async function getMonthlyFinancialSummary(month: number, year: number, filters: CollectedFilters = {}): Promise<AuditedStatement & { label: string; start: Date; end: Date }> {
  const range = bangkokMonthRange(year, month);
  const statement = await getRevenueByDateRange(range, filters);
  return { ...statement, label: range.label, start: range.start, end: range.end };
}

export async function getPaymentTransactionDetails(range: DateRange, filters: CollectedFilters = {}): Promise<AuditedStatement> {
  return getRevenueByDateRange(range, filters);
}

export async function getRevenueComparison(left: DateRange, right: DateRange, filters: CollectedFilters = {}): Promise<{ left: AuditedStatement; right: AuditedStatement; deltaSatang: number; complete: boolean }> {
  const [leftStatement, rightStatement] = await Promise.all([
    getRevenueByDateRange(left, filters),
    getRevenueByDateRange(right, filters),
  ]);
  return {
    left: leftStatement,
    right: rightStatement,
    deltaSatang: leftStatement.grossCollectedSatang - rightStatement.grossCollectedSatang,
    complete: leftStatement.complete && rightStatement.complete,
  };
}

export async function findStaffForRevenue(name: string): Promise<StaffResolution> {
  const read = await readEveryPage((cursor, take) =>
    prisma.user.findMany({
      where: {
        role: { in: ["admin", "staff"] },
        OR: [
          { name: { contains: name, mode: "insensitive" } },
          { email: { startsWith: name, mode: "insensitive" } },
        ],
      },
      orderBy: { id: "asc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, name: true, email: true, active: true },
    })
  );
  if (!read.complete) return { status: "incomplete" };
  const candidates: StaffCandidate[] = read.rows.map((person) => ({
    id: person.id,
    name: person.name,
    email: person.email,
    active: person.active,
  }));
  return resolveStaffName(name, candidates);
}

export async function deliveryPaymentsWithoutCredit(staffId: string, range: DateRange): Promise<number> {
  return prisma.payment.count({
    where: {
      status: "approved",
      OR: [
        { approvedAt: { gte: range.start, lte: range.end } },
        { approvedAt: null, submittedAt: { gte: range.start, lte: range.end } },
      ],
      case: {
        staffAssignments: { some: { userId: staffId } },
        OR: [{ salesPersonId: null }, { salesPersonId: { not: staffId } }],
      },
    },
  });
}

export async function getBusinessExpenses(range: DateRange): Promise<{ rows: ExpenseFact[]; complete: boolean; note: string | null }> {
  const read = await readEveryPage((cursor, take) =>
    prisma.financialTransaction.findMany({
      where: {
        type: { in: ["STAFF_PAYMENT", "CASE_EXPENSE", "OPERATING_EXPENSE", "OTHER_EXPENSE"] },
        transactionDate: { gte: range.start, lte: range.end },
      },
      orderBy: { id: "asc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        type: true,
        amount: true,
        paymentStatus: true,
        transactionDate: true,
        category: true,
        service: { select: { name: true } },
      },
    }).then((rows) => rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      paymentStatus: row.paymentStatus,
      transactionDate: row.transactionDate,
      category: row.category,
      serviceName: row.service?.name ?? "Unspecified service",
    })))
  );
  const databaseCount = await prisma.financialTransaction.count({
    where: {
      type: { in: ["STAFF_PAYMENT", "CASE_EXPENSE", "OPERATING_EXPENSE", "OTHER_EXPENSE"] },
      transactionDate: { gte: range.start, lte: range.end },
    },
  });
  const complete = read.complete && read.rows.length === databaseCount;
  return { rows: read.rows, complete, note: complete ? null : read.note ?? `Retrieved ${read.rows.length} expense rows; the database has ${databaseCount}.` };
}

export async function getStaffCommissions(range: DateRange | null): Promise<{ rows: CommissionFact[]; complete: boolean; note: string | null }> {
  const read = await readEveryPage((cursor, take) =>
    prisma.salesCommission.findMany({
      where: range ? { case: { closedAt: { gte: range.start, lte: range.end } } } : undefined,
      orderBy: { id: "asc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        amount: true,
        status: true,
        paidAt: true,
        salesPersonId: true,
        caseId: true,
        salesPerson: { select: { name: true, email: true } },
        case: { select: { caseNumber: true, closedAt: true } },
      },
    }).then((rows) => rows.map((row) => ({
      id: row.id,
      salesPersonId: row.salesPersonId,
      salesPersonName: row.salesPerson.name || row.salesPerson.email,
      amount: row.amount,
      status: row.status,
      closedAt: row.case.closedAt,
      paidAt: row.paidAt,
      caseId: row.caseId,
      caseNumber: row.case.caseNumber,
    })))
  );
  return { rows: read.rows, complete: read.complete, note: read.note };
}

export async function getClosedDeals(range: DateRange | null, salesPersonId?: string | null): Promise<{ rows: DealFact[]; complete: boolean; note: string | null }> {
  const read = await readEveryPage((cursor, take) =>
    prisma.case.findMany({
      where: {
        ...(salesPersonId ? { salesPersonId } : {}),
        ...(range ? { closedAt: { gte: range.start, lte: range.end } } : { closedAt: { not: null } }),
      },
      orderBy: { id: "asc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        caseNumber: true,
        guestName: true,
        status: true,
        closedAt: true,
        dealValue: true,
        otherServiceName: true,
        salesPersonId: true,
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
        salesPerson: { select: { name: true, email: true } },
      },
    }).then((rows) => rows.map((row) => ({
      id: row.id,
      caseNumber: row.caseNumber,
      customerName: row.user?.name || row.guestName || row.user?.email || "Unknown customer",
      serviceName: row.service?.name ?? row.otherServiceName ?? "Unspecified service",
      salesPersonId: row.salesPersonId,
      salesPersonName: row.salesPerson?.name || row.salesPerson?.email || null,
      status: row.status,
      closedAt: row.closedAt,
      dealValue: row.dealValue,
    })))
  );
  return { rows: read.rows, complete: read.complete, note: read.note };
}

export async function getAttributedBookings(salesPersonId: string): Promise<{ rows: DealFact[]; complete: boolean; note: string | null }> {
  const read = await readEveryPage((cursor, take) =>
    prisma.case.findMany({
      where: { salesPersonId },
      orderBy: { id: "asc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        caseNumber: true,
        guestName: true,
        status: true,
        closedAt: true,
        dealValue: true,
        otherServiceName: true,
        salesPersonId: true,
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
        salesPerson: { select: { name: true, email: true } },
      },
    }).then((rows) => rows.map((row) => ({
      id: row.id,
      caseNumber: row.caseNumber,
      customerName: row.user?.name || row.guestName || row.user?.email || "Unknown customer",
      serviceName: row.service?.name ?? row.otherServiceName ?? "Unspecified service",
      salesPersonId: row.salesPersonId,
      salesPersonName: row.salesPerson?.name || row.salesPerson?.email || null,
      status: row.status,
      closedAt: row.closedAt,
      dealValue: row.dealValue,
    })))
  );
  return { rows: read.rows, complete: read.complete, note: read.note };
}
