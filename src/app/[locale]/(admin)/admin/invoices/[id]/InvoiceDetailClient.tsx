"use client";

import { useRef, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { uploadInvoicePdfAction } from "@/actions/invoice";
import { deleteInvoice, updateInvoice } from "@/actions/admin";

type InvoiceDetail = Prisma.InvoiceGetPayload<{
  include: {
    case: { include: { service: true; user: true } };
    user: true;
    payments: true;
    quote: true;
  };
}>;

function formatCurrency(satang: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(satang / 100);
}

export function InvoiceDetailClient({ invoice }: { invoice: InvoiceDetail }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();

  const [isEditing, setIsEditing] = useState(false);
  const [editAmountThb, setEditAmountThb] = useState(() => (invoice.amount / 100).toFixed(2));
  const [editDueDate, setEditDueDate] = useState(() => {
    if (!invoice.dueDate) return "";
    return new Date(invoice.dueDate).toISOString().slice(0, 10);
  });
  const [editStatus, setEditStatus] = useState(invoice.status);
  const [editClientAddress, setEditClientAddress] = useState(invoice.clientAddress ?? "");

  const statusOptions: Array<typeof invoice.status> = ["draft", "unpaid", "pending_verification", "paid", "rejected"];

  const clientLabel =
    invoice.user?.name ??
    invoice.user?.email ??
    invoice.case.guestName ??
    invoice.case.guestEmail ??
    "—";

  const pdfUrl = `/api/admin/invoices/${invoice.id}/pdf`;

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
    const amountNum = Number(editAmountThb);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      setMessage({ type: "err", text: "Amount must be a valid number (THB)." });
      return;
    }
    const amountSatang = Math.round(amountNum * 100);

    startEditTransition(async () => {
      const dueDateValue = editDueDate ? editDueDate : null;
      const res = await updateInvoice(invoice.id, {
        amount: amountSatang,
        status: editStatus,
        dueDate: dueDateValue,
        clientAddress: editClientAddress.trim() ? editClientAddress.trim() : null,
      });
      if (!res) {
        setMessage({ type: "err", text: "Failed to update invoice." });
        return;
      }
      setIsEditing(false);
      setMessage({ type: "ok", text: "Invoice updated." });
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice</h1>
          <p className="mt-1 font-mono text-sm text-gray-500">{invoice.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/invoices">Back to list</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing((v) => !v)}
            disabled={editPending || pending}
          >
            {isEditing ? "Close" : "Edit"}
          </Button>
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
          <p>
            <span className="text-gray-500">Status:</span> {invoice.status}
          </p>
          {invoice.dueDate && (
            <p>
              <span className="text-gray-500">Due:</span>{" "}
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          )}
          <p>
            <Button variant="default" size="sm" asChild className="mt-2">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </Button>
          </p>
          <p>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/cases/${invoice.case.id}`}>Open case</Link>
            </Button>
          </p>
        </CardContent>
      </Card>

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
          <Button type="button" disabled={pending} onClick={onUpload}>
            {pending ? "Uploading…" : "Upload to server"}
          </Button>
        </CardContent>
      </Card>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit invoice</CardTitle>
            <CardDescription>Update amount, due date, status, and client address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <p className={message.type === "ok" ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-red-600 dark:text-red-400"}>
                {message.text}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount (THB)</Label>
              <Input
                id="edit-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={editAmountThb}
                onChange={(e) => setEditAmountThb(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-due">Due date (optional)</Label>
              <Input
                id="edit-due"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-client-address">Client address</Label>
              <textarea
                id="edit-client-address"
                rows={4}
                value={editClientAddress}
                onChange={(e) => setEditClientAddress(e.target.value)}
                placeholder="Billing address shown in the invoice PDF"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={onSaveEdit} disabled={editPending}>
                {editPending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={editPending}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
