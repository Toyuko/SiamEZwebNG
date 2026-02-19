"use client";

import Link from "next/link";
import type { Prisma } from "@prisma/client";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    case: { select: { id: true; caseNumber: true } };
    user: { select: { id: true; name: true; email: true } };
  };
}>;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return map[s] ?? "bg-gray-100 text-gray-800";
}

export function InvoiceTable({ invoices }: { invoices: InvoiceWithRelations[] }) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No invoices yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <th className="px-4 py-3 font-medium">Invoice ID</th>
            <th className="px-4 py-3 font-medium">Case</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Due date</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
            >
              <td className="px-4 py-3 font-mono text-siam-blue">{inv.id.slice(0, 8)}…</td>
              <td className="px-4 py-3">
                <Link href={`/admin/cases/${inv.case.id}`} className="text-siam-blue hover:underline">
                  {inv.case.caseNumber}
                </Link>
              </td>
              <td className="px-4 py-3">
                {inv.user.name ?? inv.user.email}
              </td>
              <td className="px-4 py-3">{formatCurrency(inv.amount)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(inv.status)}`}>
                  {inv.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/cases/${inv.case.id}`}
                  className="text-siam-blue hover:underline"
                >
                  View case
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
