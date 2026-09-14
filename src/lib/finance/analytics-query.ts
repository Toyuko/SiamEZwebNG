/**
 * Server-side analytics data loader — filters in SQL, aggregates via shared pure functions.
 */

import type { CaseStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  computeAnalyticsKpis,
  groupAnalytics,
  projectPeriodRevenue,
  compareMetric,
  type AnalyticsFilters,
  type AnalyticsGroupBy,
  type AnalyticsBucket,
  type AnalyticsKpiSet,
  type AnalyticsPaymentRow,
  type AnalyticsTxRow,
  type AnalyticsCaseRow,
  type PeriodComparison,
  type RevenueProjection,
} from "./analytics";
import {
  previousMonthAlignedRange,
  previousPeriodRange,
  previousYearAlignedRange,
  type DateRange,
} from "./dates";
import { getAccountsPayableTotal, getAccountsReceivableTotal } from "./summaries";

export type CompareMode =
  | "none"
  | "previous_period"
  | "previous_month"
  | "previous_year"
  | "custom";

async function loadAnalyticsSource(
  range: DateRange,
  filters: AnalyticsFilters
): Promise<{
  payments: AnalyticsPaymentRow[];
  transactions: AnalyticsTxRow[];
  cases: AnalyticsCaseRow[];
}> {
  const caseWhere: Prisma.CaseWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.serviceId) caseWhere.serviceId = filters.serviceId;
  if (filters.clientId) caseWhere.userId = filters.clientId;
  if (filters.caseStatus) caseWhere.status = filters.caseStatus as CaseStatus;
  if (filters.staffId) {
    caseWhere.staffAssignments = { some: { userId: filters.staffId } };
  }

  const paymentWhere: Prisma.PaymentWhereInput = {
    status: "approved",
    OR: [
      { approvedAt: { gte: range.start, lte: range.end } },
      { approvedAt: null, submittedAt: { gte: range.start, lte: range.end } },
    ],
  };
  if (filters.paymentMethod) {
    paymentWhere.method = filters.paymentMethod as PaymentMethod;
  }
  const paymentCase: Prisma.CaseWhereInput = {};
  if (filters.serviceId) paymentCase.serviceId = filters.serviceId;
  if (filters.clientId) paymentCase.userId = filters.clientId;
  if (filters.caseStatus) paymentCase.status = filters.caseStatus as CaseStatus;
  if (filters.staffId) {
    paymentCase.staffAssignments = { some: { userId: filters.staffId } };
  }
  if (Object.keys(paymentCase).length > 0) {
    paymentWhere.case = paymentCase;
  }

  const txWhere: Prisma.FinancialTransactionWhereInput = {
    transactionDate: { gte: range.start, lte: range.end },
    paymentStatus: { not: "CANCELLED" },
  };
  if (filters.serviceId) txWhere.serviceId = filters.serviceId;
  if (filters.clientId) txWhere.clientId = filters.clientId;

  const txAnd: Prisma.FinancialTransactionWhereInput[] = [];
  if (filters.staffId) {
    txAnd.push({
      OR: [
        { staffId: filters.staffId },
        { case: { staffAssignments: { some: { userId: filters.staffId } } } },
      ],
    });
  }
  if (filters.caseStatus) {
    txAnd.push({ case: { status: filters.caseStatus as CaseStatus } });
  }
  if (txAnd.length > 0) {
    txWhere.AND = txAnd;
  }

  const [paymentsRaw, txsRaw, casesRaw] = await Promise.all([
    prisma.payment.findMany({
      where: paymentWhere,
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        approvedAt: true,
        submittedAt: true,
        caseId: true,
        case: {
          select: {
            serviceId: true,
            userId: true,
            status: true,
            caseNumber: true,
            guestName: true,
            guestEmail: true,
            service: { select: { name: true } },
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.financialTransaction.findMany({
      where: txWhere,
      select: {
        id: true,
        type: true,
        amount: true,
        paymentStatus: true,
        category: true,
        description: true,
        paymentMethod: true,
        transactionDate: true,
        caseId: true,
        staffId: true,
        serviceId: true,
        clientId: true,
        case: {
          select: {
            status: true,
            caseNumber: true,
            guestName: true,
            guestEmail: true,
          },
        },
        service: { select: { name: true } },
        staff: { select: { name: true, email: true } },
        client: { select: { name: true, email: true } },
      },
    }),
    prisma.case.findMany({
      where: caseWhere,
      select: {
        id: true,
        caseNumber: true,
        serviceId: true,
        userId: true,
        status: true,
        createdAt: true,
        guestName: true,
        guestEmail: true,
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
        staffAssignments: { select: { userId: true } },
      },
    }),
  ]);

  const payments: AnalyticsPaymentRow[] = paymentsRaw.map((p) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    method: p.method,
    at: p.approvedAt ?? p.submittedAt,
    caseId: p.caseId,
    serviceId: p.case.serviceId,
    clientId: p.case.userId,
    caseStatus: p.case.status,
    caseNumber: p.case.caseNumber,
    serviceName: p.case.service.name,
    clientName:
      p.case.user?.name ??
      p.case.user?.email ??
      p.case.guestName ??
      p.case.guestEmail ??
      "—",
  }));

  const transactions: AnalyticsTxRow[] = txsRaw.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    paymentStatus: t.paymentStatus,
    category: t.category,
    description: t.description,
    method: t.paymentMethod,
    at: t.transactionDate,
    caseId: t.caseId,
    staffId: t.staffId,
    serviceId: t.serviceId,
    clientId: t.clientId,
    caseStatus: t.case?.status ?? null,
    caseNumber: t.case?.caseNumber ?? null,
    serviceName: t.service?.name ?? null,
    staffName: t.staff?.name ?? t.staff?.email ?? null,
    clientName:
      t.client?.name ??
      t.client?.email ??
      t.case?.guestName ??
      t.case?.guestEmail ??
      null,
  }));

  const cases: AnalyticsCaseRow[] = casesRaw.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    serviceId: c.serviceId,
    serviceName: c.service.name,
    clientId: c.userId,
    clientName:
      c.user?.name ?? c.user?.email ?? c.guestName ?? c.guestEmail ?? "—",
    status: c.status,
    createdAt: c.createdAt,
    staffIds: c.staffAssignments.map((a) => a.userId),
  }));

  return { payments, transactions, cases };
}

export type AnalyticsResult = {
  range: DateRange;
  groupBy: AnalyticsGroupBy;
  filters: AnalyticsFilters;
  kpis: AnalyticsKpiSet;
  buckets: AnalyticsBucket[];
  comparison: {
    mode: CompareMode;
    range: DateRange | null;
    kpis: AnalyticsKpiSet | null;
    deltas: Partial<Record<keyof AnalyticsKpiSet, PeriodComparison>>;
  } | null;
  projection: RevenueProjection | null;
};

export async function runFinancialAnalytics(input: {
  range: DateRange;
  groupBy: AnalyticsGroupBy;
  filters?: AnalyticsFilters;
  compare?: CompareMode;
  compareRange?: DateRange | null;
  includeProjection?: boolean;
}): Promise<AnalyticsResult> {
  const filters = input.filters ?? {};
  const [source, ar, ap] = await Promise.all([
    loadAnalyticsSource(input.range, filters),
    getAccountsReceivableTotal(),
    getAccountsPayableTotal(),
  ]);

  const kpis = computeAnalyticsKpis({
    ...source,
    accountsReceivable: ar,
    accountsPayable: ap,
  });

  const buckets = groupAnalytics({
    groupBy: input.groupBy,
    payments: source.payments,
    transactions: source.transactions,
    cases: source.cases,
    filters,
  });

  let comparison: AnalyticsResult["comparison"] = null;
  const mode = input.compare ?? "none";
  if (mode !== "none") {
    let cmpRange: DateRange;
    if (mode === "custom" && input.compareRange) {
      cmpRange = input.compareRange;
    } else if (mode === "previous_month") {
      cmpRange = previousMonthAlignedRange(input.range);
    } else if (mode === "previous_year") {
      cmpRange = previousYearAlignedRange(input.range);
    } else {
      cmpRange = previousPeriodRange(input.range);
    }
    const cmpSource = await loadAnalyticsSource(cmpRange, filters);
    const cmpKpis = computeAnalyticsKpis({
      ...cmpSource,
      accountsReceivable: ar,
      accountsPayable: ap,
    });
    const keys: (keyof AnalyticsKpiSet)[] = [
      "revenue",
      "netRevenue",
      "grossProfit",
      "netProfit",
      "staffCosts",
      "operatingExpenses",
      "jobs",
      "avgJobValue",
      "grossMargin",
      "netMargin",
    ];
    const deltas: Partial<Record<keyof AnalyticsKpiSet, PeriodComparison>> = {};
    for (const k of keys) {
      deltas[k] = compareMetric(kpis[k] as number, cmpKpis[k] as number);
    }
    comparison = { mode, range: cmpRange, kpis: cmpKpis, deltas };
  }

  const projection = input.includeProjection
    ? projectPeriodRevenue({
        currentRevenue: kpis.netRevenue,
        range: input.range,
      })
    : null;

  return {
    range: input.range,
    groupBy: input.groupBy,
    filters,
    kpis,
    buckets,
    comparison,
    projection,
  };
}

export type DrillDownKind =
  | "revenue"
  | "staffCosts"
  | "caseExpenses"
  | "operatingExpenses"
  | "refunds"
  | "profit";

export async function getAnalyticsDrillDown(input: {
  range: DateRange;
  filters?: AnalyticsFilters;
  kind: DrillDownKind;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: Array<{
    id: string;
    date: string;
    source: "payment" | "transaction";
    type: string;
    description: string;
    caseNumber: string | null;
    caseId: string | null;
    amount: number;
    method: string | null;
    status: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}> {
  const filters = input.filters ?? {};
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 50;
  const source = await loadAnalyticsSource(input.range, filters);

  type Row = {
    id: string;
    date: string;
    source: "payment" | "transaction";
    type: string;
    description: string;
    caseNumber: string | null;
    caseId: string | null;
    amount: number;
    method: string | null;
    status: string;
    sortAt: number;
  };

  const rows: Row[] = [];

  if (input.kind === "revenue" || input.kind === "profit") {
    for (const p of source.payments) {
      if (p.status !== "approved") continue;
      rows.push({
        id: p.id,
        date: p.at.toISOString().slice(0, 10),
        source: "payment",
        type: "CUSTOMER_PAYMENT",
        description: `Payment · ${p.serviceName ?? "Service"}`,
        caseNumber: p.caseNumber ?? null,
        caseId: p.caseId,
        amount: p.amount,
        method: p.method,
        status: p.status,
        sortAt: p.at.getTime(),
      });
    }
    for (const t of source.transactions) {
      if (t.type === "REVENUE" || t.type === "OTHER_INCOME") {
        rows.push({
          id: t.id,
          date: t.at.toISOString().slice(0, 10),
          source: "transaction",
          type: t.type,
          description: t.description,
          caseNumber: t.caseNumber ?? null,
          caseId: t.caseId,
          amount: t.amount,
          method: t.method ?? null,
          status: t.paymentStatus,
          sortAt: t.at.getTime(),
        });
      }
    }
  }

  if (input.kind === "refunds" || input.kind === "profit") {
    for (const t of source.transactions) {
      if (t.type !== "REFUND") continue;
      rows.push({
        id: t.id,
        date: t.at.toISOString().slice(0, 10),
        source: "transaction",
        type: t.type,
        description: t.description,
        caseNumber: t.caseNumber ?? null,
        caseId: t.caseId,
        amount: -t.amount,
        method: t.method ?? null,
        status: t.paymentStatus,
        sortAt: t.at.getTime(),
      });
    }
  }

  if (input.kind === "staffCosts" || input.kind === "profit") {
    for (const t of source.transactions) {
      if (t.type !== "STAFF_PAYMENT") continue;
      rows.push({
        id: t.id,
        date: t.at.toISOString().slice(0, 10),
        source: "transaction",
        type: t.type,
        description: `${t.description}${t.staffName ? ` · ${t.staffName}` : ""}`,
        caseNumber: t.caseNumber ?? null,
        caseId: t.caseId,
        amount: -t.amount,
        method: t.method ?? null,
        status: t.paymentStatus,
        sortAt: t.at.getTime(),
      });
    }
  }

  if (input.kind === "caseExpenses" || input.kind === "profit") {
    for (const t of source.transactions) {
      if (t.type !== "CASE_EXPENSE" && t.type !== "OTHER_EXPENSE") continue;
      rows.push({
        id: t.id,
        date: t.at.toISOString().slice(0, 10),
        source: "transaction",
        type: t.type,
        description: t.description,
        caseNumber: t.caseNumber ?? null,
        caseId: t.caseId,
        amount: -t.amount,
        method: t.method ?? null,
        status: t.paymentStatus,
        sortAt: t.at.getTime(),
      });
    }
  }

  if (input.kind === "operatingExpenses" || input.kind === "profit") {
    for (const t of source.transactions) {
      if (t.type !== "OPERATING_EXPENSE") continue;
      rows.push({
        id: t.id,
        date: t.at.toISOString().slice(0, 10),
        source: "transaction",
        type: t.type,
        description: t.description,
        caseNumber: t.caseNumber ?? null,
        caseId: t.caseId,
        amount: -t.amount,
        method: t.method ?? null,
        status: t.paymentStatus,
        sortAt: t.at.getTime(),
      });
    }
  }

  rows.sort((a, b) => b.sortAt - a.sortAt);
  const total = rows.length;
  const slice = rows.slice((page - 1) * pageSize, page * pageSize).map((r) => ({
    id: r.id,
    date: r.date,
    source: r.source,
    type: r.type,
    description: r.description,
    caseNumber: r.caseNumber,
    caseId: r.caseId,
    amount: r.amount,
    method: r.method,
    status: r.status,
  }));

  return { rows: slice, total, page, pageSize };
}
