import { describe, expect, it } from "vitest";
import { classifyBackofficeIntent, classifyFinanceQuestion } from "@/lib/backoffice/intent";
import { buildFinanceStatement, type PaymentFact } from "@/lib/finance/collected";
import { endOfBangkokDay, startOfBangkokDay } from "@/lib/finance/dates";
import { monthlyCollected, reconcileTotals, serviceProfit, summariseCommissions, summariseDeals, sumExpenses } from "@/lib/finance/picture";
import { readEveryPage } from "@/lib/finance/read-all";

const now = new Date("2026-11-04T05:00:00+07:00");

function payment(overrides: Partial<PaymentFact> & Pick<PaymentFact, "id" | "amount">): PaymentFact {
  return {
    status: "approved",
    approvedAt: new Date("2026-10-15T05:00:00.000Z"),
    submittedAt: new Date("2026-10-15T04:00:00.000Z"),
    caseId: "case",
    caseNumber: "SE-1",
    customerName: "Ada",
    serviceName: "Translation",
    salesPersonId: "grace",
    salesPersonName: "Grace",
    method: "qr",
    kind: "full",
    ...overrides,
  };
}

describe("full financial reads", () => {
  it("pages until every row is included", async () => {
    const source = Array.from({ length: 950 }, (_, index) => ({ id: `p${index}`, amount: 100 }));
    const read = await readEveryPage(async (cursor, take) => {
      const start = cursor ? source.findIndex((row) => row.id === cursor) + 1 : 0;
      return source.slice(start, start + take);
    }, 400);
    expect(read.complete).toBe(true);
    expect(read.rows).toHaveLength(950);
    expect(read.rows.reduce((sum, row) => sum + row.amount, 0)).toBe(95_000);
  });

  it("reports an incomplete read when a page fails", async () => {
    const read = await readEveryPage(async () => {
      throw new Error("database unavailable");
    });
    expect(read.complete).toBe(false);
    expect(read.rows).toHaveLength(0);
    expect(read.note).toMatch(/incomplete/);
  });

  it("reconciles only when the page total matches the database total", () => {
    expect(reconcileTotals({ complete: true, queriedCount: 90, databaseCount: 90, queriedSatang: 71566800, databaseSatang: 71566800 }).reconciled).toBe(true);
    expect(reconcileTotals({ complete: true, queriedCount: 89, databaseCount: 90, queriedSatang: 1, databaseSatang: 2 }).reconciled).toBe(false);
    expect(reconcileTotals({ complete: false, queriedCount: 90, databaseCount: 90, queriedSatang: 1, databaseSatang: 1 }).reconciled).toBe(false);
  });

  it("keeps deposits, expenses, deal value, and commission apart from collected payments", () => {
    const statement = buildFinanceStatement({
      payments: [
        payment({ id: "deposit", amount: 500_000, kind: "initial" }),
        payment({ id: "balance", amount: 1_000_000, kind: "balance" }),
      ],
      ledger: [],
      start: startOfBangkokDay("2026-10-01"),
      end: endOfBangkokDay("2026-10-31"),
    });
    expect(statement.collectedSatang).toBe(1_500_000);
    expect(statement.depositSatang).toBe(500_000);
    const expenses = sumExpenses([
      { id: "rent", type: "OPERATING_EXPENSE", amount: 200_000, paymentStatus: "PAID", transactionDate: new Date("2026-10-02T05:00:00.000Z"), category: "office_rent", serviceName: "Office" },
      { id: "void", type: "OPERATING_EXPENSE", amount: 9_000_000, paymentStatus: "CANCELLED", transactionDate: new Date("2026-10-02T05:00:00.000Z"), category: "office_rent", serviceName: "Office" },
    ], startOfBangkokDay("2026-10-01"), endOfBangkokDay("2026-10-31"));
    expect(expenses.total).toBe(200_000);
    expect(statement.collectedSatang).toBe(1_500_000);
    const deals = summariseDeals([
      { id: "d1", caseNumber: "SE-1", customerName: "Ada", serviceName: "Translation", salesPersonId: "grace", salesPersonName: "Grace", status: "completed", closedAt: new Date("2026-10-10T05:00:00.000Z"), dealValue: 2_000_000 },
      { id: "d2", caseNumber: "SE-2", customerName: "Bo", serviceName: "Translation", salesPersonId: "grace", salesPersonName: "Grace", status: "completed", closedAt: new Date("2026-10-11T05:00:00.000Z"), dealValue: null },
    ], { start: startOfBangkokDay("2026-10-01"), end: endOfBangkokDay("2026-10-31") }, "grace");
    expect(deals.generatedSatang).toBe(2_000_000);
    expect(deals.missingValueCount).toBe(1);
    expect(deals.generatedSatang).not.toBe(statement.collectedSatang);
    const commission = summariseCommissions([
      { id: "c1", salesPersonId: "grace", salesPersonName: "Grace", amount: 50_000, status: "approved", closedAt: new Date("2026-10-10T05:00:00.000Z"), paidAt: null, caseId: "d1", caseNumber: "SE-1" },
      { id: "c2", salesPersonId: "ada", salesPersonName: "Ada", amount: 80_000, status: "paid", closedAt: new Date("2026-10-12T05:00:00.000Z"), paidAt: new Date("2026-10-20T05:00:00.000Z"), caseId: "d3", caseNumber: "SE-3" },
    ], { start: startOfBangkokDay("2026-10-01"), end: endOfBangkokDay("2026-10-31") });
    expect(commission.earnedSatang).toBe(130_000);
    expect(commission.outstandingSatang).toBe(50_000);
    expect(commission.byStaff[0]?.name).toBe("Grace");
  });

  it("builds all twelve months, including months with no payments", () => {
    const months = monthlyCollected([
      payment({ id: "jan", amount: 100, approvedAt: new Date("2026-01-15T05:00:00.000Z") }),
      payment({ id: "oct", amount: 400, approvedAt: new Date("2026-10-15T05:00:00.000Z") }),
    ], 2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ month: 1, satang: 100, count: 1 });
    expect(months[9]).toMatchObject({ month: 10, satang: 400, count: 1 });
    expect(months[11]).toMatchObject({ month: 12, satang: 0, count: 0 });
  });

  it("does not call collected revenue profit when no direct cost is stored", () => {
    const ranked = serviceProfit([{ name: "Translation", amount: 1_500_000 }], [], startOfBangkokDay("2026-01-01"), endOfBangkokDay("2026-12-31"));
    expect(ranked[0]?.result).toBeNull();
  });
});

describe("historical financial questions", () => {
  it("reads the questions as different measurements", () => {
    expect(classifyFinanceQuestion("How much money has SiamEZ made since January?", now)).toMatchObject({ kind: "revenue", period: "this_year" });
    expect(classifyFinanceQuestion("Show me total revenue for 2026.", now)).toEqual({ kind: "revenue", period: "year", year: 2026 });
    expect(classifyFinanceQuestion("How much did Jun collect last month?", now)).toEqual({ kind: "revenue", period: "last_month", staffName: "Jun" });
    expect(classifyFinanceQuestion("How much revenue did Grace generate this year?", now)).toEqual({
      kind: "revenue",
      period: "this_year",
      staffName: "Grace",
      focus: "generated",
    });
    expect(classifyFinanceQuestion("Which employee generated the most revenue?", now)?.focus).toBe("by_staff");
    expect(classifyFinanceQuestion("How much commission has each employee earned?", now)).toMatchObject({ focus: "commission", period: "all" });
    expect(classifyFinanceQuestion("Show me all bookings attributed to Richie.", now)).toEqual({
      kind: "revenue",
      period: "all",
      staffName: "Richie",
      focus: "bookings",
    });
    expect(classifyFinanceQuestion("Compare Grace's revenue between September and October.", now)).toMatchObject({
      kind: "revenue_compare",
      staffName: "Grace",
      leftMonth: 9,
      rightMonth: 10,
    });
    expect(classifyFinanceQuestion("How much have we received in deposits?", now)).toMatchObject({ focus: "deposits", period: "all" });
    expect(classifyFinanceQuestion("How much have we paid in business expenses?", now)).toMatchObject({ focus: "expenses", period: "all" });
    expect(classifyFinanceQuestion("Compare our monthly revenue for the entire year.", now)).toMatchObject({ focus: "monthly", period: "year", year: 2026 });
    expect(classifyFinanceQuestion("How much money did we actually collect in October?", now)).toMatchObject({ period: "named", month: 10, year: 2026 });
    expect(classifyFinanceQuestion("How much money is currently outstanding?", now)).toBeNull();
    expect(classifyBackofficeIntent("How much money is currently outstanding?").kind).toBe("outstanding_payments");
    expect(classifyBackofficeIntent("Show me all customers who still owe us money.").kind).toBe("outstanding_payments");
  });
});
