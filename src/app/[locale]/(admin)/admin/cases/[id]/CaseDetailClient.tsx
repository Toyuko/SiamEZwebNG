"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { updateCaseStatus, assignStaff, addCaseNote } from "@/actions/case";
import { createInvoice, markServiceJobPaid } from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";
import type { CaseStatus } from "@prisma/client";
import type { Case, CaseNote, User, StaffAssignment, Payment, Invoice, Quote } from "@prisma/client";

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "quoted", label: "Quoted" },
  { value: "custom_quote_required", label: "Custom quote required" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "awaiting_initial_payment", label: "Awaiting initial payment" },
  { value: "initial_payment_paid", label: "Initial payment paid" },
  { value: "paid", label: "Paid" },
  { value: "in_progress", label: "In progress" },
  { value: "milestone_due", label: "Milestone due" },
  { value: "pending_docs", label: "Pending docs" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refund_pending", label: "Refund pending" },
  { value: "refunded", label: "Refunded" },
];

type CaseWithRelations = Case & {
  user: User | null;
  service: { name: string; priceAmount: number | null };
  quotes: Quote[];
  staffAssignments: (StaffAssignment & { user: User })[];
  caseNotes: (CaseNote & { user: { name: string | null; email: string } })[];
  documents: { id: string; name: string; documentType: string | null }[];
  payments: Payment[];
  invoices: Invoice[];
};

type StaffUser = { id: string; name: string | null; email: string };

type Labels = {
  actions: string;
  status: string;
  assignStaff: string;
  selectStaff: string;
  createInvoiceQuick: string;
  createInvoiceWizard: string;
  payments: string;
  noPayments: string;
  invoices: string;
  noInvoices: string;
  notes: string;
  noNotes: string;
  addNoteAs: string;
  notePlaceholder: string;
  addNote: string;
  noStaffNotes: string;
  quotes: string;
  noQuotes: string;
};

const DEFAULT_LABELS: Labels = {
  actions: "Actions",
  status: "Status",
  assignStaff: "Assign staff",
  selectStaff: "— Select —",
  createInvoiceQuick: "Quick invoice (from quote/service)",
  createInvoiceWizard: "Invoice wizard",
  payments: "Payments",
  noPayments: "No payments yet.",
  invoices: "Invoices",
  noInvoices: "No invoices yet.",
  notes: "Notes",
  noNotes: "No notes yet.",
  addNoteAs: "Add note as…",
  notePlaceholder: "Add internal note…",
  addNote: "Add note",
  noStaffNotes: "No staff users to add notes. Seed admin first.",
  quotes: "Quotes",
  noQuotes: "No quotes yet.",
};

export function CaseDetailClient({
  caseId,
  caseNotes,
  staffUsers,
  caseData,
  labels: labelsProp,
}: {
  caseId: string;
  caseNotes: (CaseNote & { user: { name: string | null; email: string } })[];
  staffUsers: StaffUser[];
  caseData?: CaseWithRelations;
  labels?: Partial<Labels>;
}) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const hasUnpaidInvoice = caseData?.invoices.some(
    (inv) => inv.status === "draft" || inv.status === "unpaid" || inv.status === "pending_verification"
  );
  const canMarkPaid =
    caseData &&
    caseData.status !== "cancelled" &&
    caseData.status !== "refunded" &&
    (hasUnpaidInvoice || caseData.invoices.length === 0 || caseData.status !== "paid");

  const handleStatusChange = (status: CaseStatus) => {
    setActionError(null);
    startTransition(async () => {
      try {
        await updateCaseStatus(caseId, status);
        router.refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  };

  const handleMarkPaid = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await markServiceJobPaid(caseId);
      if (!res.success) {
        setActionError(res.error ?? "Failed to mark as paid");
        return;
      }
      router.refresh();
    });
  };

  const handleAssignStaff = (userId: string) => {
    if (!userId?.trim()) return;
    startTransition(async () => {
      await assignStaff(caseId, userId, "support");
      router.refresh();
    });
  };

  const handleAddNote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const content = (form.elements.namedItem("content") as HTMLInputElement)?.value?.trim();
    const userId = (form.elements.namedItem("userId") as HTMLSelectElement)?.value;
    if (!content || !userId) return;
    startTransition(async () => {
      await addCaseNote(caseId, userId, content, true);
      form.reset();
      router.refresh();
    });
  };

  const handleCreateInvoice = () => {
    if (!caseData) return;
    const quoteAmount = caseData.quotes?.[0]?.amount;
    const serviceAmount = caseData.service?.priceAmount;
    const invoiceAmount = quoteAmount ?? serviceAmount ?? 10000;
    startTransition(async () => {
      await createInvoice({
        caseId,
        userId: caseData.userId,
        amount: invoiceAmount,
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {caseData && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.actions}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{labels.status}</label>
              <Select
                defaultValue={caseData.status}
                onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                disabled={pending}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{labels.assignStaff}</label>
              <Select
                defaultValue={caseData.staffAssignments[0]?.userId ?? ""}
                onChange={(e) => handleAssignStaff(e.target.value)}
                disabled={pending}
              >
                <option value="">{labels.selectStaff}</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              {canMarkPaid && (
                <Button onClick={handleMarkPaid} disabled={pending}>
                  Mark as paid
                </Button>
              )}
              <Button
                onClick={handleCreateInvoice}
                disabled={pending || staffUsers.length === 0}
                variant="outline"
              >
                {labels.createInvoiceQuick}
              </Button>
              <Button variant="default" asChild>
                <Link href={`/admin/invoices/new?caseId=${encodeURIComponent(caseId)}`}>
                  {labels.createInvoiceWizard}
                </Link>
              </Button>
              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {caseData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{labels.quotes}</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.quotes.length === 0 ? (
                <p className="text-sm text-gray-500">{labels.noQuotes}</p>
              ) : (
                <ul className="space-y-2">
                  {caseData.quotes.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {formatCurrency(q.amount, q.currency)} · {q.status}
                      </span>
                      <Link
                        href={`/admin/quotes/${q.id}`}
                        className="text-siam-blue hover:underline"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{labels.payments}</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.payments.length === 0 ? (
                <p className="text-sm text-gray-500">{labels.noPayments}</p>
              ) : (
                <ul className="space-y-2">
                  {caseData.payments.map((p) => (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span>
                        {formatCurrency(p.amount, p.currency)} · {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{labels.invoices}</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.invoices.length === 0 ? (
                <p className="text-sm text-gray-500">{labels.noInvoices}</p>
              ) : (
                <ul className="space-y-2">
                  {caseData.invoices.map((inv) => (
                    <li key={inv.id} className="flex justify-between text-sm">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="text-siam-blue hover:underline"
                      >
                        {formatCurrency(inv.amount, inv.currency)} · {inv.status}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{labels.notes}</CardTitle>
        </CardHeader>
        <CardContent>
          {caseNotes.length === 0 ? (
            <p className="mb-4 text-sm text-gray-500">{labels.noNotes}</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {caseNotes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/50"
                >
                  <p className="text-gray-700 dark:text-gray-300">{n.content}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {n.user.name ?? n.user.email} · {new Date(n.createdAt).toLocaleString()}
                    {n.isInternal ? " · Internal" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {staffUsers.length > 0 ? (
            <form onSubmit={handleAddNote} className="flex flex-col gap-2">
              <Select name="userId" required>
                <option value="">{labels.addNoteAs}</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </Select>
              <Input name="content" placeholder={labels.notePlaceholder} required />
              <Button type="submit" size="sm" disabled={pending}>
                {labels.addNote}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">{labels.noStaffNotes}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
