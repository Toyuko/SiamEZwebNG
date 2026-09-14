import { describe, expect, it } from "vitest";
import {
  computeAnalyticsKpis,
  groupAnalytics,
  reconcileBucketSum,
  compareMetric,
  projectPeriodRevenue,
  percentChange,
  type AnalyticsPaymentRow,
  type AnalyticsTxRow,
  type AnalyticsCaseRow,
} from "@/lib/finance/analytics";
import {
  resolveDateRange,
  previousPeriodRange,
  bangkokDayCount,
  bangkokDateKey,
} from "@/lib/finance/dates";
import { computeBusinessFinancialSummary } from "@/lib/finance/calculations";

function pay(
  partial: Partial<AnalyticsPaymentRow> & { amount: number; at: Date }
): AnalyticsPaymentRow {
  return {
    id: partial.id ?? `p-${partial.amount}`,
    status: partial.status ?? "approved",
    method: partial.method ?? "qr",
    caseId: partial.caseId ?? "c1",
    serviceId: partial.serviceId ?? "s1",
    clientId: partial.clientId ?? "u1",
    caseStatus: partial.caseStatus ?? "completed",
    caseNumber: partial.caseNumber ?? "SE-1",
    serviceName: partial.serviceName ?? "DL",
    clientName: partial.clientName ?? "Alex",
    ...partial,
  };
}

function tx(
  partial: Partial<AnalyticsTxRow> & {
    type: string;
    amount: number;
    at: Date;
  }
): AnalyticsTxRow {
  return {
    id: partial.id ?? `t-${partial.type}-${partial.amount}`,
    paymentStatus: partial.paymentStatus ?? "PAID",
    category: partial.category ?? "other",
    description: partial.description ?? partial.type,
    method: partial.method ?? "bank",
    caseId: partial.caseId ?? "c1",
    staffId: partial.staffId ?? null,
    serviceId: partial.serviceId ?? "s1",
    clientId: partial.clientId ?? "u1",
    ...partial,
  };
}

describe("financial analytics aggregation", () => {
  const day1 = new Date("2026-09-10T10:00:00+07:00");
  const day2 = new Date("2026-09-11T15:00:00+07:00");

  const payments = [
    pay({ amount: 500_000, at: day1, method: "qr", id: "p1" }),
    pay({ amount: 300_000, at: day2, method: "bank", id: "p2", caseId: "c2", serviceId: "s2", serviceName: "Marriage" }),
  ];

  const transactions = [
    tx({
      type: "STAFF_PAYMENT",
      amount: 100_000,
      at: day1,
      staffId: "st1",
      staffName: "Grace",
    }),
    tx({
      type: "CASE_EXPENSE",
      amount: 50_000,
      at: day1,
      category: "government_fee",
    }),
    tx({
      type: "OPERATING_EXPENSE",
      amount: 80_000,
      at: day2,
      category: "office_rent",
      caseId: null,
    }),
    tx({ type: "REFUND", amount: 20_000, at: day2, caseId: "c2" }),
  ];

  const cases: AnalyticsCaseRow[] = [
    {
      id: "c1",
      caseNumber: "SE-1",
      serviceId: "s1",
      serviceName: "DL",
      clientId: "u1",
      clientName: "Alex",
      status: "completed",
      createdAt: day1,
      staffIds: ["st1"],
    },
    {
      id: "c2",
      caseNumber: "SE-2",
      serviceId: "s2",
      serviceName: "Marriage",
      clientId: "u1",
      clientName: "Alex",
      status: "completed",
      createdAt: day2,
      staffIds: ["st1", "st2"],
    },
  ];

  it("KPIs match centralized business summary + jobs", () => {
    const kpis = computeAnalyticsKpis({ payments, transactions, cases });
    const base = computeBusinessFinancialSummary({
      paidCustomerRevenue: 800_000,
      transactions,
      accountsReceivable: 0,
      accountsPayable: 0,
    });
    expect(kpis.revenue).toBe(base.revenue);
    expect(kpis.refunds).toBe(base.refunds);
    expect(kpis.netRevenue).toBe(base.netRevenue);
    expect(kpis.staffCosts).toBe(base.staffCosts);
    expect(kpis.operatingExpenses).toBe(base.operatingExpenses);
    expect(kpis.grossProfit).toBe(base.grossProfit);
    expect(kpis.netProfit).toBe(base.netProfit);
    expect(kpis.jobs).toBe(2);
    expect(kpis.netRevenue).toBe(800_000 - 20_000);
    expect(kpis.staffCosts).toBe(100_000);
  });

  it("day grouping reconciles revenue and costs to totals", () => {
    const buckets = groupAnalytics({
      groupBy: "day",
      payments,
      transactions,
      cases,
    });
    expect(reconcileBucketSum(buckets, "revenue", 800_000)).toBe(true);
    expect(reconcileBucketSum(buckets, "refunds", 20_000)).toBe(true);
    expect(reconcileBucketSum(buckets, "staffCosts", 100_000)).toBe(true);
    expect(reconcileBucketSum(buckets, "operatingExpenses", 80_000)).toBe(true);
    expect(reconcileBucketSum(buckets, "caseExpenses", 50_000)).toBe(true);

    const totalNet = buckets.reduce((s, b) => s + b.netProfit, 0);
    const kpis = computeAnalyticsKpis({ payments, transactions, cases });
    expect(totalNet).toBe(kpis.netProfit);
  });

  it("payment method grouping sums to revenue", () => {
    const buckets = groupAnalytics({
      groupBy: "payment_method",
      payments,
      transactions: [],
      cases: [],
    });
    expect(reconcileBucketSum(buckets, "revenue", 800_000)).toBe(true);
    const qr = buckets.find((b) => b.key === "qr");
    const bank = buckets.find((b) => b.key === "bank");
    expect(qr?.revenue).toBe(500_000);
    expect(bank?.revenue).toBe(300_000);
  });

  it("day_of_week returns Mon–Sun order", () => {
    const buckets = groupAnalytics({
      groupBy: "day_of_week",
      payments,
      transactions,
      cases,
    });
    expect(buckets.map((b) => b.key)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });

  it("staff grouping distinguishes assigned revenue vs staff payments", () => {
    const buckets = groupAnalytics({
      groupBy: "staff",
      payments,
      transactions,
      cases,
    });
    const grace = buckets.find((b) => b.key === "st1");
    expect(grace).toBeTruthy();
    // c1 full + half of c2 payments (proportional)
    // c1: 500000, c2: 300000 / 2 = 150000 → 650000 revenue attributed
    expect(grace!.revenue).toBe(650_000);
    expect(grace!.staffCosts).toBe(100_000);
    expect(grace!.jobs).toBe(2);
  });

  it("filters by service", () => {
    const buckets = groupAnalytics({
      groupBy: "day",
      payments,
      transactions,
      cases,
      filters: { serviceId: "s1" },
    });
    expect(reconcileBucketSum(buckets, "revenue", 500_000)).toBe(true);
  });

  it("ignores cancelled transactions in analytics", () => {
    const withCancelled = [
      ...transactions,
      tx({
        type: "STAFF_PAYMENT",
        amount: 999_999,
        at: day1,
        paymentStatus: "CANCELLED",
        staffId: "st1",
      }),
    ];
    const kpis = computeAnalyticsKpis({
      payments,
      transactions: withCancelled,
      cases,
    });
    expect(kpis.staffCosts).toBe(100_000);
  });
});

describe("comparison & projection helpers", () => {
  it("computes percent change", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(compareMetric(150_000, 125_000).percentChange).toBe(20);
    expect(percentChange(10, 0)).toBeNull();
  });

  it("projects period revenue from daily average", () => {
    const range = resolveDateRange(
      "custom",
      "2026-09-01",
      "2026-09-30",
      new Date("2026-09-15T12:00:00+07:00")
    );
    const proj = projectPeriodRevenue({
      currentRevenue: 300_000_00,
      range,
      now: new Date("2026-09-15T12:00:00+07:00"),
      fullPeriodDays: 30,
    });
    expect(proj.label).toBe("Projected");
    expect(proj.daysElapsed).toBe(15);
    expect(proj.averageDailyRevenue).toBe(Math.round(300_000_00 / 15));
    expect(proj.projectedPeriodRevenue).toBe(proj.averageDailyRevenue * 30);
  });

  it("previous period has equal length", () => {
    const range = resolveDateRange(
      "custom",
      "2026-09-01",
      "2026-09-14",
      new Date("2026-09-14T12:00:00+07:00")
    );
    const prev = previousPeriodRange(range);
    expect(bangkokDayCount(range)).toBe(bangkokDayCount(prev));
    expect(bangkokDateKey(prev.end) < bangkokDateKey(range.start)).toBe(true);
  });
});
