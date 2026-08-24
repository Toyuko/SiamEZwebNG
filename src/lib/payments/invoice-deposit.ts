/**
 * Optional invoice deposit: `amount` is the full total; `depositAmount` (when set)
 * is due first. Remaining balance = amount − approved payments.
 */

export type InvoiceDepositFields = {
  amount: number;
  depositAmount?: number | null;
};

export type PaymentAmountStatus = {
  amount: number;
  status: string;
};

/** Normalize optional deposit; null when unset / invalid / not strictly between 0 and total. */
export function normalizeDepositAmount(
  depositAmount: number | null | undefined,
  invoiceTotalSatang: number
): number | null {
  if (depositAmount == null) return null;
  if (!Number.isFinite(depositAmount)) return null;
  const n = Math.round(depositAmount);
  if (n <= 0 || n >= invoiceTotalSatang) return null;
  return n;
}

export function sumApprovedPayments(payments: PaymentAmountStatus[]): number {
  return payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + Math.max(0, p.amount), 0);
}

export function invoiceRemainingBalance(
  invoice: Pick<InvoiceDepositFields, "amount">,
  approvedPaidSatang: number
): number {
  return Math.max(0, invoice.amount - Math.max(0, approvedPaidSatang));
}

export function isInvoiceFullyPaid(
  invoice: Pick<InvoiceDepositFields, "amount">,
  approvedPaidSatang: number
): boolean {
  return invoiceRemainingBalance(invoice, approvedPaidSatang) <= 0 && invoice.amount > 0;
}

/** True when a deposit is configured and approved payments cover it (may still owe balance). */
export function isDepositSatisfied(
  invoice: InvoiceDepositFields,
  approvedPaidSatang: number
): boolean {
  const deposit = normalizeDepositAmount(invoice.depositAmount, invoice.amount);
  if (deposit == null) return true;
  return approvedPaidSatang >= deposit;
}

/**
 * Amount the client should pay on the next submission.
 * With a deposit: pay deposit first, then the remaining balance.
 */
export function invoiceAmountDueNow(
  invoice: InvoiceDepositFields,
  approvedPaidSatang = 0
): number {
  const remaining = invoiceRemainingBalance(invoice, approvedPaidSatang);
  if (remaining <= 0) return 0;

  const deposit = normalizeDepositAmount(invoice.depositAmount, invoice.amount);
  if (deposit == null) return remaining;

  if (approvedPaidSatang < deposit) {
    return Math.min(deposit - approvedPaidSatang, remaining);
  }
  return remaining;
}

export function invoiceHasOptionalDeposit(invoice: InvoiceDepositFields): boolean {
  return normalizeDepositAmount(invoice.depositAmount, invoice.amount) != null;
}
