"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { EditJobModal } from "./EditJobModal";
import { AssignStaffModal } from "./AssignStaffModal";
import { Eye, Pencil, Users } from "lucide-react";
import { useState } from "react";
import type { Prisma } from "@prisma/client";

type JobWithRelations = Prisma.CaseGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; phone: true } };
    service: { select: { id: true; name: true; slug: true } };
    staffAssignments: { include: { user: { select: { id: true; name: true; email: true } } } };
    invoices: { select: { id: true; amount: true }; orderBy: { createdAt: "desc" }; take: 1 };
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
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAssignJob(job)}
                      title="Assign staff"
                    >
                      <Users className="h-4 w-4" />
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
