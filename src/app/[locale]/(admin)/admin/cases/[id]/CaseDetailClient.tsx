"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { updateCaseStatus, assignStaff, addCaseNote } from "@/actions/case";
import { createInvoice } from "@/actions/admin";
import type { CaseStatus } from "@prisma/client";
import type { Case, CaseNote, User, StaffAssignment, Payment, Invoice } from "@prisma/client";

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "quoted", label: "Quoted" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "in_progress", label: "In progress" },
  { value: "pending_docs", label: "Pending docs" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type CaseWithRelations = Case & {
  user: User;
  service: { name: string; priceAmount: number | null };
  quotes: { amount: number }[];
  staffAssignments: (StaffAssignment & { user: User })[];
  caseNotes: (CaseNote & { user: { name: string | null; email: string } })[];
  documents: { id: string; name: string; documentType: string | null }[];
  payments: Payment[];
  invoices: Invoice[];
};

type StaffUser = { id: string; name: string | null; email: string };

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(cents / 100);
}

export function CaseDetailClient({
  caseId,
  caseNotes,
  staffUsers,
  caseData,
}: {
  caseId: string;
  caseNotes: (CaseNote & { user: { name: string | null; email: string } })[];
  staffUsers: StaffUser[];
  caseData?: CaseWithRelations;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleStatusChange = (status: CaseStatus) => {
    startTransition(async () => {
      await updateCaseStatus(caseId, status);
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
      await createInvoice(caseId, caseData.userId, invoiceAmount);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Actions panel */}
      {caseData && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select
                defaultValue={caseData.status}
                onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                disabled={pending}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Assign staff</label>
              <Select
                defaultValue={caseData.staffAssignments[0]?.userId ?? ""}
                onChange={(e) => handleAssignStaff(e.target.value)}
                disabled={pending}
              >
                <option value="">— Select —</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={handleCreateInvoice}
              disabled={pending || staffUsers.length === 0}
              variant="outline"
            >
              Create invoice
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payments & Invoices */}
      {caseData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.payments.length === 0 ? (
                <p className="text-gray-500">No payments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {caseData.payments.map((p) => (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span>{formatCurrency(p.amount)} • {p.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.invoices.length === 0 ? (
                <p className="text-gray-500">No invoices yet.</p>
              ) : (
                <ul className="space-y-2">
                  {caseData.invoices.map((inv) => (
                    <li key={inv.id} className="flex justify-between text-sm">
                      <span>{formatCurrency(inv.amount)} • {inv.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Notes */}
      <div>
        <h3 className="mb-2 font-semibold">Notes</h3>
        {caseNotes.length === 0 ? (
          <p className="text-sm text-gray-500">No notes yet.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {caseNotes.map((n) => (
              <li key={n.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/50">
                <p className="text-gray-700 dark:text-gray-300">{n.content}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {n.user.name ?? n.user.email} • {new Date(n.createdAt).toLocaleString()}
                  {n.isInternal && " • Internal"}
                </p>
              </li>
            ))}
          </ul>
        )}
        {staffUsers.length > 0 ? (
          <form onSubmit={handleAddNote} className="flex flex-col gap-2">
            <Select name="userId" required>
              <option value="">Add note as…</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </Select>
            <Input name="content" placeholder="Add internal note…" required />
            <Button type="submit" size="sm" disabled={pending}>
              Add note
            </Button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">No staff users to add notes. Seed admin first.</p>
        )}
      </div>
    </div>
  );
}
