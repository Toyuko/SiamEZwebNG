import { describe, expect, it } from "vitest";
import { resolveDateRange } from "@/lib/finance/dates";
import { groupAnalytics } from "@/lib/finance/analytics";
import { toXlsx } from "@/lib/finance/xlsx";
import {
  aggregateSalespersonTotals,
  applyPercentSatang,
  assertEligibleSalesperson,
  buildSalesExportRows,
  canManageSalesAttribution,
  canViewCommission,
  canViewSalesperson,
  computeCommissionSatang,
  countsAsClosedSale,
  dealOutstanding,
  filterDealsByClosedAt,
  filterSalesDeals,
  netCollected,
  planAttributionChange,
  resolveClosedAt,
  salesByService,
  salesVersusTarget,
  summarizeSales,
  DEFAULT_SALES_SETTINGS,
  type SalesDeal,
} from "@/lib/finance/sales";

const NOW = new Date("2026-10-03T10:00:00+07:00");
const SETTINGS = { ...DEFAULT_SALES_SETTINGS };

function deal(partial: Partial<SalesDeal> & Pick<SalesDeal, "caseId" | "closedAt">): SalesDeal {
  return {
    caseNumber: partial.caseId,
    customerName: "John Smith",
    clientId: "cust",
    serviceId: "svc-license",
    serviceName: "Driver License",
    status: "in_progress",
    salesPersonId: "grace",
    salesPersonName: "Grace",
    staffIds: ["peter"],
    staffNames: ["Peter"],
    staffCompensation: 0,
    dealValue: 1_000_000,
    paid: 1_000_000,
    refunds: 0,
    commissionAmount: 0,
    commissionStatus: null,
    commissionType: null,
    paymentMethod: "bank",
    ...partial,
  };
}

describe("salesperson is not service staff", () => {
  it("keeps the closer separate from multiple service staff", () => {
    const row = deal({
      caseId: "c1",
      closedAt: new Date("2026-09-30T15:00:00+07:00"),
      salesPersonId: "grace",
      staffIds: ["peter", "somchai"],
      staffNames: ["Peter", "Somchai"],
      staffCompensation: 200_000,
      dealValue: 1_500_000,
    });
    expect(row.salesPersonId).not.toBe(row.staffIds[0]);
    expect(row.staffIds).toEqual(["peter", "somchai"]);
    const [stats] = aggregateSalespersonTotals([row]);
    expect(stats.salesPersonId).toBe("grace");
    expect(stats.revenueClosed).toBe(1_500_000);
    expect(stats.revenueClosed).not.toBe(row.staffCompensation);
  });

  it("does not attribute closed revenue to service staff in analytics", () => {
    const closed = deal({
      caseId: "c1",
      closedAt: new Date("2026-09-30T15:00:00+07:00"),
      dealValue: 1_000_000,
      paid: 1_000_000,
    });
    const buckets = groupAnalytics({
      groupBy: "staff",
      payments: [],
      transactions: [],
      cases: [],
      deals: [closed],
    });
    expect(buckets.find((b) => b.key === "peter")).toBeUndefined();
    expect(buckets.find((b) => b.key === "grace")).toBeUndefined();
  });

  it("rejects free-text and inactive or non-staff closers", () => {
    expect(() => assertEligibleSalesperson(null)).toThrow(/active staff/);
    expect(() =>
      assertEligibleSalesperson({ id: "c", role: "customer", active: true })
    ).toThrow(/active staff/);
    expect(() =>
      assertEligibleSalesperson({ id: "s", role: "staff", active: false })
    ).toThrow(/active staff/);
    expect(() =>
      assertEligibleSalesperson({ id: "s", role: "staff", active: true })
    ).not.toThrow();
  });
});

describe("attribution changes are audited", () => {
  it("logs a reason when the salesperson changes and keeps the close date", () => {
    const change = planAttributionChange({
      previousSalesPersonId: "grace",
      newSalesPersonId: "peter",
      changedById: "admin",
      reason: "Customer transferred from Grace to Peter",
      now: NOW,
    });
    expect(change).toMatchObject({
      previousSalesPersonId: "grace",
      newSalesPersonId: "peter",
      changedById: "admin",
      reason: "Customer transferred from Grace to Peter",
    });
    expect(() =>
      planAttributionChange({
        previousSalesPersonId: "grace",
        newSalesPersonId: "peter",
        changedById: "admin",
        reason: "  ",
      })
    ).toThrow(/reason/i);

    const existing = new Date("2026-09-30T15:00:00+07:00");
    expect(
      resolveClosedAt({
        existingClosedAt: existing,
        providedClosedAt: null,
        isNew: false,
        now: NOW,
      })
    ).toBe(existing);
  });

  it("requires an explicit close date for an existing unassigned job", () => {
    expect(() =>
      resolveClosedAt({
        existingClosedAt: null,
        providedClosedAt: null,
        isNew: false,
        now: NOW,
      })
    ).toThrow(/Closed date/);
  });
});

describe("sales dates use closedAt", () => {
  const sept30 = deal({
    caseId: "sept",
    closedAt: new Date("2026-09-30T15:00:00+07:00"),
    dealValue: 1_000_000,
  });

  function inPreset(preset: Parameters<typeof resolveDateRange>[0], start?: string, end?: string) {
    const range = resolveDateRange(preset, start, end, NOW);
    return filterDealsByClosedAt([sept30], range);
  }

  it("puts a September 30 close in September, not October completion", () => {
    expect(inPreset("this_month")).toHaveLength(0);
    expect(inPreset("last_month")).toHaveLength(1);
    expect(inPreset("this_quarter")).toHaveLength(0);
    expect(inPreset("this_year")).toHaveLength(1);
    expect(inPreset("last_7_days")).toHaveLength(1);
    expect(inPreset("last_30_days")).toHaveLength(1);
    expect(inPreset("last_90_days")).toHaveLength(1);
    expect(inPreset("last_365_days")).toHaveLength(1);
    expect(inPreset("custom", "2026-09-01", "2026-09-30")).toHaveLength(1);
    expect(inPreset("custom", "2026-10-01", "2026-10-03")).toHaveLength(0);
  });

  it("covers today, yesterday, this week, and last week", () => {
    const today = deal({ caseId: "today", closedAt: new Date("2026-10-03T09:00:00+07:00") });
    const yesterday = deal({ caseId: "yday", closedAt: new Date("2026-10-02T09:00:00+07:00") });
    const lastWeek = deal({ caseId: "lw", closedAt: new Date("2026-09-24T09:00:00+07:00") });
    const all = [sept30, today, yesterday, lastWeek];
    expect(filterDealsByClosedAt(all, resolveDateRange("today", null, null, NOW)).map((d) => d.caseId)).toEqual(["today"]);
    expect(filterDealsByClosedAt(all, resolveDateRange("yesterday", null, null, NOW)).map((d) => d.caseId)).toEqual(["yday"]);
    const thisWeek = filterDealsByClosedAt(all, resolveDateRange("this_week", null, null, NOW)).map((d) => d.caseId);
    expect(thisWeek).toContain("sept");
    expect(thisWeek).not.toContain("lw");
    expect(filterDealsByClosedAt(all, resolveDateRange("last_week", null, null, NOW)).map((d) => d.caseId)).toEqual(["lw"]);
  });

  it("groups monthly sales by close month", () => {
    const buckets = groupAnalytics({
      groupBy: "month",
      payments: [],
      transactions: [],
      cases: [],
      deals: [sept30],
    });
    const sept = buckets.find((b) => b.key === "2026-09");
    expect(sept?.dealsClosed).toBe(1);
    expect(sept?.dealValue).toBe(1_000_000);
    expect(buckets.find((b) => b.key === "2026-10")).toBeUndefined();
  });
});

describe("deal value, cash, and outstanding stay separate", () => {
  it("tracks a partial payment as outstanding, not collected", () => {
    const row = deal({
      caseId: "partial",
      closedAt: NOW,
      dealValue: 2_000_000,
      paid: 1_500_000,
      refunds: 0,
    });
    expect(dealOutstanding(row.dealValue, row.paid)).toBe(500_000);
    const kpis = summarizeSales([row]);
    expect(kpis.totalSales).toBe(2_000_000);
    expect(kpis.cashCollected).toBe(1_500_000);
    expect(kpis.outstanding).toBe(500_000);
  });

  it("reduces collected cash for refunds and drops cancelled jobs", () => {
    const refunded = deal({
      caseId: "ref",
      closedAt: NOW,
      status: "refunded",
      dealValue: 1_000_000,
      paid: 1_000_000,
      refunds: 1_000_000,
    });
    const cancelled = deal({
      caseId: "can",
      closedAt: NOW,
      status: "cancelled",
      dealValue: 5_000_000,
    });
    expect(netCollected(refunded.paid, refunded.refunds)).toBe(0);
    expect(countsAsClosedSale("cancelled", SETTINGS)).toBe(false);
    const rows = filterSalesDeals([refunded, cancelled], {}, SETTINGS);
    expect(rows.map((d) => d.caseId)).toEqual(["ref"]);
    expect(summarizeSales(rows).cashCollected).toBe(0);
    expect(summarizeSales(rows).refunds).toBe(1_000_000);
    const withCancelled = filterSalesDeals([cancelled], {}, {
      ...SETTINGS,
      countCancelledAsSale: true,
    });
    expect(withCancelled).toHaveLength(1);
  });
});

describe("commission", () => {
  it("calculates percent of deal with integer basis points", () => {
    expect(applyPercentSatang(1_000_000, 10)).toBe(100_000);
    expect(
      computeCommissionSatang({
        type: "percent_of_deal",
        dealValue: 1_000_000,
        paid: 1_000_000,
        refunds: 0,
        ratePercent: 10,
      })
    ).toBe(100_000);
  });

  it("uses collected cash after refunds for percent-of-collected", () => {
    expect(
      computeCommissionSatang({
        type: "percent_of_collected",
        dealValue: 1_000_000,
        paid: 1_000_000,
        refunds: 400_000,
        ratePercent: 10,
      })
    ).toBe(60_000);
  });

  it("does not assume commission, and tracks paid vs outstanding", () => {
    expect(
      computeCommissionSatang({
        type: "none",
        dealValue: 1_000_000,
        paid: 1_000_000,
        refunds: 0,
      })
    ).toBe(0);
    const pending = deal({
      caseId: "p",
      closedAt: NOW,
      dealValue: 1_000_000,
      commissionAmount: 100_000,
      commissionStatus: "pending",
    });
    const paid = deal({
      caseId: "paid",
      closedAt: NOW,
      commissionAmount: 50_000,
      commissionStatus: "paid",
    });
    const cancelled = deal({
      caseId: "x",
      closedAt: NOW,
      commissionAmount: 80_000,
      commissionStatus: "cancelled",
    });
    const kpis = summarizeSales([pending, paid, cancelled]);
    expect(kpis.commission).toBe(150_000);
    expect(kpis.commissionPaid).toBe(50_000);
    expect(kpis.commissionOutstanding).toBe(100_000);
  });
});

describe("permissions and export", () => {
  it("lets staff see only their own compensation figures", () => {
    expect(canViewSalesperson({ id: "grace", role: "staff" }, "grace")).toBe(true);
    expect(canViewSalesperson({ id: "grace", role: "staff" }, "peter")).toBe(false);
    expect(canViewCommission({ id: "grace", role: "staff" }, "peter")).toBe(false);
    expect(canViewCommission({ id: "admin", role: "admin" }, "peter")).toBe(true);
    expect(canManageSalesAttribution("staff")).toBe(false);
    expect(canManageSalesAttribution("admin")).toBe(true);
  });

  it("exports only the filtered salesperson and date range", () => {
    const grace = deal({ caseId: "SE-1", closedAt: new Date("2026-10-02T09:00:00+07:00"), salesPersonId: "grace", salesPersonName: "Grace" });
    const peter = deal({
      caseId: "SE-2",
      closedAt: new Date("2026-10-02T09:00:00+07:00"),
      salesPersonId: "peter",
      salesPersonName: "Peter",
      customerName: "Michael Jones",
    });
    const old = deal({ caseId: "SE-old", closedAt: new Date("2026-01-02T09:00:00+07:00") });
    const range = resolveDateRange("this_month", null, null, NOW);
    const rows = buildSalesExportRows([grace, peter, old], { salesPersonId: "grace" }, SETTINGS, range);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ salesperson: "Grace", dealId: "SE-1", customer: "John Smith" });
  });

  it("writes an xlsx zip", () => {
    const buf = toXlsx(["Salesperson", "Deal ID"], [["Grace", "SE-1"]]);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});

describe("sales by service and targets", () => {
  it("switches metrics without ranking salespeople", () => {
    const deals = [
      deal({ caseId: "g1", closedAt: NOW, serviceId: "lic", serviceName: "Driver License", dealValue: 1_000_000, paid: 1_000_000 }),
      deal({
        caseId: "p1",
        closedAt: NOW,
        salesPersonId: "peter",
        salesPersonName: "Peter",
        serviceId: "veh",
        serviceName: "Vehicle",
        dealValue: 5_000_000,
        paid: 5_000_000,
      }),
    ];
    const byDeals = salesByService(deals, "deals");
    expect(byDeals.salespeople.map((p) => p.name)).toEqual(["Grace", "Peter"]);
    expect(byDeals.cells.grace.lic).toBe(1);
    expect(byDeals.cells.peter.veh).toBe(1);
    const byValue = salesByService(deals, "dealValue");
    expect(byValue.cells.peter.veh).toBe(5_000_000);
    expect(salesVersusTarget(320_000_00, 300_000_00)).toEqual({
      actual: 320_000_00,
      target: 300_000_00,
      variance: 20_000_00,
    });
    expect(salesVersusTarget(100, null).variance).toBeNull();
  });
});
