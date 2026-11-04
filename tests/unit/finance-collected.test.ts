import { describe, expect, it } from "vitest";
import { classifyBackofficeIntent, classifyFinanceQuestion, parseClassifierJson } from "@/lib/backoffice/intent";
import { buildFinanceStatement, outstandingFromInvoices, resolveStaffName, bangkokMonthRange, type LedgerFact, type PaymentFact } from "@/lib/finance/collected";
import { endOfBangkokDay, startOfBangkokDay } from "@/lib/finance/dates";

const OCTOBER = {
  start: startOfBangkokDay("2026-10-01"),
  end: endOfBangkokDay("2026-10-31"),
};

function payment(overrides: Partial<PaymentFact> & Pick<PaymentFact, "id" | "amount">): PaymentFact {
  return {
    status: "approved",
    approvedAt: new Date("2026-10-15T05:00:00.000Z"),
    submittedAt: new Date("2026-10-15T04:00:00.000Z"),
    caseId: "case-1",
    caseNumber: "SE-1",
    customerName: "Customer A",
    serviceName: "Driver's License",
    salesPersonId: "grace",
    salesPersonName: "Grace",
    ...overrides,
  };
}

function refund(amount: number, id = "refund-1"): LedgerFact {
  return {
    id,
    type: "REFUND",
    amount,
    paymentStatus: "PAID",
    transactionDate: new Date("2026-10-20T05:00:00.000Z"),
    relatedPaymentId: null,
    caseId: "case-1",
    caseNumber: "SE-1",
    customerName: "Customer A",
    serviceName: "Driver's License",
    salesPersonId: "grace",
    salesPersonName: "Grace",
  };
}

function october(payments: PaymentFact[], ledger: LedgerFact[] = [], salesPersonId?: string) {
  return buildFinanceStatement({ payments, ledger, ...OCTOBER, salesPersonId });
}

describe("collected revenue", () => {
  it("sums every approved October payment across customers", () => {
    const statement = october([
      payment({ id: "p1", amount: 1_500_000, customerName: "Customer A", caseId: "a", caseNumber: "SE-A" }),
      payment({ id: "p2", amount: 2_000_000, customerName: "Customer B", serviceName: "Marriage Registration", caseId: "b", caseNumber: "SE-B", salesPersonId: "ada", salesPersonName: "Ada" }),
      payment({ id: "p3", amount: 450_000, customerName: "Customer C", serviceName: "Translation", caseId: "c", caseNumber: "SE-C", salesPersonId: "jun", salesPersonName: "Jun" }),
    ]);
    expect(statement.collectedSatang).toBe(3_950_000);
    expect(statement.paymentCount).toBe(3);
    expect(statement.netCollectedSatang).toBe(3_950_000);
  });

  it("keeps only approved payments", () => {
    const statement = october([
      payment({ id: "ok", amount: 1_500_000 }),
      payment({ id: "waiting", amount: 900_000, status: "submitted" }),
      payment({ id: "no", amount: 800_000, status: "rejected" }),
    ]);
    expect(statement.collectedSatang).toBe(1_500_000);
    expect(statement.paymentCount).toBe(1);
    expect(statement.excludedStatusCount).toBe(2);
  });

  it("counts a deposit and its balance once each, never the invoice total as well", () => {
    const statement = october([
      payment({ id: "deposit", amount: 500_000 }),
      payment({ id: "balance", amount: 1_000_000 }),
    ]);
    expect(statement.collectedSatang).toBe(1_500_000);
    expect(statement.collectedSatang).not.toBe(1_500_000 + 1_500_000);
  });

  it("subtracts refunds from net collected and does not add them to revenue", () => {
    const statement = october([payment({ id: "p1", amount: 1_500_000 })], [refund(200_000)]);
    expect(statement.collectedSatang).toBe(1_500_000);
    expect(statement.refundSatang).toBe(200_000);
    expect(statement.netCollectedSatang).toBe(1_300_000);
    expect(statement.grossCollectedSatang).toBe(1_500_000);
  });

  it("returns Grace's payments and not the company total", () => {
    const statement = october([
      payment({ id: "g", amount: 1_500_000, salesPersonId: "grace", salesPersonName: "Grace" }),
      payment({ id: "a", amount: 2_000_000, salesPersonId: "ada", salesPersonName: "Ada" }),
    ], [], "grace");
    expect(statement.collectedSatang).toBe(1_500_000);
    expect(statement.lines.map((line) => line.customerName)).toEqual(["Customer A"]);
  });

  it("returns another employee's payments", () => {
    const statement = october([
      payment({ id: "g", amount: 1_500_000, salesPersonId: "grace" }),
      payment({ id: "a", amount: 2_000_000, salesPersonId: "ada", salesPersonName: "Ada", customerName: "Customer B" }),
    ], [], "ada");
    expect(statement.collectedSatang).toBe(2_000_000);
    expect(statement.paymentCount).toBe(1);
  });

  it("returns zero when the staff member has no attributed payments", () => {
    const statement = october([
      payment({ id: "g", amount: 1_500_000, salesPersonId: "grace" }),
    ], [], "jun");
    expect(statement.collectedSatang).toBe(0);
    expect(statement.paymentCount).toBe(0);
    expect(statement.netCollectedSatang).toBe(0);
  });

  it("includes the first and last instants of October in Bangkok and excludes the surrounding minutes", () => {
    const statement = october([
      payment({ id: "before", amount: 100, approvedAt: new Date("2026-09-30T16:59:59.000Z") }),
      payment({ id: "open", amount: 200, approvedAt: new Date("2026-09-30T17:00:00.000Z") }),
      payment({ id: "close", amount: 400, approvedAt: new Date("2026-10-31T16:59:59.999Z") }),
      payment({ id: "after", amount: 800, approvedAt: new Date("2026-10-31T17:00:00.000Z") }),
    ]);
    expect(statement.collectedSatang).toBe(600);
    expect(statement.lines.map((line) => line.id)).toEqual(["open", "close"]);
    const range = bangkokMonthRange(2026, 10);
    expect(range.start.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-31T16:59:59.999Z");
  });

  it("compares September and October as separate totals", () => {
    const september = buildFinanceStatement({
      payments: [payment({ id: "sep", amount: 700_000, approvedAt: new Date("2026-09-15T05:00:00.000Z") })],
      ledger: [],
      start: startOfBangkokDay("2026-09-01"),
      end: endOfBangkokDay("2026-09-30"),
    });
    const octoberStatement = october([payment({ id: "oct", amount: 1_500_000 })]);
    expect(september.collectedSatang).toBe(700_000);
    expect(octoberStatement.collectedSatang).toBe(1_500_000);
    expect(octoberStatement.collectedSatang - september.collectedSatang).toBe(800_000);
  });

  it("counts a duplicated payment id once", () => {
    const statement = october([
      payment({ id: "same", amount: 1_500_000 }),
      payment({ id: "same", amount: 1_500_000 }),
    ]);
    expect(statement.collectedSatang).toBe(1_500_000);
    expect(statement.paymentCount).toBe(1);
    expect(statement.issues.some((issue) => issue.includes("Duplicate payment same"))).toBe(true);
  });

  it("keeps multiple payments on one booking", () => {
    const statement = october([
      payment({ id: "first", amount: 400_000, caseId: "same-case" }),
      payment({ id: "second", amount: 600_000, caseId: "same-case" }),
    ]);
    expect(statement.collectedSatang).toBe(1_000_000);
    expect(statement.paymentCount).toBe(2);
  });

  it("calculates outstanding as invoice minus approved payments already received", () => {
    const result = outstandingFromInvoices([
      { id: "unpaid", amount: 1_000_000, status: "unpaid", paidSatang: 400_000 },
      { id: "pending", amount: 200_000, status: "pending_verification", paidSatang: 0 },
      { id: "draft", amount: 9_000_000, status: "draft", paidSatang: 0 },
      { id: "rejected", amount: 9_000_000, status: "rejected", paidSatang: 0 },
      { id: "unpaid", amount: 1_000_000, status: "unpaid", paidSatang: 400_000 },
    ]);
    expect(result.total).toBe(800_000);
    expect(result.count).toBe(2);
  });

  it("asks which Grace when two staff records share the name", () => {
    const resolved = resolveStaffName("Grace", [
      { id: "1", name: "Grace", email: "grace.a@siamez.com", active: true },
      { id: "2", name: "Grace", email: "grace.b@siamez.com", active: true },
    ]);
    expect(resolved.status).toBe("ambiguous");
    if (resolved.status === "ambiguous") expect(resolved.people).toHaveLength(2);
  });

  it("keeps payments with no deal closer in the company total only", () => {
    const company = october([
      payment({ id: "owned", amount: 1_500_000, salesPersonId: "grace", salesPersonName: "Grace" }),
      payment({ id: "loose", amount: 250_000, salesPersonId: null, salesPersonName: null, customerName: "Walk-in" }),
    ]);
    const grace = october([
      payment({ id: "owned", amount: 1_500_000, salesPersonId: "grace", salesPersonName: "Grace" }),
      payment({ id: "loose", amount: 250_000, salesPersonId: null, salesPersonName: null }),
    ], [], "grace");
    expect(company.collectedSatang).toBe(1_750_000);
    expect(company.unattributedCount).toBe(1);
    expect(grace.collectedSatang).toBe(1_500_000);
  });

  it("drops an approved payment that has no date and an amount that is not integer satang", () => {
    const statement = october([
      payment({ id: "nodate", amount: 100, approvedAt: null, submittedAt: null }),
      payment({ id: "float", amount: 10.5 }),
      payment({ id: "ok", amount: 300 }),
    ]);
    expect(statement.collectedSatang).toBe(300);
    expect(statement.issues.some((issue) => issue.includes("nodate"))).toBe(true);
    expect(statement.issues.some((issue) => issue.includes("float"))).toBe(true);
  });
});

describe("financial questions", () => {
  const now = new Date("2026-11-04T05:00:00+07:00");

  it("keeps a plain this-month question on the existing intent", () => {
    expect(classifyBackofficeIntent("Show me this month's revenue.")).toEqual({ kind: "revenue", period: "this_month" });
  });

  it("reads October 2026 instead of the current month", () => {
    expect(classifyFinanceQuestion("How much revenue did we make in October 2026?", now)).toEqual({
      kind: "revenue",
      period: "named",
      month: 10,
      year: 2026,
    });
  });

  it("reads Grace's October revenue instead of the company total", () => {
    expect(classifyFinanceQuestion("How much did Grace make in October 2026?", now)).toEqual({
      kind: "revenue",
      period: "named",
      month: 10,
      year: 2026,
      staffName: "Grace",
    });
  });

  it("does not let the model replace October or Grace with this month", () => {
    expect(parseClassifierJson({ kind: "revenue", period: "this_month" }, "How much did Grace make in October 2026?")).toEqual({
      kind: "revenue",
      period: "named",
      month: 10,
      year: 2026,
      staffName: "Grace",
    });
  });

  it("compares named months and keeps a service filter", () => {
    expect(classifyFinanceQuestion("Compare September and October revenue", now)?.kind).toBe("revenue_compare");
    expect(classifyFinanceQuestion("How much revenue came from motorcycle services?", now)).toMatchObject({
      kind: "revenue",
      serviceQuery: "motorcycle",
    });
  });
});
