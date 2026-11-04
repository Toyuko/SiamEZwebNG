/**
 * Collected-revenue math shared by the finance dashboard rules and the command centre.
 * Amounts are integer satang. Booking totals and quotations are never added in.
 * The recognition date is the payment approval time, or the submission time only
 * when approval time was not stored. Booking creation date is not a payment date.
 */

import { endOfBangkokDay, startOfBangkokDay } from "./dates";
import { sumSatang, type MoneySatang } from "./money";

export type PaymentFact = {
  id: string;
  amount: number;
  status: string;
  approvedAt: Date | null;
  submittedAt: Date | null;
  caseId: string;
  caseNumber: string;
  customerName: string;
  serviceName: string;
  salesPersonId: string | null;
  salesPersonName: string | null;
  method?: string | null;
  kind?: string | null;
};

export type LedgerFact = {
  id: string;
  type: "REFUND" | "REVENUE" | "OTHER_INCOME";
  amount: number;
  paymentStatus: string;
  transactionDate: Date | null;
  relatedPaymentId: string | null;
  caseId: string | null;
  caseNumber: string | null;
  customerName: string;
  serviceName: string;
  salesPersonId: string | null;
  salesPersonName: string | null;
};

export type StatementLine = {
  id: string;
  at: Date;
  kind: "payment" | "ledger" | "refund";
  customerName: string;
  caseId: string | null;
  caseNumber: string | null;
  serviceName: string;
  amount: MoneySatang;
  status: string;
  staffName: string | null;
};

export type NamedTotal = { id: string | null; name: string; amount: MoneySatang };

export type FinanceStatement = {
  collectedSatang: MoneySatang;
  ledgerIncomeSatang: MoneySatang;
  grossCollectedSatang: MoneySatang;
  refundSatang: MoneySatang;
  netCollectedSatang: MoneySatang;
  paymentCount: number;
  refundCount: number;
  excludedStatusCount: number;
  unattributedCount: number;
  lines: StatementLine[];
  serviceTotals: NamedTotal[];
  staffTotals: NamedTotal[];
  customerTotals: NamedTotal[];
  methodTotals: NamedTotal[];
  depositSatang: MoneySatang;
  issues: string[];
};

export type StaffCandidate = {
  id: string;
  name: string | null;
  email: string;
  active: boolean;
};

export type StaffResolution =
  | { status: "one"; person: StaffCandidate }
  | { status: "none" }
  | { status: "ambiguous"; people: StaffCandidate[] }
  | { status: "incomplete" };

export function bangkokMonthRange(year: number, month: number): { start: Date; end: Date; label: string } {
  const startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endKey = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return {
    start: startOfBangkokDay(startKey),
    end: endOfBangkokDay(endKey),
    label: `${names[month - 1]} ${year}`,
  };
}

export function bangkokYearRange(year: number): { start: Date; end: Date; label: string } {
  return {
    start: startOfBangkokDay(`${year}-01-01`),
    end: endOfBangkokDay(`${year}-12-31`),
    label: `calendar year ${year}`,
  };
}

function norm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function resolveStaffName(query: string, people: StaffCandidate[]): StaffResolution {
  const needle = norm(query);
  if (!needle) return { status: "none" };
  const exact = people.filter((person) => norm(person.name ?? "") === needle || norm(person.email.split("@")[0] ?? "") === needle);
  if (exact.length === 1) return { status: "one", person: exact[0]! };
  if (exact.length > 1) return { status: "ambiguous", people: exact };
  const partial = people.filter((person) => {
    const name = norm(person.name ?? "");
    return name === needle || name.startsWith(`${needle} `);
  });
  if (partial.length === 1) return { status: "one", person: partial[0]! };
  if (partial.length > 1) return { status: "ambiguous", people: partial };
  return { status: "none" };
}

export function paymentRecognizedAt(payment: Pick<PaymentFact, "approvedAt" | "submittedAt">): Date | null {
  return payment.approvedAt ?? payment.submittedAt ?? null;
}

export function instantInRange(at: Date, start: Date, end: Date): boolean {
  const time = at.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function validAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 0;
}

function serviceMatches(name: string, query: string | null | undefined): boolean {
  if (!query) return true;
  const haystack = name.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (needle === "motorcycle" || needle === "motorbike") return /motorcycles?|motorbikes?/.test(haystack);
  return haystack.includes(needle);
}

function rank(rows: NamedTotal[]): NamedTotal[] {
  const totals = new Map<string, NamedTotal>();
  for (const row of rows) {
    const key = row.id ?? `name:${row.name}`;
    const current = totals.get(key) ?? { id: row.id, name: row.name, amount: 0 };
    current.amount += row.amount;
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

export function buildFinanceStatement(input: {
  payments: PaymentFact[];
  ledger: LedgerFact[];
  start: Date;
  end: Date;
  salesPersonId?: string | null;
  serviceQuery?: string | null;
}): FinanceStatement {
  const issues: string[] = [];
  const seenPayments = new Set<string>();
  const included: PaymentFact[] = [];
  let excludedStatusCount = 0;
  let unattributedCount = 0;

  for (const payment of input.payments) {
    if (seenPayments.has(payment.id)) {
      issues.push(`Duplicate payment ${payment.id} was counted once.`);
      continue;
    }
    seenPayments.add(payment.id);
    if (!validAmount(payment.amount)) {
      issues.push(`Payment ${payment.id} has an invalid amount and was excluded.`);
      continue;
    }
    if (payment.status !== "approved") {
      excludedStatusCount += 1;
      continue;
    }
    const at = paymentRecognizedAt(payment);
    if (!at) {
      issues.push(`Payment ${payment.id} has no approval or submission time and was excluded.`);
      continue;
    }
    if (!instantInRange(at, input.start, input.end)) continue;
    if (!payment.salesPersonId) unattributedCount += 1;
    if (input.salesPersonId && payment.salesPersonId !== input.salesPersonId) continue;
    if (!serviceMatches(payment.serviceName, input.serviceQuery)) continue;
    included.push(payment);
  }
  if (excludedStatusCount > 0) {
    issues.push(`Excluded ${excludedStatusCount} payment${excludedStatusCount === 1 ? "" : "s"} that are not approved.`);
  }

  const paymentIds = new Set(included.map((payment) => payment.id));
  const seenLedger = new Set<string>();
  const income: LedgerFact[] = [];
  const refunds: LedgerFact[] = [];
  for (const row of input.ledger) {
    if (seenLedger.has(row.id)) {
      issues.push(`Duplicate ledger row ${row.id} was counted once.`);
      continue;
    }
    seenLedger.add(row.id);
    if (row.paymentStatus === "CANCELLED") continue;
    if (!validAmount(row.amount) || row.amount === 0) {
      if (!validAmount(row.amount)) issues.push(`Ledger row ${row.id} has an invalid amount and was excluded.`);
      continue;
    }
    if (!row.transactionDate || !instantInRange(row.transactionDate, input.start, input.end)) continue;
    if (input.salesPersonId && row.salesPersonId !== input.salesPersonId) continue;
    if (!serviceMatches(row.serviceName, input.serviceQuery)) continue;
    if (row.type === "REFUND") {
      refunds.push(row);
      continue;
    }
    if (row.relatedPaymentId && paymentIds.has(row.relatedPaymentId)) {
      issues.push(`Ledger income ${row.id} repeats payment ${row.relatedPaymentId} and was excluded.`);
      continue;
    }
    income.push(row);
  }

  const collectedSatang = sumSatang(included.map((payment) => payment.amount));
  const ledgerIncomeSatang = sumSatang(income.map((row) => row.amount));
  const refundSatang = sumSatang(refunds.map((row) => row.amount));
  const grossCollectedSatang = collectedSatang + ledgerIncomeSatang;
  const lines: StatementLine[] = [
    ...included.map((payment) => ({
      id: payment.id,
      at: paymentRecognizedAt(payment)!,
      kind: "payment" as const,
      customerName: payment.customerName,
      caseId: payment.caseId,
      caseNumber: payment.caseNumber,
      serviceName: payment.serviceName,
      amount: payment.amount,
      status: "approved",
      staffName: payment.salesPersonName,
    })),
    ...income.map((row) => ({
      id: row.id,
      at: row.transactionDate!,
      kind: "ledger" as const,
      customerName: row.customerName,
      caseId: row.caseId,
      caseNumber: row.caseNumber,
      serviceName: row.serviceName,
      amount: row.amount,
      status: "ledger income",
      staffName: row.salesPersonName,
    })),
    ...refunds.map((row) => ({
      id: row.id,
      at: row.transactionDate!,
      kind: "refund" as const,
      customerName: row.customerName,
      caseId: row.caseId,
      caseNumber: row.caseNumber,
      serviceName: row.serviceName,
      amount: row.amount,
      status: "refund",
      staffName: row.salesPersonName,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));

  return {
    collectedSatang,
    ledgerIncomeSatang,
    grossCollectedSatang,
    refundSatang,
    netCollectedSatang: grossCollectedSatang - refundSatang,
    paymentCount: included.length,
    refundCount: refunds.length,
    excludedStatusCount,
    unattributedCount: input.salesPersonId ? unattributedCount : lines.filter((line) => line.kind === "payment" && !line.staffName).length,
    lines,
    serviceTotals: rank(
      included.map((payment) => ({ id: payment.serviceName, name: payment.serviceName, amount: payment.amount }))
        .concat(income.map((row) => ({ id: row.serviceName, name: row.serviceName, amount: row.amount })))
    ),
    staffTotals: rank(
      included.map((payment) => ({
        id: payment.salesPersonId,
        name: payment.salesPersonName ?? "No deal closer",
        amount: payment.amount,
      })).concat(income.map((row) => ({
        id: row.salesPersonId,
        name: row.salesPersonName ?? "No deal closer",
        amount: row.amount,
      })))
    ),
    customerTotals: rank(included.map((payment) => ({ id: payment.customerName, name: payment.customerName, amount: payment.amount }))),
    methodTotals: rank(included.map((payment) => ({ id: payment.method ?? "unspecified", name: payment.method ?? "unspecified", amount: payment.amount }))),
    depositSatang: sumSatang(included.filter((payment) => payment.kind === "initial").map((payment) => payment.amount)),
    issues,
  };
}

export type InvoiceBalance = {
  id: string;
  amount: number;
  status: string;
  paidSatang: number;
};

export function outstandingFromInvoices(invoices: InvoiceBalance[]): { total: MoneySatang; count: number; issues: string[] } {
  const seen = new Set<string>();
  const issues: string[] = [];
  let total = 0;
  let count = 0;
  for (const invoice of invoices) {
    if (seen.has(invoice.id)) {
      issues.push(`Duplicate invoice ${invoice.id} was counted once.`);
      continue;
    }
    seen.add(invoice.id);
    if (!validAmount(invoice.amount) || !validAmount(invoice.paidSatang)) {
      issues.push(`Invoice ${invoice.id} has an invalid amount and was excluded.`);
      continue;
    }
    if (invoice.status !== "unpaid" && invoice.status !== "pending_verification" && invoice.status !== "paid") continue;
    const remaining = invoice.amount - invoice.paidSatang;
    if (remaining <= 0) continue;
    total += remaining;
    count += 1;
  }
  return { total, count, issues };
}
