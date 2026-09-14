/**
 * Pure financial analytics aggregation — shared by dashboard, reports, and Analytics builder.
 * All amounts are satang integers. Cancelled txs never count.
 */

import {
  computeBusinessFinancialSummary,
  type BusinessFinancialSummary,
  type TxLike,
  type PaymentLike,
} from "./calculations";
import {
  bangkokDateKey,
  bangkokHour,
  bangkokQuarterKey,
  bangkokWeekday,
  bangkokWeekKey,
  bangkokYearKey,
  bangkokDayCount,
  type DateRange,
} from "./dates";
import { roundMargin, sumSatang, type MoneySatang } from "./money";

export type AnalyticsGroupBy =
  | "hour"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "day_of_week"
  | "service"
  | "staff"
  | "case"
  | "client"
  | "expense_category"
  | "revenue_category"
  | "payment_method";

export type AnalyticsMetric =
  | "revenue"
  | "refunds"
  | "netRevenue"
  | "staffCosts"
  | "caseExpenses"
  | "operatingExpenses"
  | "directCosts"
  | "grossProfit"
  | "netProfit"
  | "grossMargin"
  | "netMargin"
  | "jobs"
  | "avgJobValue"
  | "avgProfit"
  | "staffCostPct"
  | "operatingCostPct"
  | "paymentCount";

export const ALL_ANALYTICS_METRICS: AnalyticsMetric[] = [
  "revenue",
  "refunds",
  "netRevenue",
  "staffCosts",
  "caseExpenses",
  "operatingExpenses",
  "directCosts",
  "grossProfit",
  "netProfit",
  "grossMargin",
  "netMargin",
  "jobs",
  "avgJobValue",
  "avgProfit",
  "staffCostPct",
  "operatingCostPct",
  "paymentCount",
];

export const DEFAULT_ANALYTICS_METRICS: AnalyticsMetric[] = [
  "netRevenue",
  "staffCosts",
  "operatingExpenses",
  "grossProfit",
  "netProfit",
  "jobs",
];

export type AnalyticsPaymentRow = PaymentLike & {
  id: string;
  method: string;
  at: Date;
  caseId: string | null;
  serviceId: string | null;
  clientId: string | null;
  caseStatus?: string | null;
  caseNumber?: string | null;
  serviceName?: string | null;
  clientName?: string | null;
};

export type AnalyticsTxRow = TxLike & {
  id: string;
  at: Date;
  category: string;
  description: string;
  method?: string | null;
  caseId: string | null;
  staffId: string | null;
  serviceId: string | null;
  clientId: string | null;
  caseStatus?: string | null;
  caseNumber?: string | null;
  serviceName?: string | null;
  staffName?: string | null;
  clientName?: string | null;
};

export type AnalyticsCaseRow = {
  id: string;
  caseNumber: string;
  serviceId: string;
  serviceName: string;
  clientId: string | null;
  clientName: string;
  status: string;
  createdAt: Date;
  staffIds: string[];
};

export type AnalyticsBucket = {
  key: string;
  label: string;
  revenue: MoneySatang;
  refunds: MoneySatang;
  netRevenue: MoneySatang;
  staffCosts: MoneySatang;
  caseExpenses: MoneySatang;
  operatingExpenses: MoneySatang;
  directCosts: MoneySatang;
  grossProfit: MoneySatang;
  netProfit: MoneySatang;
  grossMargin: number;
  netMargin: number;
  jobs: number;
  avgJobValue: number;
  avgProfit: number;
  staffCostPct: number;
  operatingCostPct: number;
  paymentCount: number;
};

export type AnalyticsFilters = {
  serviceId?: string | null;
  staffId?: string | null;
  paymentMethod?: string | null;
  caseStatus?: string | null;
  clientId?: string | null;
};

export type AnalyticsKpiSet = BusinessFinancialSummary & {
  jobs: number;
  avgJobValue: number;
  avgProfit: number;
  staffCostPct: number;
  operatingCostPct: number;
  paymentCount: number;
};

export type PeriodComparison = {
  current: number;
  previous: number;
  absoluteChange: number;
  percentChange: number | null;
};

export type RevenueProjection = {
  currentRevenue: MoneySatang;
  daysElapsed: number;
  daysInPeriod: number;
  averageDailyRevenue: MoneySatang;
  projectedPeriodRevenue: MoneySatang;
  label: "Projected";
};

function emptyBucket(key: string, label: string): AnalyticsBucket {
  return {
    key,
    label,
    revenue: 0,
    refunds: 0,
    netRevenue: 0,
    staffCosts: 0,
    caseExpenses: 0,
    operatingExpenses: 0,
    directCosts: 0,
    grossProfit: 0,
    netProfit: 0,
    grossMargin: 0,
    netMargin: 0,
    avgJobValue: 0,
    avgProfit: 0,
    staffCostPct: 0,
    operatingCostPct: 0,
    jobs: 0,
    paymentCount: 0,
  };
}

function finalizeBucket(b: AnalyticsBucket): AnalyticsBucket {
  b.directCosts = b.staffCosts + b.caseExpenses;
  b.netRevenue = b.revenue - b.refunds;
  b.grossProfit = b.netRevenue - b.directCosts;
  b.netProfit = b.grossProfit - b.operatingExpenses;
  b.grossMargin =
    b.netRevenue > 0 ? roundMargin((b.grossProfit / b.netRevenue) * 100) : 0;
  b.netMargin =
    b.netRevenue > 0 ? roundMargin((b.netProfit / b.netRevenue) * 100) : 0;
  b.avgJobValue = b.jobs > 0 ? Math.round(b.netRevenue / b.jobs) : 0;
  b.avgProfit = b.jobs > 0 ? Math.round(b.grossProfit / b.jobs) : 0;
  b.staffCostPct =
    b.netRevenue > 0 ? roundMargin((b.staffCosts / b.netRevenue) * 100) : 0;
  b.operatingCostPct =
    b.netRevenue > 0
      ? roundMargin((b.operatingExpenses / b.netRevenue) * 100)
      : 0;
  return b;
}

function passesFilters(
  row: {
    serviceId?: string | null;
    staffId?: string | null;
    method?: string | null;
    caseStatus?: string | null;
    clientId?: string | null;
    caseId?: string | null;
  },
  filters: AnalyticsFilters,
  staffCaseIds?: Set<string>
): boolean {
  if (filters.serviceId && row.serviceId !== filters.serviceId) return false;
  if (filters.clientId && row.clientId !== filters.clientId) return false;
  if (filters.caseStatus && row.caseStatus !== filters.caseStatus) return false;
  if (filters.paymentMethod && row.method !== filters.paymentMethod) return false;
  if (filters.staffId) {
    if (row.staffId && row.staffId === filters.staffId) return true;
    if (staffCaseIds && row.caseId && staffCaseIds.has(row.caseId)) return true;
    if (row.staffId || staffCaseIds) return false;
  }
  return true;
}

function groupKeyFor(
  groupBy: AnalyticsGroupBy,
  at: Date,
  ctx: {
    serviceId?: string | null;
    serviceName?: string | null;
    staffId?: string | null;
    staffName?: string | null;
    caseId?: string | null;
    caseNumber?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    category?: string | null;
    method?: string | null;
  }
): { key: string; label: string } {
  switch (groupBy) {
    case "hour": {
      const h = bangkokHour(at);
      return { key: pad2(h), label: `${pad2(h)}:00–${pad2((h + 1) % 24)}:00` };
    }
    case "day": {
      const k = bangkokDateKey(at);
      return { key: k, label: k };
    }
    case "week": {
      const k = bangkokWeekKey(at);
      return { key: k, label: k };
    }
    case "month": {
      const k = bangkokDateKey(at).slice(0, 7);
      return { key: k, label: k };
    }
    case "quarter": {
      const k = bangkokQuarterKey(at);
      return { key: k, label: k };
    }
    case "year": {
      const k = bangkokYearKey(at);
      return { key: k, label: k };
    }
    case "day_of_week": {
      const k = bangkokWeekday(at);
      return { key: k, label: k };
    }
    case "service":
      return {
        key: ctx.serviceId ?? "none",
        label: ctx.serviceName ?? "Unassigned service",
      };
    case "staff":
      return {
        key: ctx.staffId ?? "none",
        label: ctx.staffName ?? "Unassigned staff",
      };
    case "case":
      return {
        key: ctx.caseId ?? "none",
        label: ctx.caseNumber ?? "No case",
      };
    case "client":
      return {
        key: ctx.clientId ?? "none",
        label: ctx.clientName ?? "Unknown client",
      };
    case "expense_category":
    case "revenue_category":
      return {
        key: ctx.category ?? "other",
        label: (ctx.category ?? "other").replace(/_/g, " "),
      };
    case "payment_method":
      return {
        key: ctx.method ?? "unknown",
        label: (ctx.method ?? "unknown").replace(/_/g, " "),
      };
    default:
      return { key: "all", label: "All" };
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const DOW_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function computeAnalyticsKpis(input: {
  payments: AnalyticsPaymentRow[];
  transactions: AnalyticsTxRow[];
  cases: AnalyticsCaseRow[];
  accountsReceivable?: number;
  accountsPayable?: number;
}): AnalyticsKpiSet {
  const paidCustomerRevenue = sumSatang(
    input.payments.filter((p) => p.status === "approved").map((p) => p.amount)
  );
  const base = computeBusinessFinancialSummary({
    paidCustomerRevenue,
    transactions: input.transactions,
    accountsReceivable: input.accountsReceivable ?? 0,
    accountsPayable: input.accountsPayable ?? 0,
  });
  const jobs = input.cases.length;
  return {
    ...base,
    jobs,
    avgJobValue: jobs > 0 ? Math.round(base.netRevenue / jobs) : 0,
    avgProfit: jobs > 0 ? Math.round(base.grossProfit / jobs) : 0,
    staffCostPct:
      base.netRevenue > 0
        ? roundMargin((base.staffCosts / base.netRevenue) * 100)
        : 0,
    operatingCostPct:
      base.netRevenue > 0
        ? roundMargin((base.operatingExpenses / base.netRevenue) * 100)
        : 0,
    paymentCount: input.payments.filter((p) => p.status === "approved").length,
  };
}

/**
 * Group ledger events into analytics buckets.
 * Revenue comes from approved payments (+ ledger REVENUE/OTHER_INCOME).
 * Costs/refunds from FinancialTransaction rows.
 * Jobs counted from cases whose createdAt falls in the bucket (when temporal)
 * or matching dimension (when dimensional).
 */
export function groupAnalytics(input: {
  groupBy: AnalyticsGroupBy;
  payments: AnalyticsPaymentRow[];
  transactions: AnalyticsTxRow[];
  cases: AnalyticsCaseRow[];
  filters?: AnalyticsFilters;
}): AnalyticsBucket[] {
  const filters = input.filters ?? {};
  const staffCaseIds =
    filters.staffId != null
      ? new Set(
          input.cases
            .filter((c) => c.staffIds.includes(filters.staffId!))
            .map((c) => c.id)
        )
      : undefined;

  const buckets = new Map<string, AnalyticsBucket>();

  const ensure = (key: string, label: string) => {
    let b = buckets.get(key);
    if (!b) {
      b = emptyBucket(key, label);
      buckets.set(key, b);
    }
    return b;
  };

  for (const p of input.payments) {
    if (p.status !== "approved") continue;
    if (!passesFilters(p, filters, staffCaseIds)) continue;
    // payment_method / temporal groups use payment date; staff group skips pure revenue attribution here
    if (input.groupBy === "staff") {
      // Attribute revenue proportionally across assigned staff later via cases
      continue;
    }
    if (input.groupBy === "expense_category") continue;
    const { key, label } = groupKeyFor(input.groupBy, p.at, p);
    const b = ensure(key, label);
    b.revenue += p.amount;
    b.paymentCount += 1;
  }

  for (const t of input.transactions) {
    if (t.paymentStatus === "CANCELLED") continue;

    const isExpense =
      t.type === "CASE_EXPENSE" ||
      t.type === "OPERATING_EXPENSE" ||
      t.type === "OTHER_EXPENSE" ||
      t.type === "STAFF_PAYMENT";
    const isRevenueAdj = t.type === "REVENUE" || t.type === "OTHER_INCOME";
    const isRefund = t.type === "REFUND";

    if (input.groupBy === "expense_category" && !isExpense) continue;
    if (input.groupBy === "revenue_category" && !(isRevenueAdj || isRefund)) continue;
    if (input.groupBy === "payment_method" && !t.method && !isExpense) {
      // still allow if we have method
    }

    if (input.groupBy === "staff") {
      if (t.type === "STAFF_PAYMENT") {
        if (filters.staffId && t.staffId !== filters.staffId) continue;
        if (
          filters.serviceId &&
          t.serviceId &&
          t.serviceId !== filters.serviceId
        )
          continue;
        const { key, label } = groupKeyFor("staff", t.at, t);
        const b = ensure(key, label);
        b.staffCosts += t.amount;
        continue;
      }
      // other txs for staff grouping: skip unless filtering assigned cases
      continue;
    }

    if (!passesFilters(t, filters, staffCaseIds)) continue;

    const { key, label } = groupKeyFor(input.groupBy, t.at, {
      ...t,
      category: t.category,
      method: t.method,
    });
    const b = ensure(key, label);

    if (isRevenueAdj) b.revenue += t.amount;
    else if (isRefund) b.refunds += t.amount;
    else if (t.type === "STAFF_PAYMENT") b.staffCosts += t.amount;
    else if (t.type === "CASE_EXPENSE" || t.type === "OTHER_EXPENSE")
      b.caseExpenses += t.amount;
    else if (t.type === "OPERATING_EXPENSE") b.operatingExpenses += t.amount;
  }

  // Staff revenue attribution: split case net revenue across assignees
  if (input.groupBy === "staff") {
    for (const c of input.cases) {
      if (filters.serviceId && c.serviceId !== filters.serviceId) continue;
      if (filters.caseStatus && c.status !== filters.caseStatus) continue;
      if (filters.clientId && c.clientId !== filters.clientId) continue;
      if (filters.staffId && !c.staffIds.includes(filters.staffId)) continue;

      const casePayments = input.payments.filter(
        (p) => p.status === "approved" && p.caseId === c.id
      );
      if (filters.paymentMethod) {
        if (!casePayments.every((p) => p.method === filters.paymentMethod)) {
          // only include payments matching method
        }
      }
      const paid = sumSatang(
        casePayments
          .filter((p) => !filters.paymentMethod || p.method === filters.paymentMethod)
          .map((p) => p.amount)
      );
      const refunds = sumSatang(
        input.transactions
          .filter(
            (t) =>
              t.caseId === c.id &&
              t.type === "REFUND" &&
              t.paymentStatus !== "CANCELLED"
          )
          .map((t) => t.amount)
      );
      const otherCosts = sumSatang(
        input.transactions
          .filter(
            (t) =>
              t.caseId === c.id &&
              (t.type === "CASE_EXPENSE" || t.type === "OTHER_EXPENSE") &&
              t.paymentStatus !== "CANCELLED"
          )
          .map((t) => t.amount)
      );
      const assignees =
        filters.staffId != null
          ? c.staffIds.filter((id) => id === filters.staffId)
          : c.staffIds.length > 0
            ? c.staffIds
            : ["none"];
      const share = 1 / assignees.length;
      for (const staffId of assignees) {
        const staffName =
          input.transactions.find((t) => t.staffId === staffId)?.staffName ??
          staffId;
        const b = ensure(staffId, staffId === "none" ? "Unassigned staff" : staffName);
        b.revenue += Math.round(paid * share);
        b.refunds += Math.round(refunds * share);
        b.caseExpenses += Math.round(otherCosts * share);
        b.jobs += 1;
      }
    }
  } else {
    // Job counts for temporal / service / case / client groups
    for (const c of input.cases) {
      if (filters.serviceId && c.serviceId !== filters.serviceId) continue;
      if (filters.caseStatus && c.status !== filters.caseStatus) continue;
      if (filters.clientId && c.clientId !== filters.clientId) continue;
      if (filters.staffId && !c.staffIds.includes(filters.staffId)) continue;
      if (input.groupBy === "expense_category") continue;
      if (input.groupBy === "revenue_category") continue;
      if (input.groupBy === "payment_method") continue;
      if (input.groupBy === "hour") continue; // jobs aren't hourly by createdAt meaningfully enough — still count by created hour
      const { key, label } = groupKeyFor(input.groupBy, c.createdAt, {
        serviceId: c.serviceId,
        serviceName: c.serviceName,
        caseId: c.id,
        caseNumber: c.caseNumber,
        clientId: c.clientId,
        clientName: c.clientName,
      });
      const b = ensure(key, label);
      b.jobs += 1;
    }
  }

  let rows = Array.from(buckets.values()).map(finalizeBucket);

  if (input.groupBy === "day_of_week") {
    rows = DOW_ORDER.map(
      (d) => rows.find((r) => r.key === d) ?? finalizeBucket(emptyBucket(d, d))
    );
  } else if (input.groupBy === "hour") {
    rows = Array.from({ length: 24 }, (_, h) => {
      const k = pad2(h);
      return (
        rows.find((r) => r.key === k) ??
        finalizeBucket(emptyBucket(k, `${k}:00–${pad2((h + 1) % 24)}:00`))
      );
    });
  } else {
    rows.sort((a, b) => a.key.localeCompare(b.key));
  }

  return rows;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return roundMargin(((current - previous) / Math.abs(previous)) * 100);
}

export function compareMetric(
  current: number,
  previous: number
): PeriodComparison {
  return {
    current,
    previous,
    absoluteChange: current - previous,
    percentChange: percentChange(current, previous),
  };
}

export function projectPeriodRevenue(input: {
  currentRevenue: MoneySatang;
  range: DateRange;
  now?: Date;
  /** Full calendar period length for projection target (e.g. full month). */
  fullPeriodDays?: number;
}): RevenueProjection {
  const now = input.now ?? new Date();
  const elapsedEnd =
    now.getTime() < input.range.end.getTime() ? now : input.range.end;
  const daysElapsed = bangkokDayCount({ start: input.range.start, end: elapsedEnd });
  const daysInPeriod = input.fullPeriodDays ?? bangkokDayCount(input.range);
  const averageDailyRevenue =
    daysElapsed > 0 ? Math.round(input.currentRevenue / daysElapsed) : 0;
  return {
    currentRevenue: input.currentRevenue,
    daysElapsed,
    daysInPeriod,
    averageDailyRevenue,
    projectedPeriodRevenue: averageDailyRevenue * daysInPeriod,
    label: "Projected",
  };
}

/** Reconcile: sum of bucket metric === totals (within rounding for shares). */
export function reconcileBucketSum(
  buckets: AnalyticsBucket[],
  metric: keyof Pick<
    AnalyticsBucket,
    | "revenue"
    | "refunds"
    | "staffCosts"
    | "caseExpenses"
    | "operatingExpenses"
  >,
  expected: number,
  tolerance = 1
): boolean {
  const sum = sumSatang(buckets.map((b) => b[metric]));
  return Math.abs(sum - expected) <= tolerance;
}

export function metricValue(bucket: AnalyticsBucket, metric: AnalyticsMetric): number {
  return bucket[metric];
}
