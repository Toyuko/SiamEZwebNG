"use client";

import { Link } from "@/i18n/navigation";
import type { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";

type CaseWithRelations = Prisma.CaseGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; phone: true } };
    service: { select: { id: true; name: true; slug: true; type: true } };
    staffAssignments: { include: { user: { select: { id: true; name: true; email: true } } } };
  };
}>;

type SearchParams = { status?: string; serviceId?: string; search?: string; page?: string };

function buildPageUrl(searchParams: SearchParams, p: number) {
  const params = new URLSearchParams();
  if (searchParams.status && searchParams.status !== "all") params.set("status", searchParams.status);
  if (searchParams.serviceId) params.set("serviceId", searchParams.serviceId);
  if (searchParams.search) params.set("search", searchParams.search);
  params.set("page", String(p));
  return `/admin/cases?${params.toString()}`;
}

export function CaseTable({
  cases,
  total,
  page,
  totalPages,
  searchParams,
}: {
  cases: CaseWithRelations[];
  total: number;
  page: number;
  totalPages: number;
  searchParams: SearchParams;
}) {
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No cases yet.</p>
        <p className="mt-2 text-sm text-gray-400">
          Cases are created when a client completes a booking.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <th className="px-4 py-3 font-medium">Case #</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Assigned</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr
              key={c.id}
              className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
            >
              <td className="px-4 py-3 font-mono text-siam-blue">{c.caseNumber}</td>
              <td className="px-4 py-3">
                <span className="font-medium">{c.user?.name ?? c.guestName ?? "—"}</span>
                <span className="block text-xs text-gray-500">{c.user?.email ?? c.guestEmail ?? ""}</span>
              </td>
              <td className="px-4 py-3">{c.service.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColor(c.status)}`}
                >
                  {formatStatus(c.status)}
                </span>
              </td>
              <td className="px-4 py-3">
                {c.staffAssignments.length > 0
                  ? c.staffAssignments.map((a) => a.user.name ?? a.user.email).join(", ")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/cases/${c.id}`}
                  className="text-siam-blue hover:underline"
                >
                  View
                </Link>
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
                <Link href={buildPageUrl(searchParams, page - 1)}>Previous</Link>
              ) : (
                <span>Previous</span>
              )}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
              {page < totalPages ? (
                <Link href={buildPageUrl(searchParams, page + 1)}>Next</Link>
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

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    under_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    quoted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    awaiting_payment: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    pending_docs: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return map[s] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}
