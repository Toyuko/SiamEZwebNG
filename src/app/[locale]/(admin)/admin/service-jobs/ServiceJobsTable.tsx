"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { EditJobModal } from "./EditJobModal";
import { AssignStaffModal } from "./AssignStaffModal";
import { Eye, Pencil, Users, Banknote, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { Prisma } from "@prisma/client";
import { deleteServiceJob, deleteServiceJobs, markServiceJobPaid } from "@/actions/admin";
import { useRouter } from "next/navigation";

type JobWithRelations = Prisma.CaseGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; phone: true } };
    service: { select: { id: true; name: true; slug: true } };
    staffAssignments: { include: { user: { select: { id: true; name: true; email: true } } } };
    invoices: {
      select: { id: true; amount: true; status: true };
      orderBy: { createdAt: "desc" };
      take: 1;
    };
  };
}>;

type SearchParams = {
  search?: string;
  status?: string;
  serviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function buildPageUrl(searchParams: SearchParams, p: number) {
  const params = new URLSearchParams();
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.status && searchParams.status !== "all") params.set("status", searchParams.status);
  if (searchParams.serviceId) params.set("serviceId", searchParams.serviceId);
  if (searchParams.dateFrom) params.set("dateFrom", searchParams.dateFrom);
  if (searchParams.dateTo) params.set("dateTo", searchParams.dateTo);
  params.set("page", String(p));
  return `/admin/service-jobs?${params.toString()}`;
}

type StaffUser = { id: string; name: string | null; email: string };

export function ServiceJobsTable({
  jobs,
  total,
  page,
  totalPages,
  searchParams,
  staffUsers,
}: {
  jobs: JobWithRelations[];
  total: number;
  page: number;
  totalPages: number;
  searchParams: SearchParams;
  staffUsers: StaffUser[];
}) {
  const [editJob, setEditJob] = useState<JobWithRelations | null>(null);
  const [assignJob, setAssignJob] = useState<JobWithRelations | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const allVisibleSelected = jobs.length > 0 && jobs.every((job) => selectedIds.has(job.id));
  const someVisibleSelected = jobs.some((job) => selectedIds.has(job.id));

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const job of jobs) {
        if (checked) next.add(job.id);
        else next.delete(job.id);
      }
      return next;
    });
  };

  const handleMarkPaid = (job: JobWithRelations) => {
    if (job.invoices[0]?.status === "paid") return;
    startTransition(async () => {
      const res = await markServiceJobPaid(job.id, {
        amountSatang: job.invoices[0]?.amount,
      });
      if (!res.success) {
        window.alert(res.error ?? "Failed to mark as paid");
        return;
      }
      router.refresh();
    });
  };

  const handleDelete = (job: JobWithRelations) => {
    if (
      !confirm(
        `Delete job ${job.caseNumber}? This permanently removes it from the database and cannot be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteServiceJob(job.id);
      if (!res.success) {
        window.alert(res.error ?? "Failed to delete job");
        return;
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      router.refresh();
    });
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} selected job${ids.length === 1 ? "" : "s"}? This permanently removes them from the database and cannot be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteServiceJobs(ids);
      if (res.deleted > 0) {
        setSelectedIds(new Set());
      }
      if (res.failed.length > 0) {
        const detail = res.failed
          .slice(0, 5)
          .map((f) => `${f.caseNumber ?? f.id}: ${f.error}`)
          .join("\n");
        const more =
          res.failed.length > 5 ? `\n…and ${res.failed.length - 5} more` : "";
        window.alert(
          `Deleted ${res.deleted} job${res.deleted === 1 ? "" : "s"}.\n` +
            `${res.failed.length} could not be deleted:\n${detail}${more}`
        );
      } else if (!res.success) {
        window.alert(res.error ?? "Failed to delete jobs");
        return;
      }
      router.refresh();
    });
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No jobs yet.</p>
        <p className="mt-2 text-sm text-gray-400">
          Create a job using the &quot;+ Create Job&quot; button.
        </p>
      </div>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900/50">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {selectedIds.size} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete selected
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                  }}
                  onChange={(e) => toggleAllVisible(e.target.checked)}
                  aria-label="Select all jobs on this page"
                  disabled={pending}
                />
              </th>
              <th className="px-4 py-3 font-medium">Job ID</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Assigned Staff</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-siam-blue focus:ring-siam-blue"
                    checked={selectedIds.has(job.id)}
                    onChange={(e) => toggleOne(job.id, e.target.checked)}
                    aria-label={`Select job ${job.caseNumber}`}
                    disabled={pending}
                  />
                </td>
                <td className="px-4 py-3 font-mono text-siam-blue">{job.caseNumber}</td>
                <td className="px-4 py-3">{job.service.name}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{job.user?.name ?? job.user?.email ?? job.guestName ?? job.guestEmail ?? "—"}</span>
                  {(job.user?.phone ?? job.guestPhone) && (
                    <span className="block text-xs text-gray-500">{job.user?.phone ?? job.guestPhone}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(job.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {job.invoices[0] ? formatCurrency(job.invoices[0].amount) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3">
                  {job.staffAssignments.length > 0
                    ? job.staffAssignments.map((a) => a.user.name ?? a.user.email).join(", ")
                    : "None"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <Link href={`/admin/service-jobs/${job.id}`} title="View job">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditJob(job)}
                      title="Edit job"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {job.invoices[0]?.status !== "paid" &&
                      job.status !== "cancelled" &&
                      job.status !== "refunded" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-700 hover:text-green-800"
                          onClick={() => handleMarkPaid(job)}
                          disabled={pending}
                          title="Mark as paid (updates Finance)"
                        >
                          <Banknote className="h-4 w-4" />
                        </Button>
                      )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAssignJob(job)}
                      title="Assign staff"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(job)}
                      disabled={pending}
                      title="Delete job"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
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

      {editJob && (
        <EditJobModal
          job={editJob}
          staffUsers={staffUsers}
          onClose={() => setEditJob(null)}
        />
      )}
      {assignJob && (
        <AssignStaffModal
          job={assignJob}
          staffUsers={staffUsers}
          onClose={() => setAssignJob(null)}
        />
      )}
    </>
  );
}
