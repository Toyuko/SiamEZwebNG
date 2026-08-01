import type { CaseStatus, InvoiceStatus } from "@prisma/client";

export type CaseTimelineKind =
  | "created"
  | "status"
  | "note"
  | "document"
  | "invoice"
  | "quote";

export type CaseTimelineItem = {
  id: string;
  kind: CaseTimelineKind;
  at: Date;
  title: string;
  description?: string;
};

type NoteLike = {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  user?: { name: string | null } | null;
};

type DocumentLike = {
  id: string;
  name: string;
  createdAt: Date;
};

type InvoiceLike = {
  id: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

type QuoteLike = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: Date;
  sentAt: Date | null;
};

/**
 * Build a customer-visible case timeline from notes, docs, invoices, and status.
 * Internal staff notes are excluded.
 */
export function buildCaseTimeline(input: {
  caseNumber: string;
  status: CaseStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  statusLabel: string;
  notes: NoteLike[];
  documents: DocumentLike[];
  invoices: InvoiceLike[];
  quotes?: QuoteLike[];
  labels: {
    caseOpened: string;
    caseOpenedDesc: (caseNumber: string) => string;
    statusUpdate: (status: string) => string;
    statusUpdateDesc: string;
    completed: string;
    noteFromTeam: string;
    documentAdded: (name: string) => string;
    invoiceLabel: (status: string, amount: string) => string;
    quoteSent: (amount: string) => string;
  };
}): CaseTimelineItem[] {
  const items: CaseTimelineItem[] = [
    {
      id: "created",
      kind: "created",
      at: input.createdAt,
      title: input.labels.caseOpened,
      description: input.labels.caseOpenedDesc(input.caseNumber),
    },
  ];

  for (const note of input.notes.filter((n) => !n.isInternal)) {
    items.push({
      id: `note-${note.id}`,
      kind: "note",
      at: note.createdAt,
      title: input.labels.noteFromTeam,
      description: note.content,
    });
  }

  for (const doc of input.documents) {
    items.push({
      id: `doc-${doc.id}`,
      kind: "document",
      at: doc.createdAt,
      title: input.labels.documentAdded(doc.name),
    });
  }

  for (const inv of input.invoices) {
    const amount = `${(inv.amount / 100).toFixed(2)} ${inv.currency}`;
    items.push({
      id: `invoice-${inv.id}`,
      kind: "invoice",
      at: inv.updatedAt ?? inv.createdAt,
      title: input.labels.invoiceLabel(inv.status, amount),
    });
  }

  for (const quote of input.quotes ?? []) {
    if (quote.status === "sent" || quote.status === "accepted") {
      const amount = `${(quote.amount / 100).toFixed(2)} ${quote.currency}`;
      items.push({
        id: `quote-${quote.id}`,
        kind: "quote",
        at: quote.sentAt ?? quote.createdAt,
        title: input.labels.quoteSent(amount),
      });
    }
  }

  // Current status as a recent milestone (uses updatedAt so it sorts near the top when active).
  if (input.status !== "new") {
    items.push({
      id: `status-${input.status}`,
      kind: "status",
      at: input.updatedAt,
      title: input.labels.statusUpdate(input.statusLabel),
      description: input.labels.statusUpdateDesc,
    });
  }

  if (input.completedAt) {
    items.push({
      id: "completed",
      kind: "status",
      at: input.completedAt,
      title: input.labels.completed,
    });
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}
