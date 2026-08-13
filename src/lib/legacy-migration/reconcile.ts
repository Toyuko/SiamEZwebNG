import type { PrismaClient } from "@prisma/client";
import { satangToThb } from "./money";
import type { LegacyMoneyTotals, TransformedBundle } from "./types";

export type DestinationSnapshot = {
  customers: number;
  cases: number;
  invoices: number;
  payments: number;
  approvedPaymentThb: number;
  unpaidInvoiceThb: number;
  legacyCustomers: number;
  legacyCases: number;
  legacyInvoices: number;
  legacyPayments: number;
};

export type Reconciliation = {
  destination: DestinationSnapshot;
  expected: {
    customers: number;
    jobs: number;
    invoices: number;
    payments: number;
    paidThb: number;
    outstandingThb: number;
    expensesThb: number;
  };
  differences: {
    customers: number;
    jobs: number;
    invoices: number;
    payments: number;
    revenueThb: number;
    outstandingThb: number;
    expensesThb: number;
  };
  ok: boolean;
};

export async function snapshotDestination(prisma: PrismaClient): Promise<DestinationSnapshot> {
  const [
    customers,
    cases,
    invoices,
    payments,
    approved,
    unpaid,
    legacyCustomers,
    legacyCases,
    legacyInvoices,
    legacyPayments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "customer" } }),
    prisma.case.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.payment.aggregate({ where: { status: "approved" }, _sum: { amount: true } }),
    prisma.invoice.aggregate({
      where: { status: { in: ["unpaid", "pending_verification", "draft"] } },
      _sum: { amount: true },
    }),
    prisma.user.count({ where: { legacyCustomerId: { not: null } } }),
    prisma.case.count({ where: { legacyJobId: { not: null } } }),
    prisma.invoice.count({ where: { legacyOrderId: { not: null } } }),
    prisma.payment.count({ where: { legacyOrderId: { not: null } } }),
  ]);

  return {
    customers,
    cases,
    invoices,
    payments,
    approvedPaymentThb: satangToThb(approved._sum.amount ?? 0),
    unpaidInvoiceThb: satangToThb(unpaid._sum.amount ?? 0),
    legacyCustomers,
    legacyCases,
    legacyInvoices,
    legacyPayments,
  };
}

export function reconcile(
  bundle: TransformedBundle,
  money: LegacyMoneyTotals,
  destination: DestinationSnapshot | null
): Reconciliation {
  const expected = {
    customers: bundle.customers.length,
    jobs: bundle.cases.length,
    invoices: bundle.invoices.length,
    payments: bundle.payments.length,
    paidThb: money.paidThb,
    outstandingThb: money.outstandingThb,
    expensesThb: money.jobCostThb,
  };

  const destLegacyCustomers = destination?.legacyCustomers ?? 0;
  const destLegacyCases = destination?.legacyCases ?? 0;
  const destLegacyInvoices = destination?.legacyInvoices ?? 0;
  const destLegacyPayments = destination?.legacyPayments ?? 0;
  const destRevenue = destination?.approvedPaymentThb ?? 0;

  const differences = {
    customers: destLegacyCustomers - expected.customers,
    jobs: destLegacyCases - expected.jobs,
    invoices: destLegacyInvoices - expected.invoices,
    payments: destLegacyPayments - expected.payments,
    revenueThb: round2(destRevenue - expected.paidThb),
    outstandingThb: round2((destination?.unpaidInvoiceThb ?? 0) - expected.outstandingThb),
    expensesThb: 0,
  };

  const ok =
    destination == null ||
    (differences.customers === 0 &&
      differences.jobs === 0 &&
      differences.invoices === 0 &&
      differences.payments === 0 &&
      differences.revenueThb === 0);

  return { destination: destination ?? emptySnapshot(), expected, differences, ok };
}

function emptySnapshot(): DestinationSnapshot {
  return {
    customers: 0,
    cases: 0,
    invoices: 0,
    payments: 0,
    approvedPaymentThb: 0,
    unpaidInvoiceThb: 0,
    legacyCustomers: 0,
    legacyCases: 0,
    legacyInvoices: 0,
    legacyPayments: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
