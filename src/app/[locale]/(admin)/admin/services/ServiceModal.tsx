"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { createService, updateService } from "@/actions/admin";
import type { Service } from "@prisma/client";

type ServiceModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  service?: Service | null;
};

export function ServiceModal({ open, onClose, mode, service }: ServiceModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const slug = (form.elements.namedItem("slug") as HTMLInputElement).value.trim();
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const shortDescription = (form.elements.namedItem("shortDescription") as HTMLInputElement).value.trim() || undefined;
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim();
    const type = (form.elements.namedItem("type") as HTMLSelectElement).value as "fixed" | "quote";
    const priceStr = (form.elements.namedItem("priceAmount") as HTMLInputElement).value.trim();
    const priceAmount = priceStr ? Math.round(parseFloat(priceStr) * 100) : null;
    const active = (form.elements.namedItem("active") as HTMLSelectElement)?.value === "1";

    if (!slug || !name || !description) return;

    startTransition(async () => {
      if (mode === "add") {
        await createService({ slug, name, shortDescription: shortDescription || null, description, type, priceAmount, active });
      } else if (service) {
        await updateService(service.id, { slug, name, shortDescription: shortDescription || null, description, type, priceAmount, active });
      }
      onClose();
      router.refresh();
    });
  };

  const title = mode === "add" ? "Add service" : "Edit service";

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="modal-name">Name *</Label>
          <Input id="modal-name" name="name" required defaultValue={service?.name} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="modal-slug">Slug * (URL-friendly)</Label>
          <Input id="modal-slug" name="slug" required defaultValue={service?.slug} placeholder="my-service" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="modal-shortDesc">Short description</Label>
          <Input id="modal-shortDesc" name="shortDescription" defaultValue={service?.shortDescription ?? ""} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="modal-desc">Description *</Label>
          <textarea
            id="modal-desc"
            name="description"
            required
            rows={3}
            defaultValue={service?.description ?? ""}
            className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="modal-type">Type</Label>
            <Select id="modal-type" name="type" defaultValue={service?.type ?? "quote"} className="mt-1">
              <option value="fixed">Fixed</option>
              <option value="quote">Quote</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="modal-price">Price (THB)</Label>
            <Input
              id="modal-price"
              name="priceAmount"
              type="number"
              min={0}
              step={1}
              defaultValue={service?.priceAmount != null ? service.priceAmount / 100 : ""}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="modal-active">Active</Label>
          <Select id="modal-active" name="active" defaultValue={service ? (service.active ? "1" : "0") : "1"} className="mt-1 w-32">
            <option value="1">Yes</option>
            <option value="0">No</option>
          </Select>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
