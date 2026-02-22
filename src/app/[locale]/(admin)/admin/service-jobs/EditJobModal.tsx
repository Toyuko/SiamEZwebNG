"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { updateServiceJob } from "@/actions/admin";
import type { Prisma } from "@prisma/client";

type JobWithRelations = Prisma.CaseGetPayload<{
  include: {
    user: true;
    service: true;
    staffAssignments: { include: { user: true } };
    invoices: { select: { id: true; amount: true }; orderBy: { createdAt: "desc" }; take: 1 };
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
  const amount = job.invoices[0] ? job.invoices[0].amount / 100 : 0;
  const currentStaffId = job.staffAssignments[0]?.user.id ?? "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const status = (form.elements.namedItem("status") as HTMLSelectElement).value;
    const amountRaw = (form.elements.namedItem("amount") as HTMLInputElement).value;
    const staffId = (form.elements.namedItem("staffId") as HTMLSelectElement).value;
    const newAmount = Math.round(parseFloat(amountRaw || "0") * 100);

    startTransition(async () => {
      await updateServiceJob(job.id, {
        status: status as "new" | "under_review" | "quoted" | "awaiting_payment" | "paid" | "in_progress" | "pending_docs" | "completed" | "cancelled",
        amount: newAmount,
        staffIds: staffId ? [staffId] : [],
      });
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={`Edit Job ${job.caseNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Client: {job.user?.name ?? job.user?.email ?? job.guestName ?? job.guestEmail ?? "Guest"} · Service: {job.service.name}
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
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
