import { describe, expect, it } from "vitest";
import {
  caseStatusAfterInvoiceKind,
  pickOpenInvoiceForManualPayment,
} from "@/lib/payments/manual";

describe("manual payment settlement helpers", () => {
  it("maps full invoices to case status paid", () => {
    expect(caseStatusAfterInvoiceKind("full")).toBe("paid");
  });

  it("maps partial invoice kinds to in_progress", () => {
    expect(caseStatusAfterInvoiceKind("initial")).toBe("in_progress");
    expect(caseStatusAfterInvoiceKind("milestone")).toBe("in_progress");
    expect(caseStatusAfterInvoiceKind("balance")).toBe("in_progress");
  });

  it("picks the newest open invoice", () => {
    const invoices = [
      { id: "old-draft", status: "draft", createdAt: new Date("2026-01-01") },
      { id: "paid", status: "paid", createdAt: new Date("2026-02-01") },
      { id: "new-unpaid", status: "unpaid", createdAt: new Date("2026-03-01") },
      { id: "pending", status: "pending_verification", createdAt: new Date("2026-02-15") },
    ];
    expect(pickOpenInvoiceForManualPayment(invoices)?.id).toBe("new-unpaid");
  });

  it("returns null when every invoice is already settled or rejected", () => {
    const invoices = [
      { id: "paid", status: "paid", createdAt: new Date("2026-03-01") },
      { id: "rejected", status: "rejected", createdAt: new Date("2026-02-01") },
    ];
    expect(pickOpenInvoiceForManualPayment(invoices)).toBeNull();
  });
});
