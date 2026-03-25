"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@prisma/client";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    case: { select: { id: true; caseNumber: true; guestName: true; guestEmail: true } };
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
    unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    pending_verification: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return map[s] ?? "bg-gray-100 text-gray-800";
}

function buildInvoicePageUrl(searchParams: { status?: string; page?: string }, p: number) {
  const params = new URLSearchParams();
  if (searchParams.status && searchParams.status !== "all") params.set("status", searchParams.status);
  params.set("page", String(p));
  return `/admin/invoices?${params.toString()}`;
}

export function InvoiceTable({
  invoices,
  total,
  page,
  totalPages,
  searchParams,
}: {
  invoices: InvoiceWithRelations[];
  total: number;
  page: number;
  totalPages: number;
  searchParams: { status?: string; page?: string };
}) {
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
            <th className="px-4 py-3 font-medium">Actions</th>
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
                {inv.user?.name ?? inv.user?.email ?? inv.case.guestName ?? inv.case.guestEmail ?? "—"}
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
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <Link href={`/admin/invoices/${inv.id}`} className="text-siam-blue hover:underline">
                    View
                  </Link>
                  <a
                    href={`/api/admin/invoices/${inv.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-siam-blue hover:underline"
                  >
                    PDF
                  </a>
                  <Link href={`/admin/cases/${inv.case.id}`} className="text-siam-blue hover:underline">
                    Case
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={buildInvoicePageUrl(searchParams, page - 1)}>Previous</Link>
              ) : (
                <span>Previous</span>
              )}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
              {page < totalPages ? (
                <Link href={buildInvoicePageUrl(searchParams, page + 1)}>Next</Link>
              ) : (
                <span>Next</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
