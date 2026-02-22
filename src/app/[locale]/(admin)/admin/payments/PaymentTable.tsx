"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { approvePayment, rejectPayment } from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";

type PaymentWithRelations = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  submittedAt: Date;
  invoice: {
    case: { id: string; caseNumber: string; service: { name: string } };
    user: { name: string | null; email: string };
  };
  proofDocument: { id: string; name: string; storageKey: string } | null;
};

function statusColor(s: string): string {
  const map: Record<string, string> = {
    submitted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return map[s] ?? "bg-gray-100 text-gray-800";
}

function buildPaymentPageUrl(searchParams: { status?: string; page?: string }, p: number) {
  const params = new URLSearchParams();
  if (searchParams.status && searchParams.status !== "all") params.set("status", searchParams.status);
  params.set("page", String(p));
  return `/admin/payments?${params.toString()}`;
}

export function PaymentTable({
  payments,
  total,
  page,
  totalPages,
  searchParams,
}: {
  payments: PaymentWithRelations[];
  total: number;
  page: number;
  totalPages: number;
  searchParams: { status?: string; page?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    startTransition(async () => {
      await approvePayment(id);
      router.refresh();
    });
  };

  const handleReject = (id: string) => {
    if (!confirm("Reject this payment?")) return;
    startTransition(async () => {
      await rejectPayment(id);
      router.refresh();
    });
  };

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No payments found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="px-4 py-3 font-medium">Case</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr
                key={p.id}
                className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
              >
                <td className="px-4 py-3">
                  <Link href={`/admin/cases/${p.invoice.case.id}`} className="text-siam-blue hover:underline">
                    {p.invoice.case.caseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.invoice.user?.name ?? p.invoice.user?.email ?? p.invoice.case.guestName ?? p.invoice.case.guestEmail ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(p.amount, p.currency)}</td>
                <td className="px-4 py-3 text-gray-500">{p.method}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(p.submittedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {p.status === "submitted" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(p.id)}
                        disabled={pending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(p.id)}
                        disabled={pending}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={buildPaymentPageUrl(searchParams, page - 1)}>Previous</Link>
              ) : (
                <span>Previous</span>
              )}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
              {page < totalPages ? (
                <Link href={buildPaymentPageUrl(searchParams, page + 1)}>Next</Link>
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
