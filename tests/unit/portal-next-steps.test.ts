import { describe, expect, it } from "vitest";
import {
  buildCustomerNextSteps,
  filterActionRequiredSteps,
} from "@/lib/portal/next-steps";
import { buildCaseTimeline } from "@/lib/portal/case-timeline";
import {
  buildBookingProgress,
  getCasePrimaryAction,
  isActiveBookingStatus,
} from "@/lib/portal/booking-progress";

const labels = {
  payInvoice: (service: string) => `Pay ${service}`,
  payInvoiceDesc: (caseNumber: string) => `Case ${caseNumber}`,
  uploadDocs: (service: string) => `Docs ${service}`,
  uploadDocsDesc: (caseNumber: string) => `Case ${caseNumber}`,
  reviewJob: (title: string) => `Review ${title}`,
  reviewJobDesc: "Confirm",
  awaitingQuote: (service: string) => `Reviewing ${service}`,
  awaitingQuoteDesc: (caseNumber: string) => `Case ${caseNumber}`,
  bookFirst: "Book first",
  bookFirstDesc: "Browse",
};

describe("buildCustomerNextSteps", () => {
  it("prioritizes unpaid invoices and pending docs", () => {
    const steps = buildCustomerNextSteps({
      cases: [
        {
          id: "c1",
          caseNumber: "SE-1",
          status: "pending_docs",
          service: { name: "Visa" },
        },
      ],
      invoices: [
        {
          id: "i1",
          status: "unpaid",
          case: { caseNumber: "SE-2", service: { name: "License" } },
        },
      ],
      jobs: [],
      labels,
    });

    expect(steps[0]?.id).toBe("invoice-i1");
    expect(steps.some((s) => s.id === "docs-c1")).toBe(true);
  });

  it("suggests booking when the customer has no activity", () => {
    const steps = buildCustomerNextSteps({
      cases: [],
      invoices: [],
      jobs: [],
      labels,
    });
    expect(steps).toHaveLength(1);
    expect(steps[0]?.id).toBe("book-first");
  });

  it("filters action-required to customer-actionable items only", () => {
    const steps = buildCustomerNextSteps({
      cases: [
        {
          id: "c1",
          caseNumber: "SE-1",
          status: "pending_docs",
          service: { name: "Visa" },
        },
        {
          id: "c2",
          caseNumber: "SE-2",
          status: "under_review",
          service: { name: "License" },
        },
      ],
      invoices: [],
      jobs: [],
      labels,
    });

    const actionable = filterActionRequiredSteps(steps);
    expect(actionable.some((s) => s.id === "docs-c1")).toBe(true);
    expect(actionable.some((s) => s.id === "review-c2")).toBe(false);
    expect(actionable.some((s) => s.id === "book-first")).toBe(false);
  });
});

describe("booking progress", () => {
  it("marks pending docs as the documents stage", () => {
    const stages = buildBookingProgress("pending_docs");
    expect(stages.find((s) => s.id === "documents")?.state).toBe("current");
    expect(stages.find((s) => s.id === "booked")?.state).toBe("done");
    expect(getCasePrimaryAction("pending_docs")).toBe("upload");
    expect(isActiveBookingStatus("completed")).toBe(false);
    expect(isActiveBookingStatus("in_progress")).toBe(true);
  });
});

describe("buildCaseTimeline", () => {
  it("excludes internal notes and sorts newest first", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const later = new Date("2026-01-02T00:00:00Z");
    const items = buildCaseTimeline({
      caseNumber: "SE-1",
      status: "in_progress",
      createdAt,
      updatedAt: later,
      completedAt: null,
      statusLabel: "In Progress",
      notes: [
        {
          id: "n1",
          content: "Internal only",
          isInternal: true,
          createdAt: later,
        },
        {
          id: "n2",
          content: "Hello customer",
          isInternal: false,
          createdAt: later,
        },
      ],
      documents: [],
      invoices: [],
      labels: {
        caseOpened: "Opened",
        caseOpenedDesc: (n) => n,
        statusUpdate: (s) => s,
        statusUpdateDesc: "updated",
        completed: "Done",
        noteFromTeam: "Note",
        documentAdded: (n) => n,
        invoiceLabel: (s, a) => `${s} ${a}`,
        quoteSent: (a) => a,
      },
    });

    expect(items.some((i) => i.description === "Internal only")).toBe(false);
    expect(items.some((i) => i.description === "Hello customer")).toBe(true);
    expect(items[0]?.at.getTime()).toBeGreaterThanOrEqual(items[1]?.at.getTime() ?? 0);
  });
});
