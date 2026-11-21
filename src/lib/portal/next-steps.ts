import type { CaseStatus, InvoiceStatus, JobStatus } from "@prisma/client";

export type NextStepTone = "urgent" | "action" | "info";

export type CustomerNextStep = {
  id: string;
  tone: NextStepTone;
  href: string;
  title: string;
  description: string;
  /** Optional booking/case reference shown in the action list */
  reference?: string;
  ctaLabel?: string;
};

type CaseLike = {
  id: string;
  caseNumber: string;
  status: CaseStatus;
  service: { name: string } | null;
};

type InvoiceLike = {
  id: string;
  status: InvoiceStatus;
  case: {
    caseNumber: string;
    service: { name: string } | null;
    status?: CaseStatus;
  };
};

type JobLike = {
  id: string;
  title: string;
  status: JobStatus;
};

/**
 * Derive actionable next steps for the customer home from existing case/invoice/job data.
 */
export function buildCustomerNextSteps(input: {
  cases: CaseLike[];
  invoices: InvoiceLike[];
  jobs: JobLike[];
  labels: {
    payInvoice: (serviceName: string) => string;
    payInvoiceDesc: (caseNumber: string) => string;
    uploadDocs: (serviceName: string) => string;
    uploadDocsDesc: (caseNumber: string) => string;
    reviewJob: (title: string) => string;
    reviewJobDesc: string;
    awaitingQuote: (serviceName: string) => string;
    awaitingQuoteDesc: (caseNumber: string) => string;
    bookFirst: string;
    bookFirstDesc: string;
    ctaPay?: string;
    ctaUpload?: string;
    ctaReview?: string;
    ctaBook?: string;
  };
}): CustomerNextStep[] {
  const steps: CustomerNextStep[] = [];
  const ctaPay = input.labels.ctaPay ?? "Pay Now →";
  const ctaUpload = input.labels.ctaUpload ?? "Upload Documents →";
  const ctaReview = input.labels.ctaReview ?? "Review →";
  const ctaBook = input.labels.ctaBook ?? "Book a Service →";

  for (const inv of input.invoices) {
    if (inv.status === "unpaid" || inv.status === "pending_verification") {
      // Skip payment prompts for terminal cases — the booking is no longer actionable.
      if (
        inv.case.status &&
        ["cancelled", "refunded", "completed"].includes(inv.case.status)
      ) {
        continue;
      }
      steps.push({
        id: `invoice-${inv.id}`,
        tone: inv.status === "unpaid" ? "urgent" : "action",
        href: `/portal/invoices/${inv.id}`,
        title: input.labels.payInvoice(inv.case.service?.name ?? "Service"),
        description: input.labels.payInvoiceDesc(inv.case.caseNumber),
        reference: inv.case.caseNumber,
        ctaLabel: ctaPay,
      });
    }
  }

  for (const c of input.cases) {
    if (c.status === "pending_docs") {
      steps.push({
        id: `docs-${c.id}`,
        tone: "urgent",
        href: `/portal/cases/${c.id}`,
        title: input.labels.uploadDocs(c.service?.name ?? "Service"),
        description: input.labels.uploadDocsDesc(c.caseNumber),
        reference: c.caseNumber,
        ctaLabel: ctaUpload,
      });
    } else if (c.status === "quoted" || c.status === "awaiting_payment" || c.status === "awaiting_initial_payment") {
      // Prefer invoice link when present; otherwise point at case.
      const hasInvoiceStep = input.invoices.some(
        (inv) =>
          ["unpaid", "pending_verification"].includes(inv.status) &&
          inv.case.caseNumber === c.caseNumber
      );
      if (!hasInvoiceStep) {
        steps.push({
          id: `quoted-${c.id}`,
          tone: "action",
          href: `/portal/cases/${c.id}`,
          title: input.labels.payInvoice(c.service?.name ?? "Service"),
          description: input.labels.payInvoiceDesc(c.caseNumber),
          reference: c.caseNumber,
          ctaLabel: ctaPay,
        });
      }
    } else if (c.status === "new" || c.status === "under_review") {
      steps.push({
        id: `review-${c.id}`,
        tone: "info",
        href: `/portal/cases/${c.id}`,
        title: input.labels.awaitingQuote(c.service?.name ?? "Service"),
        description: input.labels.awaitingQuoteDesc(c.caseNumber),
        reference: c.caseNumber,
      });
    }
  }

  for (const job of input.jobs) {
    if (job.status === "completed_awaiting_review") {
      steps.push({
        id: `job-review-${job.id}`,
        tone: "urgent",
        href: `/portal/client/jobs/${job.id}`,
        title: input.labels.reviewJob(job.title),
        description: input.labels.reviewJobDesc,
        ctaLabel: ctaReview,
      });
    }
  }

  if (
    steps.length === 0 &&
    input.cases.length === 0 &&
    input.jobs.length === 0 &&
    input.invoices.length === 0
  ) {
    steps.push({
      id: "book-first",
      tone: "action",
      href: "/services",
      title: input.labels.bookFirst,
      description: input.labels.bookFirstDesc,
      ctaLabel: ctaBook,
    });
  }

  const toneOrder: Record<NextStepTone, number> = { urgent: 0, action: 1, info: 2 };
  return steps.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]).slice(0, 6);
}

/**
 * Dashboard "Action Required" list — only items the customer must act on.
 * Excludes informational statuses and the empty-state "book first" prompt
 * (Book a Service is already the primary CTA).
 */
export function filterActionRequiredSteps(steps: CustomerNextStep[]): CustomerNextStep[] {
  return steps.filter(
    (step) => step.tone !== "info" && step.id !== "book-first"
  );
}
