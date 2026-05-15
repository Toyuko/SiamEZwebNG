"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Service } from "@prisma/client";
import { cn } from "@/lib/utils";

type Client = { id: string; name: string | null; email: string };
type StaffUser = { id: string; name: string | null; email: string };

const INTERNAL_STATUS_OPTIONS = [
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
  defaultAssignmentSource = "INTERNAL",
}: {
  open: boolean;
  onClose: () => void;
  services: Service[];
  clients: Client[];
  staffUsers: StaffUser[];
  defaultAssignmentSource?: "INTERNAL" | "FREELANCER";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignmentSource, setAssignmentSource] = useState<"INTERNAL" | "FREELANCER">(
    defaultAssignmentSource
  );
  const [enableAutoApproval, setEnableAutoApproval] = useState(true);
  const [isSpecialMemberOnly, setIsSpecialMemberOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreelancer = assignmentSource === "FREELANCER";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const userId = (form.elements.namedItem("clientId") as HTMLSelectElement).value;
    const serviceId = (form.elements.namedItem("serviceId") as HTMLSelectElement).value;
    const amountRaw = (form.elements.namedItem("amount") as HTMLInputElement).value;
    const title = (form.elements.namedItem("title") as HTMLInputElement | null)?.value?.trim();
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement | null)?.value?.trim();
    const payoutRaw = (form.elements.namedItem("payoutAmount") as HTMLInputElement | null)?.value;
    const status = (form.elements.namedItem("status") as HTMLSelectElement | null)?.value;
    const staffId = (form.elements.namedItem("staffId") as HTMLSelectElement | null)?.value;

    if (!userId) return;
    const amount = Math.round(parseFloat(amountRaw || "0") * 100);
    if (amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    const payoutAmount =
      isFreelancer && payoutRaw
        ? Math.round(parseFloat(payoutRaw) * 100)
        : amount;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentSource,
            userId,
            serviceId: serviceId || undefined,
            title: isFreelancer ? title || undefined : undefined,
            description: isFreelancer ? description || undefined : undefined,
            amount,
            payoutAmount: isFreelancer ? payoutAmount : undefined,
            isSpecialMemberOnly: isFreelancer ? isSpecialMemberOnly : undefined,
            enableAutoApproval: isFreelancer ? enableAutoApproval : undefined,
            status: !isFreelancer ? status : undefined,
            staffIds: !isFreelancer && staffId ? [staffId] : undefined,
          }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !json.success) {
          setError(json.error ?? "Failed to create job.");
          return;
        }
        onClose();
        router.refresh();
      } catch {
        setError("Failed to create job.");
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Assignment source *</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                assignmentSource === "INTERNAL"
                  ? "border-siam-blue bg-siam-blue/10 text-siam-blue"
                  : "border-gray-300 dark:border-gray-600"
              )}
            >
              <input
                type="radio"
                name="assignmentSource"
                value="INTERNAL"
                checked={assignmentSource === "INTERNAL"}
                onChange={() => setAssignmentSource("INTERNAL")}
                className="sr-only"
              />
              Internal (staff)
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                assignmentSource === "FREELANCER"
                  ? "border-siam-blue bg-siam-blue/10 text-siam-blue"
                  : "border-gray-300 dark:border-gray-600"
              )}
            >
              <input
                type="radio"
                name="assignmentSource"
                value="FREELANCER"
                checked={assignmentSource === "FREELANCER"}
                onChange={() => setAssignmentSource("FREELANCER")}
                className="sr-only"
              />
              Freelancer marketplace
            </label>
          </div>
        </div>

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
          <Label htmlFor="create-service">Service {isFreelancer ? "" : "*"}</Label>
          <Select
            id="create-service"
            name="serviceId"
            required={!isFreelancer}
            className="mt-1"
          >
            <option value="">Select service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        {isFreelancer && (
          <>
            <div>
              <Label htmlFor="create-title">Job title</Label>
              <Input
                id="create-title"
                name="title"
                placeholder="e.g. Document translation"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <textarea
                id="create-description"
                name="description"
                rows={3}
                placeholder="Scope and deliverables for freelancers…"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="create-amount">Client price (THB) *</Label>
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

        {isFreelancer && (
          <>
            <div>
              <Label htmlFor="create-payout">Freelancer payout (THB) *</Label>
              <Input
                id="create-payout"
                name="payoutAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount paid to freelancer"
                required
                className="mt-1"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isSpecialMemberOnly}
                onChange={(e) => setIsSpecialMemberOnly(e.target.checked)}
                className="rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Special Member only (verified special members can accept)
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={enableAutoApproval}
                onChange={(e) => setEnableAutoApproval(e.target.checked)}
                className="rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enable auto-approval (1 hour after freelancer marks done)
              </span>
            </label>
          </>
        )}

        {!isFreelancer && (
          <>
            <div>
              <Label htmlFor="create-status">Status</Label>
              <Select id="create-status" name="status" defaultValue="new" className="mt-1">
                {INTERNAL_STATUS_OPTIONS.map((opt) => (
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
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

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
