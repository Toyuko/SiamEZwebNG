import { describe, expect, it } from "vitest";
import {
  invoiceAmountDueNow,
  invoiceHasOptionalDeposit,
  invoiceRemainingBalance,
  isDepositSatisfied,
  isInvoiceFullyPaid,
  normalizeDepositAmount,
  sumApprovedPayments,
} from "@/lib/payments/invoice-deposit";

describe("invoice optional deposit", () => {
  const invoice = { amount: 1_000_000, depositAmount: 250_000 };

  it("normalizes deposit only when strictly between 0 and total", () => {
    expect(normalizeDepositAmount(null, 1000)).toBeNull();
    expect(normalizeDepositAmount(0, 1000)).toBeNull();
    expect(normalizeDepositAmount(1000, 1000)).toBeNull();
    expect(normalizeDepositAmount(250, 1000)).toBe(250);
  });

  it("charges deposit first, then remaining balance", () => {
    expect(invoiceAmountDueNow(invoice, 0)).toBe(250_000);
    expect(invoiceAmountDueNow(invoice, 250_000)).toBe(750_000);
    expect(invoiceAmountDueNow(invoice, 1_000_000)).toBe(0);
  });

  it("without deposit, due now equals remaining total", () => {
    const full = { amount: 1_000_000, depositAmount: null };
    expect(invoiceHasOptionalDeposit(full)).toBe(false);
    expect(invoiceAmountDueNow(full, 0)).toBe(1_000_000);
    expect(invoiceAmountDueNow(full, 300_000)).toBe(700_000);
  });

  it("tracks remaining and fully-paid from approved payments", () => {
    const paid = sumApprovedPayments([
      { amount: 250_000, status: "approved" },
      { amount: 100_000, status: "submitted" },
    ]);
    expect(paid).toBe(250_000);
    expect(isDepositSatisfied(invoice, paid)).toBe(true);
    expect(invoiceRemainingBalance(invoice, paid)).toBe(750_000);
    expect(isInvoiceFullyPaid(invoice, paid)).toBe(false);
    expect(isInvoiceFullyPaid(invoice, 1_000_000)).toBe(true);
  });
});
