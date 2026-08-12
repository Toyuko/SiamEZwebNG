"use client";

import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Service } from "@prisma/client";

type ServiceFormProps = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Service>;
};

export function ServiceForm({ action, defaultValues }: ServiceFormProps) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="slug">Slug * (URL-friendly, e.g. marriage-registration)</Label>
        <Input
          id="slug"
          name="slug"
          required
          defaultValue={defaultValues?.slug}
          placeholder="my-service"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="shortDescription">Short description</Label>
        <Input
          id="shortDescription"
          name="shortDescription"
          defaultValue={defaultValues?.shortDescription ?? ""}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="description">Description *</Label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          className="mt-1 flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select
            id="type"
            name="type"
            defaultValue={defaultValues?.type ?? "quote"}
            className="mt-1"
          >
            <option value="fixed">Fixed (pay immediately)</option>
            <option value="quote">Quote (review & set price)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="priceAmount">Price (THB)</Label>
          <Input
            id="priceAmount"
            name="priceAmount"
            type="number"
            min={0}
            step={1}
            defaultValue={defaultValues?.priceAmount != null ? defaultValues.priceAmount / 100 : ""}
            placeholder="Leave empty for quote-based"
            className="mt-1"
          />
        </div>
      </div>
      {defaultValues && (
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
      )}
      {!defaultValues && (
        <input type="hidden" name="active" value="1" />
      )}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">Customer-friendly payment strategy</p>
        <p className="text-xs text-muted">
          10% / 20% / 30% initial payment. Never use 50–75% as a default.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="paymentStrategy">Exposure</Label>
            <Select
              id="paymentStrategy"
              name="paymentStrategy"
              defaultValue={
                (defaultValues?.paymentConfig as { payment_strategy?: string } | null)
                  ?.payment_strategy ?? "NORMAL_EXPOSURE"
              }
              className="mt-1"
            >
              <option value="LOW_EXPOSURE">Low — 10%</option>
              <option value="NORMAL_EXPOSURE">Normal — 20%</option>
              <option value="HIGH_EXPOSURE">High — 30% + milestones</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="minimumInitialPayment">Minimum initial payment (THB)</Label>
            <Input
              id="minimumInitialPayment"
              name="minimumInitialPayment"
              type="number"
              min={0}
              defaultValue={
                (defaultValues?.paymentConfig as { minimum_initial_payment?: number } | null)
                  ?.minimum_initial_payment ?? 500
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="allowMilestones">Allow milestones</Label>
            <Select
              id="allowMilestones"
              name="allowMilestones"
              defaultValue={
                (defaultValues?.paymentConfig as { allow_milestones?: boolean } | null)
                  ?.allow_milestones
                  ? "1"
                  : "0"
              }
              className="mt-1"
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="allowFullPayment">Allow pay-in-full</Label>
            <Select
              id="allowFullPayment"
              name="allowFullPayment"
              defaultValue={
                (defaultValues?.paymentConfig as { allow_full_payment?: boolean } | null)
                  ?.allow_full_payment === false
                  ? "0"
                  : "1"
              }
              className="mt-1"
            >
              <option value="1">Yes</option>
              <option value="0">No</option>
            </Select>
          </div>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
