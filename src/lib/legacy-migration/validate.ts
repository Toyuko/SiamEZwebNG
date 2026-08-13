import { mapLegacyServiceToSlug } from "./service-map";
import type { TransformedBundle, ValidationIssue } from "./types";

export function validateTransformedBundle(bundle: TransformedBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const customerIds = new Set(bundle.customers.map((c) => c.legacyCustomerId));
  const emails = new Map<string, number>();
  const caseNumbers = new Map<string, number>();
  const jobIds = new Set<number>();

  for (const c of bundle.customers) {
    if (!c.name.trim()) {
      issues.push({
        severity: "error",
        entity: "customer",
        legacyId: c.legacyCustomerId,
        message: "Missing name",
      });
    }
    if (!c.email.includes("@")) {
      issues.push({
        severity: "error",
        entity: "customer",
        legacyId: c.legacyCustomerId,
        message: "Invalid email",
      });
    }
    const prev = emails.get(c.email);
    if (prev != null) {
      issues.push({
        severity: "error",
        entity: "customer",
        legacyId: c.legacyCustomerId,
        message: `Duplicate destination email with customer ${prev}`,
      });
    } else {
      emails.set(c.email, c.legacyCustomerId);
    }
    if (c.emailIsSynthetic) {
      issues.push({
        severity: "warning",
        entity: "customer",
        legacyId: c.legacyCustomerId,
        message: "No usable legacy email; synthetic @imported.invalid address assigned (cannot log in until email is set)",
      });
    }
  }

  for (const job of bundle.cases) {
    if (jobIds.has(job.legacyJobId)) {
      issues.push({
        severity: "error",
        entity: "job",
        legacyId: job.legacyJobId,
        message: "Duplicate legacy job id",
      });
    }
    jobIds.add(job.legacyJobId);
    if (!customerIds.has(job.legacyCustomerId)) {
      issues.push({
        severity: "error",
        entity: "job",
        legacyId: job.legacyJobId,
        message: `Missing customer ${job.legacyCustomerId}`,
      });
    }
    if (!mapLegacyServiceToSlug(job.serviceName) && job.serviceSlug === "legacy-test-service") {
      issues.push({
        severity: "warning",
        entity: "job",
        legacyId: job.legacyJobId,
        message: `Service "${job.serviceName}" mapped to fallback slug ${job.serviceSlug}`,
      });
    }
    if (!Number.isInteger(job.totalAmountSatang) || job.totalAmountSatang < 0) {
      issues.push({
        severity: "error",
        entity: "job",
        legacyId: job.legacyJobId,
        message: "Invalid amount",
      });
    }
    const prevCase = caseNumbers.get(job.caseNumber);
    if (prevCase != null) {
      issues.push({
        severity: "error",
        entity: "job",
        legacyId: job.legacyJobId,
        message: `Duplicate case number ${job.caseNumber}`,
      });
    } else {
      caseNumbers.set(job.caseNumber, job.legacyJobId);
    }
  }

  for (const inv of bundle.invoices) {
    if (!jobIds.has(inv.legacyJobId)) {
      issues.push({
        severity: "error",
        entity: "invoice",
        legacyId: inv.legacyOrderId,
        message: `Invoice references missing job ${inv.legacyJobId}`,
      });
    }
    if (inv.amountSatang !== bundle.cases.find((c) => c.legacyJobId === inv.legacyJobId)?.totalAmountSatang) {
      issues.push({
        severity: "error",
        entity: "invoice",
        legacyId: inv.legacyOrderId,
        message: "Invoice amount does not match job total",
      });
    }
  }

  for (const pay of bundle.payments) {
    const inv = bundle.invoices.find((i) => i.legacyOrderId === pay.legacyOrderId);
    if (!inv) {
      issues.push({
        severity: "error",
        entity: "payment",
        legacyId: pay.legacyOrderId,
        message: "Payment has no matching invoice",
      });
    } else if (pay.amountSatang !== inv.amountSatang) {
      issues.push({
        severity: "error",
        entity: "payment",
        legacyId: pay.legacyOrderId,
        message: "Payment amount does not match invoice",
      });
    }
  }

  return issues;
}
