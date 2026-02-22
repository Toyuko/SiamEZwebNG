"use client";

import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type StaffFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    email: string;
    name?: string | null;
    role: string;
  };
};

export function StaffForm({ action, defaultValues }: StaffFormProps) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={defaultValues?.email}
          className="mt-1"
          disabled={!!defaultValues}
        />
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select
          id="role"
          name="role"
          defaultValue={defaultValues?.role ?? "staff"}
          className="mt-1 w-full"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      {!defaultValues && (
        <div>
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="mt-1"
          />
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
