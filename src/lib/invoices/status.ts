import type { InvoiceStatus } from "@prisma/client";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  unpaid: "Unpaid (sent)",
  pending_verification: "Pending verification",
  paid: "Paid",
  rejected: "Rejected",
};

export const INVOICE_STATUS_BADGE_CLASS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  pending_verification: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function invoiceStatusLabel(status: InvoiceStatus | string): string {
  return INVOICE_STATUS_LABELS[status as InvoiceStatus] ?? status;
}

export function invoiceDocumentTitle(status: InvoiceStatus | string): string {
  return status === "paid" ? "PAID INVOICE" : "INVOICE";
}

export function invoiceTotalLabel(status: InvoiceStatus | string): string {
  return status === "paid" ? "PAID IN FULL" : "TOTAL DUE";
}
