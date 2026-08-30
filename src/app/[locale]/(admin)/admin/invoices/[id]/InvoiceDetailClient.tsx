"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { InvoiceStatus, Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InvoiceLineItemsEditor } from "@/components/invoices/InvoiceLineItemsEditor";
import { uploadInvoicePdfAction } from "@/actions/invoice";
import { deleteInvoice, updateInvoice } from "@/actions/admin";
import {
  areFormLinesValid,
  fallbackLineItemsFromAmount,
  formLinesToPayload,
  lineItemsToForm,
  parseInvoiceLineItems,
  totalSatangFromForm,
  type InvoiceLineForm,
} from "@/lib/invoices/line-items";
import {
  INVOICE_STATUS_BADGE_CLASS,
  INVOICE_STATUS_LABELS,
  invoiceStatusLabel,
} from "@/lib/invoices/status";

type InvoiceDetail = Prisma.InvoiceGetPayload<{
  include: {
    case: { include: { service: true; user: true } };
    user: true;
    payments: true;
    quote: true;
  };
}>;

const EDITABLE_STATUSES: InvoiceStatus[] = [
  "draft",
  "unpaid",
  "pending_verification",
  "paid",
  "rejected",
];

function formatCurrency(satang: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(satang / 100);
}

function initialLines(invoice: InvoiceDetail): InvoiceLineForm[] {
  const parsed = parseInvoiceLineItems(invoice.lineItems);
  return parsed.length > 0 ? lineItemsToForm(parsed) : fallbackLineItemsFromAmount(invoice.amount);
}

export function InvoiceDetailClient({ invoice }: { invoice: InvoiceDetail }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();

  const [lines, setLines] = useState<InvoiceLineForm[]>(() => initialLines(invoice));
  const [editDepositThb, setEditDepositThb] = useState(() =>
    invoice.depositAmount != null ? (invoice.depositAmount / 100).toFixed(2) : ""
  );
  const [editDueDate, setEditDueDate] = useState(() => {
    if (!invoice.dueDate) return "";
    return new Date(invoice.dueDate).toISOString().slice(0, 10);
  });
  const [editStatus, setEditStatus] = useState(invoice.status);
  const [editClientAddress, setEditClientAddress] = useState(invoice.clientAddress ?? "");

  const totalSatang = useMemo(() => totalSatangFromForm(lines), [lines]);

  const clientLabel =
    invoice.user?.name ??
    invoice.user?.email ??
    invoice.case.guestName ??
    invoice.case.guestEmail ??
    "—";

  const pdfUrl = `/api/admin/invoices/${invoice.id}/pdf`;
  const isPaid = invoice.status === "paid";

  function onUpload() {
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setMessage({ type: "err", text: "Choose a PDF file first." });
      return;
    }
    setMessage(null);
    const fd = new FormData();
    fd.append("invoiceId", invoice.id);
    fd.append("file", file);
    startTransition(async () => {
      const res = await uploadInvoicePdfAction(fd);
      if (!res.success) {
        setMessage({ type: "err", text: res.error });
        return;
      }
      setMessage({ type: "ok", text: "PDF uploaded and linked to this invoice." });
      if (input) input.value = "";
      window.location.reload();
    });
  }

  const onSaveEdit = () => {
    setMessage(null);
    if (!areFormLinesValid(lines)) {
      setMessage({ type: "err", text: "Add at least one line with a description and amount." });
      return;
    }
    const amountSatang = totalSatang;

    let depositSatang: number | null = null;
    const depositRaw = editDepositThb.trim();
    if (depositRaw && editStatus !== "paid") {
      const depositNum = Number(depositRaw);
      if (!Number.isFinite(depositNum) || depositNum < 0) {
        setMessage({ type: "err", text: "Deposit must be a valid number (THB)." });
        return;
      }
      depositSatang = Math.round(depositNum * 100);
      if (depositSatang <= 0 || depositSatang >= amountSatang) {
        setMessage({ type: "err", text: "Deposit must be greater than 0 and less than the invoice total." });
        return;
      }
    }

    startEditTransition(async () => {
      const res = await updateInvoice(invoice.id, {
        amount: amountSatang,
        depositAmount: depositSatang,
        status: editStatus,
        dueDate: editDueDate ? editDueDate : null,
        clientAddress: editClientAddress.trim() ? editClientAddress.trim() : null,
        lineItems: formLinesToPayload(lines),
      });
      if (!res.success) {
        setMessage({ type: "err", text: res.error ?? "Failed to update invoice." });
        return;
      }
      setMessage({
        type: "ok",
        text: editStatus === "paid" ? "Invoice saved and marked paid." : "Invoice updated.",
      });
      router.refresh();
    });
  };

  const onMarkPaid = () => {
    setEditStatus("paid");
    setMessage(null);
    if (!areFormLinesValid(lines)) {
      setMessage({ type: "err", text: "Fix line items before marking paid." });
      return;
    }
    startEditTransition(async () => {
      const res = await updateInvoice(invoice.id, {
        amount: totalSatang,
        depositAmount: null,
        status: "paid",
        dueDate: editDueDate ? editDueDate : null,
        clientAddress: editClientAddress.trim() ? editClientAddress.trim() : null,
        lineItems: formLinesToPayload(lines),
      });
      if (!res.success) {
        setMessage({ type: "err", text: res.error ?? "Failed to mark invoice paid." });
        return;
      }
      setMessage({ type: "ok", text: "Invoice marked paid. The PDF will show Paid." });
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!confirm("Delete this invoice? This is not allowed if the invoice has payments.")) return;
    setMessage(null);
    startEditTransition(async () => {
      const res = await deleteInvoice(invoice.id);
      if (!res.success) {
        setMessage({ type: "err", text: res.error ?? "Failed to delete invoice." });
        return;
      }
      router.push("/admin/invoices");
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${INVOICE_STATUS_BADGE_CLASS[invoice.status]}`}
            >
              {invoiceStatusLabel(invoice.status)}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-gray-500">{invoice.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/invoices">Back to list</Link>
          </Button>
          {!isPaid && (
            <Button type="button" onClick={onMarkPaid} disabled={editPending || pending}>
              {editPending && editStatus === "paid" ? "Saving…" : "Mark as paid"}
            </Button>
          )}
          <Button
            type="button"
            onClick={onDelete}
            disabled={editPending || pending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </div>

      {isPaid && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
          This invoice is paid
          {invoice.paidAt ? ` · ${new Date(invoice.paidAt).toLocaleString()}` : ""}.
          The generated PDF shows Paid in full.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Case {invoice.case.caseNumber}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-gray-500">Client:</span> {clientLabel}
          </p>
          <p>
            <span className="text-gray-500">Service:</span> {invoice.case.service.name}
          </p>
          {invoice.clientAddress && (
            <p>
              <span className="text-gray-500">Client address:</span> {invoice.clientAddress}
            </p>
          )}
          <p>
            <span className="text-gray-500">Amount:</span> {formatCurrency(invoice.amount)}
          </p>
          {invoice.depositAmount != null && invoice.depositAmount > 0 && (
            <p>
              <span className="text-gray-500">Deposit due now:</span>{" "}
              {formatCurrency(invoice.depositAmount)}
              <span className="ml-2 text-gray-500">
                (balance {formatCurrency(Math.max(0, invoice.amount - invoice.depositAmount))})
              </span>
            </p>
          )}
          {invoice.dueDate && (
            <p>
              <span className="text-gray-500">Due:</span>{" "}
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="default" size="sm" asChild>
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/cases/${invoice.case.id}`}>Open case</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit invoice</CardTitle>
          <CardDescription>
            Change line items, due date, and status. Choose Paid if the customer already paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <p
              className={
                message.type === "ok"
                  ? "text-sm text-green-700 dark:text-green-400"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {message.text}
            </p>
          )}

          <InvoiceLineItemsEditor lines={lines} onChange={setLines} disabled={editPending} />

          {editStatus !== "paid" && (
            <div className="space-y-2">
              <Label htmlFor="edit-deposit">Deposit due now (optional, THB)</Label>
              <Input
                id="edit-deposit"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="Leave empty for full amount due"
                value={editDepositThb}
                disabled={editPending}
                onChange={(e) => setEditDepositThb(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-due">Due date (optional)</Label>
            <Input
              id="edit-due"
              type="date"
              value={editDueDate}
              disabled={editPending}
              onChange={(e) => setEditDueDate(e.target.value)}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Status</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {EDITABLE_STATUSES.map((status) => {
                const selected = editStatus === status;
                return (
                  <label
                    key={status}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                      selected
                        ? "border-siam-blue bg-siam-blue/5 ring-1 ring-siam-blue"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="invoice-status"
                      className="mt-0.5 accent-siam-blue"
                      checked={selected}
                      disabled={editPending}
                      onChange={() => setEditStatus(status)}
                    />
                    <span>
                      <span className="font-medium">{INVOICE_STATUS_LABELS[status]}</span>
                      {status === "paid" && (
                        <span className="mt-0.5 block text-xs text-gray-500">
                          Use this when sending an invoice after the customer already paid.
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="edit-client-address">Client address</Label>
            <textarea
              id="edit-client-address"
              rows={4}
              value={editClientAddress}
              disabled={editPending}
              onChange={(e) => setEditClientAddress(e.target.value)}
              placeholder="Billing address shown in the invoice PDF"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" onClick={onSaveEdit} disabled={editPending}>
              {editPending ? "Saving…" : "Save changes"}
            </Button>
            {!isPaid && editStatus !== "paid" && (
              <Button type="button" variant="outline" onClick={onMarkPaid} disabled={editPending}>
                Save and mark paid
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Recorded against this invoice.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex justify-between gap-3">
                  <span>
                    {formatCurrency(payment.amount)} · {payment.status}
                    {payment.method ? ` · ${payment.method}` : ""}
                  </span>
                  <span className="text-gray-500">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload invoice PDF</CardTitle>
          <CardDescription>
            Store a signed or external PDF on the server (Vercel Blob). This does not replace the generated PDF but
            gives you a permanent link for your records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoice.attachedPdfUrl && (
            <p className="text-sm">
              <span className="text-gray-500">Attached file:</span>{" "}
              <a
                href={invoice.attachedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-siam-blue underline"
              >
                Open uploaded PDF
              </a>
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="pdf-file">PDF file (max 15MB)</Label>
            <input
              id="pdf-file"
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-siam-blue file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            />
          </div>
          <Button type="button" disabled={pending} onClick={onUpload}>
            {pending ? "Uploading…" : "Upload to server"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
