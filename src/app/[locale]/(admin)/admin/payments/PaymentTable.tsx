"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { approvePayment, rejectPayment } from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { Eye, Pencil, Loader2 } from "lucide-react";
import type { Payment, Prisma } from "@prisma/client";

type PaymentRow = Payment & {
  metadata: Prisma.JsonValue | null;
  invoice: {
    id: string;
    user: {
      name: string | null;
      email: string;
    } | null;
    case: {
      id: string;
      caseNumber: string;
      guestName: string | null;
      guestEmail: string | null;
      service: { name: string };
    };
  };
  proofDocument: { id: string; name: string; storageKey: string } | null;
};

function paymentMethodLabel(method: string, metadata: Prisma.JsonValue | null): string {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    "manualEntry" in metadata &&
    (metadata as { manualEntry?: boolean }).manualEntry
  ) {
    return "manual";
  }
  return method;
}

function displayStatus(status: string): { label: string; className: string } {
  switch (status) {
    case "submitted":
      return {
        label: "pending",
        className:
          "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "approved":
      return {
        label: "paid",
        className:
          "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      };
    case "rejected":
      return {
        label: "failed",
        className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      };
    default:
      return {
        label: status,
        className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      };
  }
}

function buildPaymentPageUrl(
  searchParams: {
    tab?: string;
    status?: string;
    page?: string;
    q?: string;
    method?: string;
  },
  p: number
) {
  const params = new URLSearchParams();
  if (searchParams.tab && searchParams.tab !== "all") params.set("tab", searchParams.tab);
  if (searchParams.status && !searchParams.tab && searchParams.status !== "all") {
    params.set("status", searchParams.status);
  }
  if (searchParams.q?.trim()) params.set("q", searchParams.q.trim());
  if (searchParams.method && searchParams.method !== "all") params.set("method", searchParams.method);
  params.set("page", String(p));
  return `/admin/payments?${params.toString()}`;
}

function clientDisplay(p: PaymentRow) {
  const u = p.invoice.user;
  const c = p.invoice.case;
  const name = u?.name ?? c.guestName ?? "—";
  const email = u?.email ?? c.guestEmail ?? "";
  return { name, email };
}

export function PaymentTable({
  payments,
  total,
  page,
  totalPages,
  searchParams,
}: {
  payments: PaymentRow[];
  total: number;
  page: number;
  totalPages: number;
  searchParams: {
    tab?: string;
    status?: string;
    page?: string;
    q?: string;
    method?: string;
  };
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
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-14 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No payments match your filters.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/40">
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Order Number</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Customer</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Service</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Amount</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Payment Method</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Date</th>
              <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const { name, email } = clientDisplay(p);
              const st = displayStatus(p.status);
              const methodShown = paymentMethodLabel(p.method, p.metadata);
              const caseId = p.invoice.case.id;
              return (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 transition-colors hover:bg-gray-50/80 dark:border-gray-800/80 dark:hover:bg-gray-900/40"
                >
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/cases/${caseId}`}
                      className="font-medium text-siam-blue hover:underline"
                    >
                      {p.invoice.case.caseNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
                    {email ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-gray-800 dark:text-gray-200">
                    {p.invoice.case.service.name}
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {methodShown}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium capitalize ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                    {new Date(p.submittedAt).toLocaleDateString("en-US")}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/cases/${caseId}`}
                        className="rounded-lg p-1.5 text-siam-blue hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        aria-label="View case"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/cases/${caseId}`}
                        className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        aria-label="Edit case"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {p.status === "submitted" && (
                        <div className="ml-2 flex gap-1 border-l border-gray-200 pl-2 dark:border-gray-700">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => handleApprove(p.id)}
                            disabled={pending}
                          >
                            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => handleReject(p.id)}
                            disabled={pending}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
