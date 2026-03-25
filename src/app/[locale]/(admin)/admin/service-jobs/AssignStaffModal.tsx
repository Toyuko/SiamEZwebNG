"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { updateServiceJob } from "@/actions/admin";
import type { Prisma } from "@prisma/client";

type JobWithRelations = Prisma.CaseGetPayload<{
  include: {
    staffAssignments: { include: { user: { select: { id: true; name: true; email: true } } } };
  };
}>;

type StaffUser = { id: string; name: string | null; email: string };

export function AssignStaffModal({
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
  const currentStaffId = job.staffAssignments[0]?.user.id ?? "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const staffId = (e.currentTarget.elements.namedItem("staffId") as HTMLSelectElement).value;

    startTransition(async () => {
      await updateServiceJob(job.id, {
        staffIds: staffId ? [staffId] : [],
      });
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={`Assign Staff – ${job.caseNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="assign-staff">Staff</Label>
          <Select id="assign-staff" name="staffId" defaultValue={currentStaffId} className="mt-1">
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
