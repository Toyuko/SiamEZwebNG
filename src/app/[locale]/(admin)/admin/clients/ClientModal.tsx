"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient, updateClient } from "@/actions/admin";

type ClientForEdit = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
};

type ClientModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  client?: ClientForEdit | null;
};

export function ClientModal({ open, onClose, mode, client }: ClientModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim() || null;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value.trim() || null;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value?.trim();

    if (!email) return;

    startTransition(async () => {
      if (mode === "add") {
        await createClient({ email, name, phone, password: password || undefined });
      } else if (client) {
        await updateClient(client.id, { email, name, phone });
      }
      onClose();
      router.refresh();
    });
  };

  const title = mode === "add" ? "Add client" : "Edit client";

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
            defaultValue={client?.email}
            disabled={mode === "edit"}
            className="mt-1"
          />
          {mode === "edit" && (
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
          )}
        </div>
        <div>
          <Label htmlFor="modal-name">Name</Label>
          <Input
            id="modal-name"
            name="name"
            defaultValue={client?.name ?? ""}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="modal-phone">Phone</Label>
          <Input
            id="modal-phone"
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ""}
            className="mt-1"
          />
        </div>
        {mode === "add" && (
          <div>
            <Label htmlFor="modal-password">Password (optional, for login)</Label>
            <Input
              id="modal-password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="mt-1"
            />
          </div>
        )}
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
