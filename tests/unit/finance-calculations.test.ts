import { describe, expect, it } from "vitest";
import {
  computeBusinessFinancialSummary,
  computeCaseFinancialSummary,
  daysOverdue,
  receivableStatus,
  sumApprovedCustomerPayments,
  sumStaffCosts,
  sumStaffCostsOwed,
  sumStaffCostsPaid,
  sumRefunds,
} from "@/lib/finance/calculations";
import {
  assertNonNegativeAmount,
  bahtToSatang,
  grossMarginPercent,
  roundMargin,
} from "@/lib/finance/money";
import { resolveDateRange, bangkokDateKey } from "@/lib/finance/dates";
import { toCsv, satangToCsvBaht } from "@/lib/finance/csv";

describe("money helpers", () => {
  it("converts baht to satang without floats", () => {
    expect(bahtToSatang(100)).toBe(10000);
    expect(bahtToSatang(10.5)).toBe(1050);
  });

  it("rejects negative amounts", () => {
    expect(() => assertNonNegativeAmount(-1)).toThrow(/negative/);
  });

  it("returns 0% margin when revenue is 0", () => {
    expect(grossMarginPercent(0, -500)).toBe(0);
    expect(roundMargin(49.567)).toBe(49.57);
  });
});

describe("case financial summary", () => {
  it("uses approved payments as paid revenue (not unpaid invoices)", () => {
    const summary = computeCaseFinancialSummary({
      payments: [
        { amount: 1000000, status: "approved" },
        { amount: 500000, status: "submitted" },
      ],
      invoices: [
        { amount: 1500000, status: "unpaid" },
        { amount: 200000, status: "draft" },
      ],
      quotes: [{ amount: 1500000, status: "accepted" }],
      transactions: [],
    });
    expect(summary.paidRevenue).toBe(1000000);
    expect(summary.invoicedRevenue).toBe(1500000);
    expect(summary.outstandingRevenue).toBe(500000);
    expect(summary.quotedRevenue).toBe(1500000);
  });

  it("subtracts refunds and includes staff + case expenses in costs", () => {
    const summary = computeCaseFinancialSummary({
      payments: [{ amount: 1150000, status: "approved" }],
      invoices: [{ amount: 1150000, status: "paid" }],
      quotes: [{ amount: 1150000, status: "accepted" }],
      transactions: [
        { type: "STAFF_PAYMENT", amount: 300000, paymentStatus: "UNPAID" },
        { type: "STAFF_PAYMENT", amount: 50000, paymentStatus: "PAID" },
        { type: "CASE_EXPENSE", amount: 200000, paymentStatus: "PAID" },
        { type: "CASE_EXPENSE", amount: 30000, paymentStatus: "PAID" },
        { type: "REFUND", amount: 0, paymentStatus: "PAID" },
      ],
    });
    expect(summary.staffCosts).toBe(350000);
    expect(summary.otherDirectCosts).toBe(230000);
    expect(summary.totalDirectCosts).toBe(580000);
    expect(summary.grossProfit).toBe(1150000 - 580000);
    expect(summary.grossMargin).toBe(
      roundMargin(((1150000 - 580000) / 1150000) * 100)
    );
  });

  it("ignores cancelled transactions", () => {
    const summary = computeCaseFinancialSummary({
      payments: [{ amount: 500000, status: "approved" }],
      invoices: [{ amount: 500000, status: "paid" }],
      quotes: [],
      transactions: [
        { type: "STAFF_PAYMENT", amount: 100000, paymentStatus: "CANCELLED" },
        { type: "CASE_EXPENSE", amount: 50000, paymentStatus: "CANCELLED" },
        { type: "REFUND", amount: 20000, paymentStatus: "CANCELLED" },
      ],
    });
    expect(summary.staffCosts).toBe(0);
    expect(summary.otherDirectCosts).toBe(0);
    expect(summary.refunds).toBe(0);
    expect(summary.grossProfit).toBe(500000);
  });

  it("supports multiple staff payments on one case", () => {
    const txs = [
      { type: "STAFF_PAYMENT", amount: 100000, paymentStatus: "UNPAID" },
      { type: "STAFF_PAYMENT", amount: 50000, paymentStatus: "PAID" },
      { type: "STAFF_PAYMENT", amount: 25000, paymentStatus: "APPROVED" },
    ];
    expect(sumStaffCosts(txs)).toBe(175000);
    expect(sumStaffCostsPaid(txs)).toBe(50000);
    expect(sumStaffCostsOwed(txs)).toBe(125000);
  });

  it("handles revenue = 0 with costs", () => {
    const summary = computeCaseFinancialSummary({
      payments: [],
      invoices: [],
      quotes: [],
      transactions: [
        { type: "CASE_EXPENSE", amount: 10000, paymentStatus: "PAID" },
      ],
    });
    expect(summary.netRevenue).toBe(0);
    expect(summary.grossProfit).toBe(-10000);
    expect(summary.grossMargin).toBe(0);
  });

  it("handles refund greater than payment", () => {
    const summary = computeCaseFinancialSummary({
      payments: [{ amount: 100000, status: "approved" }],
      invoices: [{ amount: 100000, status: "paid" }],
      quotes: [],
      transactions: [{ type: "REFUND", amount: 150000, paymentStatus: "PAID" }],
    });
    expect(summary.refunds).toBe(150000);
    expect(summary.netRevenue).toBe(-50000);
  });

  it("partial payments leave outstanding", () => {
    const summary = computeCaseFinancialSummary({
      payments: [
        { amount: 300000, status: "approved" },
        { amount: 200000, status: "approved" },
      ],
      invoices: [{ amount: 1000000, status: "unpaid" }],
      quotes: [{ amount: 1000000, status: "accepted" }],
      transactions: [],
    });
    expect(summary.paidRevenue).toBe(500000);
    expect(summary.outstandingRevenue).toBe(500000);
  });
});

describe("business financial summary", () => {
  it("computes gross and net profit transparently", () => {
    const summary = computeBusinessFinancialSummary({
      paidCustomerRevenue: 50000000,
      transactions: [
        { type: "STAFF_PAYMENT", amount: 10000000, paymentStatus: "PAID" },
        { type: "CASE_EXPENSE", amount: 8000000, paymentStatus: "PAID" },
        { type: "OPERATING_EXPENSE", amount: 12000000, paymentStatus: "PAID" },
        { type: "REFUND", amount: 0, paymentStatus: "PAID" },
      ],
      accountsReceivable: 500000,
      accountsPayable: 1500000,
    });
    expect(summary.directCosts).toBe(18000000);
    expect(summary.grossProfit).toBe(32000000);
    expect(summary.netProfit).toBe(20000000);
    expect(summary.netMargin).toBe(40);
    expect(summary.operatingExpenses).toBe(12000000);
  });

  it("does not count unpaid invoices as cash revenue", () => {
    // Business summary only receives paidCustomerRevenue from approved payments.
    const summary = computeBusinessFinancialSummary({
      paidCustomerRevenue: 0,
      transactions: [],
      accountsReceivable: 999999,
      accountsPayable: 0,
    });
    expect(summary.revenue).toBe(0);
    expect(summary.accountsReceivable).toBe(999999);
  });
});

describe("receivables", () => {
  it("classifies overdue / due soon / current / paid", () => {
    const now = new Date("2026-09-13T12:00:00+07:00");
    expect(receivableStatus(0, null, now)).toBe("PAID");
    expect(receivableStatus(100, new Date("2026-09-25T00:00:00+07:00"), now)).toBe(
      "CURRENT"
    );
    expect(receivableStatus(100, new Date("2026-09-15T00:00:00+07:00"), now)).toBe(
      "DUE_SOON"
    );
    expect(receivableStatus(100, new Date("2026-09-01T00:00:00+07:00"), now)).toBe(
      "OVERDUE"
    );
    expect(daysOverdue(new Date("2026-09-01T00:00:00+07:00"), now)).toBeGreaterThan(0);
  });
});

describe("date ranges (Asia/Bangkok)", () => {
  it("resolves this_month from a fixed Bangkok instant", () => {
    const now = new Date("2026-09-13T10:00:00+07:00");
    const range = resolveDateRange("this_month", null, null, now);
    expect(bangkokDateKey(range.start)).toBe("2026-09-01");
    expect(bangkokDateKey(range.end)).toBe("2026-09-13");
  });

  it("resolves last_7_days inclusively", () => {
    const now = new Date("2026-09-13T10:00:00+07:00");
    const range = resolveDateRange("last_7_days", null, null, now);
    expect(bangkokDateKey(range.start)).toBe("2026-09-07");
    expect(bangkokDateKey(range.end)).toBe("2026-09-13");
  });
});

describe("csv export helpers", () => {
  it("escapes commas and quotes", () => {
    expect(toCsv(["A", "B"], [['hello, "world"', 1]])).toContain(
      '"hello, ""world"""'
    );
    expect(satangToCsvBaht(11500)).toBe("115.00");
  });
});

describe("approved payment summing", () => {
  it("sums only approved", () => {
    expect(
      sumApprovedCustomerPayments([
        { amount: 1, status: "approved" },
        { amount: 2, status: "rejected" },
        { amount: 3, status: "submitted" },
      ])
    ).toBe(1);
  });

  it("sums refunds excluding cancelled", () => {
    expect(
      sumRefunds([
        { type: "REFUND", amount: 10, paymentStatus: "PAID" },
        { type: "REFUND", amount: 5, paymentStatus: "CANCELLED" },
      ])
    ).toBe(10);
  });
});
