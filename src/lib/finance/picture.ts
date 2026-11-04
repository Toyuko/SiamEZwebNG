/**
 * Pure summaries for the rest of the financial records.
 * Collected payments, deal value, and commission are never added together.
 * Amounts are integer satang.
 */

import { bangkokDateKey } from "./dates";
import { instantInRange, paymentRecognizedAt } from "./collected";
import { sumSatang, type MoneySatang } from "./money";

export type ExpenseFact = {
  id: string;
  type: string;
  amount: number;
  paymentStatus: string;
  transactionDate: Date | null;
  category: string;
  serviceName: string;
};

export type CommissionFact = {
  id: string;
  salesPersonId: string;
  salesPersonName: string;
  amount: number;
  status: string;
  closedAt: Date | null;
  paidAt: Date | null;
  caseId: string;
  caseNumber: string;
};

export type DealFact = {
  id: string;
  caseNumber: string;
  customerName: string;
  serviceName: string;
  salesPersonId: string | null;
  salesPersonName: string | null;
  status: string;
  closedAt: Date | null;
  dealValue: number | null;
};

export type Reconciliation = {
  queriedCount: number;
  databaseCount: number;
  queriedSatang: MoneySatang;
  databaseSatang: MoneySatang;
  reconciled: boolean;
};

const EARNED = new Set(["pending", "approved", "paid"]);
const COST = new Set(["STAFF_PAYMENT", "CASE_EXPENSE", "OPERATING_EXPENSE", "OTHER_EXPENSE"]);

function valid(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 0;
}

export function reconcileTotals(input: Omit<Reconciliation, "reconciled"> & { complete: boolean }): Reconciliation {
  const reconciled =
    input.complete && input.queriedCount === input.databaseCount && input.queriedSatang === input.databaseSatang;
  return {
    queriedCount: input.queriedCount,
    databaseCount: input.databaseCount,
    queriedSatang: input.queriedSatang,
    databaseSatang: input.databaseSatang,
    reconciled,
  };
}

export function sumExpenses(rows: ExpenseFact[], start: Date, end: Date): { total: MoneySatang; count: number; issues: string[] } {
  const seen = new Set<string>();
  const issues: string[] = [];
  let total = 0;
  let count = 0;
  for (const row of rows) {
    if (seen.has(row.id)) {
      issues.push(`Duplicate expense ${row.id} was counted once.`);
      continue;
    }
    seen.add(row.id);
    if (!COST.has(row.type) || row.paymentStatus === "CANCELLED") continue;
    if (!valid(row.amount)) {
      issues.push(`Expense ${row.id} has an invalid amount and was excluded.`);
      continue;
    }
    if (!row.transactionDate || !instantInRange(row.transactionDate, start, end)) continue;
    total += row.amount;
    count += 1;
  }
  return { total, count, issues };
}

export function summariseCommissions(
  rows: CommissionFact[],
  range: { start: Date; end: Date } | null,
  salesPersonId?: string | null
): {
  earnedSatang: MoneySatang;
  paidSatang: MoneySatang;
  outstandingSatang: MoneySatang;
  missingCloseDates: number;
  byStaff: { id: string; name: string; earned: MoneySatang; outstanding: MoneySatang }[];
} {
  const seen = new Set<string>();
  const byStaff = new Map<string, { id: string; name: string; earned: number; outstanding: number }>();
  let earnedSatang = 0;
  let paidSatang = 0;
  let outstandingSatang = 0;
  let missingCloseDates = 0;
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    if (!EARNED.has(row.status) || !valid(row.amount)) continue;
    if (salesPersonId && row.salesPersonId !== salesPersonId) continue;
    if (range && !row.closedAt) {
      missingCloseDates += 1;
      continue;
    }
    if (range && row.closedAt && !instantInRange(row.closedAt, range.start, range.end)) continue;
    earnedSatang += row.amount;
    if (row.status === "paid" && (!range || (row.paidAt != null && instantInRange(row.paidAt, range.start, range.end)))) {
      paidSatang += row.amount;
    }
    const current = byStaff.get(row.salesPersonId) ?? { id: row.salesPersonId, name: row.salesPersonName, earned: 0, outstanding: 0 };
    current.earned += row.amount;
    if (row.status === "pending" || row.status === "approved") {
      current.outstanding += row.amount;
      outstandingSatang += row.amount;
    }
    byStaff.set(row.salesPersonId, current);
  }
  return {
    earnedSatang,
    paidSatang,
    outstandingSatang,
    missingCloseDates,
    byStaff: [...byStaff.values()].sort((a, b) => b.outstanding - a.outstanding || b.earned - a.earned || a.name.localeCompare(b.name)),
  };
}

export function summariseDeals(
  rows: DealFact[],
  range: { start: Date; end: Date } | null,
  salesPersonId?: string | null
): { generatedSatang: MoneySatang; valuedCount: number; missingValueCount: number; byStaff: { id: string | null; name: string; amount: MoneySatang }[] } {
  const seen = new Set<string>();
  const byStaff = new Map<string, { id: string | null; name: string; amount: number }>();
  let generatedSatang = 0;
  let valuedCount = 0;
  let missingValueCount = 0;
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    if (row.status === "cancelled") continue;
    if (salesPersonId && row.salesPersonId !== salesPersonId) continue;
    if (range && (!row.closedAt || !instantInRange(row.closedAt, range.start, range.end))) continue;
    if (!range && !row.closedAt) continue;
    if (row.dealValue == null) {
      missingValueCount += 1;
      continue;
    }
    if (!valid(row.dealValue)) continue;
    generatedSatang += row.dealValue;
    valuedCount += 1;
    const key = row.salesPersonId ?? "none";
    const current = byStaff.get(key) ?? { id: row.salesPersonId, name: row.salesPersonName ?? "No deal closer", amount: 0 };
    current.amount += row.dealValue;
    byStaff.set(key, current);
  }
  return {
    generatedSatang,
    valuedCount,
    missingValueCount,
    byStaff: [...byStaff.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)),
  };
}

export function monthlyCollected(
  payments: { id: string; amount: number; status: string; approvedAt: Date | null; submittedAt: Date | null }[],
  year: number
): { month: number; satang: MoneySatang; count: number }[] {
  const buckets = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, satang: 0, count: 0 }));
  const seen = new Set<string>();
  const start = new Date(`${year}-01-01T00:00:00+07:00`);
  const end = new Date(`${year}-12-31T23:59:59.999+07:00`);
  for (const payment of payments) {
    if (seen.has(payment.id) || payment.status !== "approved" || !valid(payment.amount)) continue;
    seen.add(payment.id);
    const at = paymentRecognizedAt(payment);
    if (!at || !instantInRange(at, start, end)) continue;
    const month = Number(bangkokDateKey(at).slice(5, 7));
    const bucket = buckets[month - 1];
    if (!bucket) continue;
    bucket.satang += payment.amount;
    bucket.count += 1;
  }
  return buckets;
}

export function serviceProfit(
  collected: { name: string; amount: MoneySatang }[],
  expenses: ExpenseFact[],
  start: Date,
  end: Date
): { name: string; collected: MoneySatang; directCost: MoneySatang; result: MoneySatang | null }[] {
  const costs = new Map<string, number>();
  for (const expense of expenses) {
    if (!COST.has(expense.type) || expense.type === "OPERATING_EXPENSE" || expense.type === "STAFF_PAYMENT") continue;
    if (expense.paymentStatus === "CANCELLED" || !valid(expense.amount)) continue;
    if (!expense.transactionDate || !instantInRange(expense.transactionDate, start, end)) continue;
    costs.set(expense.serviceName, (costs.get(expense.serviceName) ?? 0) + expense.amount);
  }
  const anyDirectCost = [...costs.values()].some((amount) => amount > 0);
  return collected
    .map((row) => {
      const directCost = costs.get(row.name) ?? 0;
      return {
        name: row.name,
        collected: row.amount,
        directCost,
        result: anyDirectCost ? row.amount - directCost : null,
      };
    })
    .sort((a, b) => (b.result ?? b.collected) - (a.result ?? a.collected) || a.name.localeCompare(b.name));
}

export function approvedPageMatchesDatabase(
  payments: { id: string; amount: number; status: string; approvedAt: Date | null; submittedAt: Date | null }[],
  start: Date,
  end: Date
): { count: number; satang: MoneySatang } {
  const seen = new Set<string>();
  let count = 0;
  let satang = 0;
  for (const payment of payments) {
    if (seen.has(payment.id) || payment.status !== "approved" || !valid(payment.amount)) continue;
    const at = paymentRecognizedAt(payment);
    if (!at || !instantInRange(at, start, end)) continue;
    seen.add(payment.id);
    count += 1;
    satang = sumSatang([satang, payment.amount]);
  }
  return { count, satang };
}
