"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { createServiceJob } from "@/actions/admin";
import type { Service } from "@prisma/client";

type Client = { id: string; name: string | null; email: string };
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
];

export function CreateJobModal({
  open,
  onClose,
  services,
  clients,
  staffUsers,
}: {
  open: boolean;
  onClose: () => void;
  services: Service[];
  clients: Client[];
  staffUsers: StaffUser[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const userId = (form.elements.namedItem("clientId") as HTMLSelectElement).value;
    const serviceId = (form.elements.namedItem("serviceId") as HTMLSelectElement).value;
    const amountRaw = (form.elements.namedItem("amount") as HTMLInputElement).value;
    const status = (form.elements.namedItem("status") as HTMLSelectElement).value;
    const staffId = (form.elements.namedItem("staffId") as HTMLSelectElement).value;

    if (!userId || !serviceId) return;
    const amount = Math.round(parseFloat(amountRaw || "0") * 100); // THB uses satang (1/100)

    startTransition(async () => {
      await createServiceJob({
        userId,
        serviceId,
        amount,
        status: status as "new" | "under_review" | "quoted" | "awaiting_payment" | "paid" | "in_progress" | "pending_docs" | "completed",
        staffIds: staffId ? [staffId] : undefined,
      });
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="create-client">Client *</Label>
          <Select id="create-client" name="clientId" required className="mt-1">
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.email} {c.name ? `(${c.email})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="create-service">Service *</Label>
          <Select id="create-service" name="serviceId" required className="mt-1">
            <option value="">Select service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="create-amount">Price (THB)</Label>
          <Input
            id="create-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="create-status">Status</Label>
          <Select id="create-status" name="status" defaultValue="new" className="mt-1">
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="create-staff">Assign Staff (optional)</Label>
          <Select id="create-staff" name="staffId" className="mt-1">
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
            {pending ? "Creating…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
