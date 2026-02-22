"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { createStaffUser, updateStaffUser } from "@/actions/admin";

type StaffForEdit = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean | null;
};

type StaffModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  staff?: StaffForEdit | null;
};

export function StaffModal({ open, onClose, mode, staff }: StaffModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim() || null;
    const role = (form.elements.namedItem("role") as HTMLSelectElement).value as "admin" | "staff";
    const active = (form.elements.namedItem("active") as HTMLSelectElement)?.value === "1";
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value?.trim();

    if (!email && mode === "add") return;

    startTransition(async () => {
      if (mode === "add") {
        if (!password) return;
        await createStaffUser({ email, name, password, role });
      } else if (staff) {
        await updateStaffUser(staff.id, { name, role, active, ...(password ? { password } : {}) });
      }
      onClose();
      router.refresh();
    });
  };

  const title = mode === "add" ? "Add staff" : "Edit staff";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="modal-email">Email *</Label>
          <Input
            id="modal-email"
            name="email"
            type="email"
            required
            defaultValue={staff?.email}
            disabled={mode === "edit"}
            className="mt-1"
          />
          {mode === "edit" && <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>}
        </div>
        <div>
          <Label htmlFor="modal-name">Name</Label>
          <Input id="modal-name" name="name" defaultValue={staff?.name ?? ""} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="modal-role">Role</Label>
          <Select id="modal-role" name="role" defaultValue={staff?.role ?? "staff"} className="mt-1 w-full">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        {mode === "edit" && (
          <div>
            <Label htmlFor="modal-active">Active</Label>
            <Select id="modal-active" name="active" defaultValue={staff?.active ? "1" : "0"} className="mt-1 w-32">
              <option value="1">Yes</option>
              <option value="0">No</option>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="modal-password">{mode === "add" ? "Password *" : "New password (leave blank to keep)"}</Label>
          <Input id="modal-password" name="password" type="password" autoComplete="new-password" required={mode === "add"} className="mt-1" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
