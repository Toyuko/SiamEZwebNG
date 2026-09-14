/**
 * Pure financial calculation helpers (unit-testable).
 * Amounts are satang integers. Cancelled transactions never count.
 */

import {
  grossMarginPercent,
  netMarginPercent,
  roundMargin,
  sumSatang,
  type MoneySatang,
} from "./money";

export const COST_TYPES = [
  "STAFF_PAYMENT",
  "CASE_EXPENSE",
  "OPERATING_EXPENSE",
  "OTHER_EXPENSE",
] as const;

export const REVENUE_TYPES = ["REVENUE", "OTHER_INCOME"] as const;

/** Statuses that count toward costs / paid outflows. */
export const ACTIVE_COST_STATUSES = ["UNPAID", "APPROVED", "PAID"] as const;

/** Statuses that count as cash paid to staff/vendors. */
export const PAID_OUT_STATUSES = ["PAID"] as const;

export type TxLike = {
  type: string;
  amount: number;
  paymentStatus: string;
};

export type PaymentLike = {
  amount: number;
  status: string;
};

export type InvoiceLike = {
  amount: number;
  status: string;
  depositAmount?: number | null;
};

export type QuoteLike = {
  amount: number;
  status?: string;
};

export type CaseFinancialSummary = {
  quotedRevenue: MoneySatang;
  invoicedRevenue: MoneySatang;
  paidRevenue: MoneySatang;
  outstandingRevenue: MoneySatang;
  refunds: MoneySatang;
  netRevenue: MoneySatang;
  staffCosts: MoneySatang;
  staffCostsPaid: MoneySatang;
  staffCostsOwed: MoneySatang;
  otherDirectCosts: MoneySatang;
  totalDirectCosts: MoneySatang;
  grossProfit: MoneySatang;
  grossMargin: number;
};

export type BusinessFinancialSummary = {
  revenue: MoneySatang;
  refunds: MoneySatang;
  netRevenue: MoneySatang;
  directCosts: MoneySatang;
  staffCosts: MoneySatang;
  caseExpenses: MoneySatang;
  grossProfit: MoneySatang;
  grossMargin: number;
  operatingExpenses: MoneySatang;
  netProfit: MoneySatang;
  netMargin: number;
  accountsReceivable: MoneySatang;
  accountsPayable: MoneySatang;
};

function isActiveCost(tx: TxLike): boolean {
  return (
    ACTIVE_COST_STATUSES.includes(tx.paymentStatus as (typeof ACTIVE_COST_STATUSES)[number]) &&
    tx.paymentStatus !== "CANCELLED"
  );
}

function isCancelled(tx: TxLike): boolean {
  return tx.paymentStatus === "CANCELLED";
}

export function sumApprovedCustomerPayments(payments: PaymentLike[]): MoneySatang {
  return sumSatang(payments.filter((p) => p.status === "approved").map((p) => p.amount));
}

export function sumInvoicedAmount(invoices: InvoiceLike[]): MoneySatang {
  return sumSatang(
    invoices
      .filter((i) => i.status !== "draft" && i.status !== "rejected")
      .map((i) => i.amount)
  );
}

export function sumQuotedAmount(quotes: QuoteLike[]): MoneySatang {
  // Prefer accepted / converted; fall back to latest non-cancelled
  const usable = quotes.filter(
    (q) => q.status !== "cancelled" && q.status !== "rejected" && q.status !== "expired"
  );
  if (usable.length === 0) return 0;
  return Math.max(...usable.map((q) => q.amount));
}

export function sumRefunds(transactions: TxLike[]): MoneySatang {
  return sumSatang(
    transactions
      .filter((t) => t.type === "REFUND" && !isCancelled(t))
      .map((t) => t.amount)
  );
}

export function sumStaffCosts(transactions: TxLike[]): MoneySatang {
  return sumSatang(
    transactions
      .filter((t) => t.type === "STAFF_PAYMENT" && isActiveCost(t))
      .map((t) => t.amount)
  );
}

export function sumStaffCostsPaid(transactions: TxLike[]): MoneySatang {
  return sumSatang(
    transactions
      .filter((t) => t.type === "STAFF_PAYMENT" && t.paymentStatus === "PAID")
      .map((t) => t.amount)
  );
}

export function sumStaffCostsOwed(transactions: TxLike[]): MoneySatang {
  return sumSatang(
    transactions
      .filter(
        (t) =>
          t.type === "STAFF_PAYMENT" &&
          (t.paymentStatus === "UNPAID" || t.paymentStatus === "APPROVED")
      )
      .map((t) => t.amount)
  );
}

export function sumCaseExpenses(transactions: TxLike[]): MoneySatang {
  return sumSatang(
    transactions
      .filter(
        (t) =>
          (t.type === "CASE_EXPENSE" || t.type === "OTHER_EXPENSE") && isActiveCost(t)
      )
      .map((t) => t.amount)
  );
}

export function sumOperatingExpenses(transactions: TxLike[]): MoneySatang {
  return sumSatang(
    transactions
      .filter((t) => t.type === "OPERATING_EXPENSE" && isActiveCost(t))
      .map((t) => t.amount)
  );
}

export function sumLedgerRevenue(transactions: TxLike[]): MoneySatang {
  return sumSatang(
    transactions
      .filter(
        (t) =>
          (t.type === "REVENUE" || t.type === "OTHER_INCOME") && !isCancelled(t)
      )
      .map((t) => t.amount)
  );
}

/**
 * Case financial summary.
 * Paid revenue = approved Payment amounts (existing system).
 * Ledger REVENUE/OTHER_INCOME on the case are additive (manual adjustments).
 * Refunds reduce net revenue.
 */
export function computeCaseFinancialSummary(input: {
  payments: PaymentLike[];
  invoices: InvoiceLike[];
  quotes: QuoteLike[];
  transactions: TxLike[];
}): CaseFinancialSummary {
  const paidFromPayments = sumApprovedCustomerPayments(input.payments);
  const ledgerRevenue = sumLedgerRevenue(input.transactions);
  const paidRevenue = paidFromPayments + ledgerRevenue;
  const refunds = sumRefunds(input.transactions);
  const netRevenue = paidRevenue - refunds;

  const staffCosts = sumStaffCosts(input.transactions);
  const staffCostsPaid = sumStaffCostsPaid(input.transactions);
  const staffCostsOwed = sumStaffCostsOwed(input.transactions);
  const otherDirectCosts = sumCaseExpenses(input.transactions);
  const totalDirectCosts = staffCosts + otherDirectCosts;

  const grossProfit = netRevenue - totalDirectCosts;
  const grossMargin = roundMargin(grossMarginPercent(netRevenue, grossProfit));

  const invoicedRevenue = sumInvoicedAmount(input.invoices);
  const quotedRevenue = sumQuotedAmount(input.quotes) || invoicedRevenue;
  const outstandingRevenue = Math.max(0, invoicedRevenue - paidFromPayments);

  return {
    quotedRevenue,
    invoicedRevenue,
    paidRevenue,
    outstandingRevenue,
    refunds,
    netRevenue,
    staffCosts,
    staffCostsPaid,
    staffCostsOwed,
    otherDirectCosts,
    totalDirectCosts,
    grossProfit,
    grossMargin,
  };
}

export function computeBusinessFinancialSummary(input: {
  /** Approved customer payments in range (satang). */
  paidCustomerRevenue: MoneySatang;
  transactions: TxLike[];
  accountsReceivable: MoneySatang;
  accountsPayable: MoneySatang;
}): BusinessFinancialSummary {
  const ledgerRevenue = sumLedgerRevenue(input.transactions);
  const revenue = input.paidCustomerRevenue + ledgerRevenue;
  const refunds = sumRefunds(input.transactions);
  const netRevenue = revenue - refunds;

  const staffCosts = sumStaffCosts(input.transactions);
  const caseExpenses = sumCaseExpenses(input.transactions);
  const directCosts = staffCosts + caseExpenses;
  const grossProfit = netRevenue - directCosts;
  const grossMargin = roundMargin(grossMarginPercent(netRevenue, grossProfit));

  const operatingExpenses = sumOperatingExpenses(input.transactions);
  const netProfit = grossProfit - operatingExpenses;
  const netMargin = roundMargin(netMarginPercent(netRevenue, netProfit));

  return {
    revenue,
    refunds,
    netRevenue,
    directCosts,
    staffCosts,
    caseExpenses,
    grossProfit,
    grossMargin,
    operatingExpenses,
    netProfit,
    netMargin,
    accountsReceivable: input.accountsReceivable,
    accountsPayable: input.accountsPayable,
  };
}

export type ReceivableStatus = "CURRENT" | "DUE_SOON" | "OVERDUE" | "PAID";

export function receivableStatus(
  outstanding: MoneySatang,
  dueDate: Date | null | undefined,
  now: Date = new Date()
): ReceivableStatus {
  if (outstanding <= 0) return "PAID";
  if (!dueDate) return "CURRENT";
  const ms = dueDate.getTime() - now.getTime();
  const days = ms / 86_400_000;
  if (days < 0) return "OVERDUE";
  if (days <= 7) return "DUE_SOON";
  return "CURRENT";
}

export function daysOverdue(dueDate: Date | null | undefined, now: Date = new Date()): number {
  if (!dueDate) return 0;
  const days = Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000);
  return days > 0 ? days : 0;
}

/** Expense / staff payment category labels for UI. */
export const CASE_EXPENSE_CATEGORIES = [
  "government_fee",
  "translation_fee",
  "mfa_fee",
  "transportation",
  "fuel",
  "parking",
  "courier",
  "printing",
  "materials",
  "contractor",
  "advertising",
  "bank_fee",
  "service_handling",
  "other",
] as const;

export const OPERATING_EXPENSE_CATEGORIES = [
  "office_rent",
  "electricity",
  "internet",
  "software",
  "advertising",
  "facebook_ads",
  "google_ads",
  "phone",
  "insurance",
  "office_supplies",
  "equipment",
  "salaries",
  "accounting",
  "legal",
  "miscellaneous",
  "other",
] as const;

export const STAFF_PAYMENT_CATEGORIES = [
  "service_handling",
  "transportation",
  "translation",
  "coordination",
  "commission",
  "bonus",
  "other",
] as const;
