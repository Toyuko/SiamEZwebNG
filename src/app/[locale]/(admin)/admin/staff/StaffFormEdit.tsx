"use client";

import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type StaffFormEditProps = {
  action: (formData: FormData) => Promise<void>;
  defaultValues: {
    email: string;
    name?: string | null;
    role: string;
    active: boolean;
  };
};

export function StaffFormEdit({ action, defaultValues }: StaffFormEditProps) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultValues.email}
          className="mt-1"
          disabled
        />
        <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues.name ?? ""}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select
          id="role"
          name="role"
          defaultValue={defaultValues.role}
          className="mt-1 w-full"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="active">Active</Label>
        <Select
          id="active"
          name="active"
          defaultValue={defaultValues.active ? "1" : "0"}
          className="mt-1 w-32"
        >
          <option value="1">Yes</option>
          <option value="0">No</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="password">New password (leave blank to keep current)</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update"}
      </Button>
    </form>
  );
}
