import { describe, expect, it } from "vitest";
import { isManualPaymentConfigured, paymentConfig } from "@/config/payments";
import {
  caseStatusAfterInvoiceKind,
  pickOpenInvoiceForManualPayment,
} from "@/lib/payments/manual";

describe("Wise payment defaults", () => {
  it("exposes the public Wise receive tag, pay link, and QR", () => {
    expect(paymentConfig.wise.accountId).toBe("@touygordondouglasphanchanas");
    expect(paymentConfig.wise.beneficiary).toBe("Touy Smith");
    expect(paymentConfig.wise.payUrl).toBe(
      "https://wise.com/pay/me/touygordondouglasphanchanas"
    );
    expect(paymentConfig.wise.qrImage).toBe("/images/payment/wise-qr.png");
    expect(paymentConfig.wise.details).toContain("@touygordondouglasphanchanas");
    expect(isManualPaymentConfigured()).toBe(true);
  });
});

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
