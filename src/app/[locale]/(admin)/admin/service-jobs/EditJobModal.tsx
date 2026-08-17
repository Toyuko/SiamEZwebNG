"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { markServiceJobPaid, updateServiceJob } from "@/actions/admin";
import type { Prisma } from "@prisma/client";

type JobWithRelations = Prisma.CaseGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; phone: true } };
    service: { select: { id: true; name: true; slug: true } };
    staffAssignments: { include: { user: { select: { id: true; name: true; email: true } } } };
    invoices: {
      select: { id: true; amount: true; status: true };
      orderBy: { createdAt: "desc" };
      take: 1;
    };
  };
}>;

type StaffUser = { id: string; name: string | null; email: string };

const STATUS_OPTIONS = [
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

export function EditJobModal({
  job,
  staffUsers,
  onClose,
}: {
  job: JobWithRelations;
  staffUsers: StaffUser[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const amount = job.invoices[0] ? job.invoices[0].amount / 100 : 0;
  const currentStaffId = job.staffAssignments[0]?.user.id ?? "";
  const invoiceAlreadyPaid = job.invoices[0]?.status === "paid";
  const showMarkPaid =
    !invoiceAlreadyPaid && job.status !== "cancelled" && job.status !== "refunded";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const status = (form.elements.namedItem("status") as HTMLSelectElement).value;
    const amountRaw = (form.elements.namedItem("amount") as HTMLInputElement).value;
    const staffId = (form.elements.namedItem("staffId") as HTMLSelectElement).value;
    const newAmount = Math.round(parseFloat(amountRaw || "0") * 100);

    startTransition(async () => {
      try {
        await updateServiceJob(job.id, {
          status: status as
            | "new"
            | "under_review"
            | "quoted"
            | "awaiting_payment"
            | "paid"
            | "in_progress"
            | "pending_docs"
            | "completed"
            | "cancelled",
          amount: newAmount,
          staffIds: staffId ? [staffId] : [],
        });
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save job");
      }
    });
  };

  const handleMarkPaid = () => {
    setError(null);
    const amountInput = document.getElementById("edit-amount") as HTMLInputElement | null;
    const amountSatang = Math.round(parseFloat(amountInput?.value || "0") * 100);

    startTransition(async () => {
      const res = await markServiceJobPaid(job.id, {
        amountSatang: amountSatang > 0 ? amountSatang : undefined,
      });
      if (!res.success) {
        setError(res.error ?? "Failed to mark as paid");
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={`Edit Job ${job.caseNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Client: {job.user?.name ?? job.user?.email ?? job.guestName ?? job.guestEmail ?? "Guest"} ·
          Service: {job.service.name}
        </div>
        <div>
          <Label htmlFor="edit-status">Status</Label>
          <Select id="edit-status" name="status" defaultValue={job.status} className="mt-1">
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-gray-500">
            Choosing Paid records a bank payment and updates Invoices and Payments &amp; Orders.
          </p>
        </div>
        <div>
          <Label htmlFor="edit-amount">Amount (THB)</Label>
          <Input
            id="edit-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={amount}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="edit-staff">Assign Staff</Label>
          <Select id="edit-staff" name="staffId" defaultValue={currentStaffId} className="mt-1">
            <option value="">None</option>
            {staffUsers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.email}
              </option>
            ))}
          </Select>
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {showMarkPaid && (
            <Button type="button" variant="outline" onClick={handleMarkPaid} disabled={pending}>
              {pending ? "Recording…" : "Mark as paid"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
        {invoiceAlreadyPaid && (
          <p className="text-xs text-green-700 dark:text-green-400">
            Invoice already marked paid — visible in Finance.
          </p>
        )}
      </form>
    </Modal>
  );
}
