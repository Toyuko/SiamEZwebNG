"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { saveSalesTargetAction } from "@/actions/sales-attribution";
import { Button } from "@/components/ui/button";

export function SalesTargetForm({
  salesPersonId,
  periodKey,
}: {
  salesPersonId: string;
  periodKey: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const targetBaht = String(new FormData(e.currentTarget).get("targetBaht") ?? "");
        start(async () => {
          await saveSalesTargetAction({ salesPersonId, periodKey, targetBaht });
          router.refresh();
        });
      }}
    >
      <label className="text-sm">
        <span className="mb-1 block text-gray-500">Monthly target (THB)</span>
        <input
          name="targetBaht"
          type="number"
          min="0"
          step="0.01"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save target"}
      </Button>
    </form>
  );
}
