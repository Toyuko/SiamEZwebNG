import type { DuplicateReport, LegacyExtract, LegacyMoneyTotals, MigrationReportCounts, TransformedBundle, ValidationIssue } from "./types";
import type { ImportResult } from "./import";
import type { Reconciliation } from "./reconcile";

export function buildReportCounts(options: {
  extract: LegacyExtract;
  bundle: TransformedBundle;
  money: LegacyMoneyTotals;
  duplicates: DuplicateReport;
  issues: ValidationIssue[];
  importResult?: ImportResult | null;
  reconciliation?: Reconciliation | null;
}): MigrationReportCounts {
  const errors = (entity: string) =>
    options.issues.filter((i) => i.severity === "error" && i.entity === entity).length;
  const migratedCustomers = options.importResult
    ? options.importResult.created.customers + options.importResult.reused.customers
    : options.bundle.customers.length;
  const migratedJobs = options.importResult
    ? options.importResult.created.cases + options.importResult.reused.cases
    : options.bundle.cases.length;
  const migratedInvoices = options.importResult
    ? options.importResult.created.invoices + options.importResult.reused.invoices
    : options.bundle.invoices.length;
  const migratedPayments = options.importResult
    ? options.importResult.created.payments + options.importResult.reused.payments
    : options.bundle.payments.length;
  const newRevenue = options.reconciliation?.destination.approvedPaymentThb ?? options.money.paidThb;
  const newOutstanding = options.reconciliation?.destination.unpaidInvoiceThb ?? options.money.outstandingThb;

  return {
    customers: {
      legacy: options.extract.clients.length,
      migrated: migratedCustomers,
      duplicates: options.duplicates.likelyDuplicates.length + options.duplicates.conflicts.length,
      errors: errors("customer"),
    },
    jobs: {
      legacy: options.extract.jobs.length,
      migrated: migratedJobs,
      errors: errors("job"),
    },
    bookings: {
      legacy: options.extract.jobs.length,
      migrated: migratedJobs,
      errors: errors("job"),
    },
    invoices: {
      legacy: options.extract.orders.filter((o) => (o.payment_status ?? "").toLowerCase() !== "cancelled").length,
      migrated: migratedInvoices,
      errors: errors("invoice"),
    },
    payments: {
      legacy: options.extract.orders.filter((o) => (o.payment_status ?? "").toLowerCase() === "paid").length,
      migrated: migratedPayments,
      errors: errors("payment"),
    },
    revenueThb: {
      legacy: options.money.paidThb,
      neu: newRevenue,
      difference: round2(newRevenue - options.money.paidThb),
    },
    outstandingThb: {
      legacy: options.money.outstandingThb,
      neu: newOutstanding,
      difference: round2(newOutstanding - options.money.outstandingThb),
    },
    expensesThb: {
      legacy: options.money.jobCostThb,
      neu: options.money.jobCostThb,
      difference: 0,
    },
  };
}

export function formatMigrationReportText(options: {
  counts: MigrationReportCounts;
  money: LegacyMoneyTotals;
  duplicates: DuplicateReport;
  issues: ValidationIssue[];
  dryRun: boolean;
  notes: string[];
}): string {
  const { counts, money, duplicates, issues, dryRun, notes } = options;
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return [
    "SIAMEZ DATA MIGRATION REPORT",
    dryRun ? "Mode: DRY-RUN (no destination writes)" : "Mode: APPLY",
    "",
    "Customers",
    `Legacy: ${counts.customers.legacy}`,
    `Migrated: ${counts.customers.migrated}`,
    `Duplicates: ${counts.customers.duplicates}`,
    `Errors: ${counts.customers.errors}`,
    "",
    "Jobs",
    `Legacy: ${counts.jobs.legacy}`,
    `Migrated: ${counts.jobs.migrated}`,
    `Errors: ${counts.jobs.errors}`,
    "",
    "Bookings",
    `Legacy: ${counts.bookings.legacy}`,
    `Migrated: ${counts.bookings.migrated}`,
    `Errors: ${counts.bookings.errors}`,
    "",
    "Invoices",
    `Legacy: ${counts.invoices.legacy}`,
    `Migrated: ${counts.invoices.migrated}`,
    `Errors: ${counts.invoices.errors}`,
    "",
    "Payments",
    `Legacy: ${counts.payments.legacy}`,
    `Migrated: ${counts.payments.migrated}`,
    `Errors: ${counts.payments.errors}`,
    "",
    "Revenue",
    `Legacy: ${fmt(counts.revenueThb.legacy)} THB`,
    `New: ${fmt(counts.revenueThb.neu)} THB`,
    `Difference: ${fmt(counts.revenueThb.difference)} THB`,
    "",
    "Outstanding Balance",
    `Legacy: ${fmt(counts.outstandingThb.legacy)} THB`,
    `New: ${fmt(counts.outstandingThb.neu)} THB`,
    `Difference: ${fmt(counts.outstandingThb.difference)} THB`,
    "",
    "Source-system notes (not migration errors)",
    `- Legacy dashboard widget revenue (completed jobs only): ${fmt(money.completedJobThb)} THB`,
    `- Legacy payments.php total_revenue (paid orders): ${fmt(money.paidThb)} THB`,
    `- Legacy job.cost / operation_costs: ${fmt(money.jobCostThb)} THB (stored on Case.formData; no Expense model)`,
    `- Refunds: ${fmt(money.refundsThb)} THB`,
    `- Deposits: ${fmt(money.depositsThb)} THB`,
    `- Cancelled job totals excluded from invoices: ${fmt(money.cancelledThb)} THB`,
    "",
    "Duplicate review",
    `- Exact matches: ${duplicates.exactMatches.length}`,
    `- Likely duplicates (not auto-merged): ${duplicates.likelyDuplicates.length}`,
    `- Conflicts: ${duplicates.conflicts.length}`,
    `- New customers: ${duplicates.newCustomers.length}`,
    `- Manual review: ${duplicates.manualReview.length}`,
    "",
    `Validation errors: ${errors.length}`,
    `Validation warnings: ${warnings.length}`,
    ...notes.map((n) => `- ${n}`),
    "",
  ].join("\n");
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
