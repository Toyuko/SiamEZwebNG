"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  recordManualPayment,
  type InvoiceForManualPayment,
} from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

export function AddPaymentModal({
  invoices,
}: {
  invoices: InvoiceForManualPayment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = invoices.find((i) => i.id === invoiceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!invoiceId) {
      setError("Select an invoice");
      return;
    }
    startTransition(async () => {
      const res = await recordManualPayment(invoiceId);
      if (!res.success) {
        setError(res.error ?? "Failed to record payment");
        return;
      }
      setOpen(false);
      setInvoiceId("");
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-siam-blue hover:bg-siam-blue/90"
      >
        <span className="mr-1 text-lg leading-none">+</span>
        Add Payment
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-payment-title"
        >
          <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="add-payment-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Record manual payment
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Marks the invoice paid and logs a manual payment (cash, in-person transfer, etc.).
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="manual-invoice" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Invoice / order
                </label>
                <Select
                  id="manual-invoice"
                  value={invoiceId}
                  className="w-full"
                  onChange={(e) => setInvoiceId(e.target.value)}
                  required
                >
                  <option value="">Select case invoice…</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.caseNumber} — {inv.serviceName} ({formatCurrency(inv.amount, inv.currency)}) —{" "}
                      {inv.clientName ?? inv.clientEmail ?? "Guest"}
                    </option>
                  ))}
                </Select>
              </div>

              {selected && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-800/50">
                  <p>
                    <span className="text-gray-500">Amount:</span>{" "}
                    <span className="font-semibold">{formatCurrency(selected.amount, selected.currency)}</span>
                  </p>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Invoice status: <span className="font-medium">{selected.status}</span>
                  </p>
                </div>
              )}

              {invoices.length === 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  No open invoices (draft, unpaid, or awaiting verification). Create or send an invoice from a case first.
                </p>
              )}

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || invoices.length === 0 || !invoiceId}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
