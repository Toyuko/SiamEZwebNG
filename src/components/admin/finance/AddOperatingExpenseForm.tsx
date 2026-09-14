"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { createOperatingExpenseAction } from "@/actions/finance";
import { OPERATING_EXPENSE_CATEGORIES } from "@/lib/finance/calculations";
import { Button } from "@/components/ui/button";

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

export function AddOperatingExpenseForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function resetForm(form: HTMLFormElement) {
    form.reset();
    setOpen(false);
    setError(null);
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          Add operating expense
        </Button>
      ) : (
        <form
          className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const form = e.currentTarget;
            const fd = new FormData(form);
            start(async () => {
              try {
                await createOperatingExpenseAction({
                  amountBaht: String(fd.get("amountBaht") ?? ""),
                  category: String(fd.get("category") ?? "miscellaneous"),
                  description: String(fd.get("description") ?? ""),
                  vendor: String(fd.get("vendor") ?? "") || undefined,
                  paymentMethod: (String(fd.get("paymentMethod") || "") ||
                    null) as
                    | "cash"
                    | "bank"
                    | "qr"
                    | "credit_card"
                    | "debit_card"
                    | "stripe"
                    | "wise"
                    | "other"
                    | null,
                  paymentStatus: (String(fd.get("paymentStatus") || "PAID") ||
                    "PAID") as "UNPAID" | "APPROVED" | "PAID" | "CANCELLED",
                  transactionDate: String(fd.get("transactionDate") || "") || undefined,
                  notes: String(fd.get("notes") ?? "") || undefined,
                  reference: String(fd.get("reference") ?? "") || undefined,
                  isRecurring: fd.get("isRecurring") === "on",
                });
                resetForm(form);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save");
              }
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Amount (฿)
              </label>
              <input
                name="amountBaht"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Category
              </label>
              <select
                name="category"
                defaultValue="miscellaneous"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                {OPERATING_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {labelize(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Date
              </label>
              <input
                name="transactionDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Description
              </label>
              <input
                name="description"
                required
                placeholder="What was this for?"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Vendor
              </label>
              <input
                name="vendor"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Payment method
              </label>
              <select
                name="paymentMethod"
                defaultValue=""
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">—</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank transfer</option>
                <option value="qr">QR / PromptPay</option>
                <option value="stripe">Stripe</option>
                <option value="wise">Wise</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Status
              </label>
              <select
                name="paymentStatus"
                defaultValue="PAID"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Reference
              </label>
              <input
                name="reference"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Notes
              </label>
              <input
                name="notes"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input name="isRecurring" type="checkbox" className="rounded" />
              Recurring
            </label>
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save expense"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
