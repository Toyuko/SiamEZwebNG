"use client";

import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ClientFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    email: string;
    name?: string | null;
    phone?: string | null;
  };
};

export function ClientForm({ action, defaultValues }: ClientFormProps) {
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
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues?.phone ?? ""}
          className="mt-1"
        />
      </div>
      {!defaultValues && (
        <div>
          <Label htmlFor="password">Password (optional, for login)</Label>
          <Input
            id="password"
            name="password"
            type="password"
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
