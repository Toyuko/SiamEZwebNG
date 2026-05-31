"use client";

import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AdminAutoApprovalTimer } from "@/components/admin/AdminAutoApprovalTimer";
import { approveFreelancerJob, removeFreelancerFromJob, removeMarketplaceJob } from "@/actions/admin";
import { formatJobAmount } from "@/data-access/job";
import { isAwaitingReviewStatus } from "@/lib/jobs/auto-approve";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";
import { Eye, Crown, UserMinus, Trash2 } from "lucide-react";
import { FreelancerRatingBadge } from "@/components/freelancer/FreelancerRatingBadge";

export type MarketplaceJobRow = {
  id: string;
  title: string;
  status: JobStatus;
  amount: number;
  payoutAmount: number | null;
  currency: string;
  isSpecialMemberOnly: boolean;
  enableAutoApproval: boolean;
  completionSubmittedAt: Date | null;
  createdAt: Date;
  postedBy: { id: string; name: string | null; email: string };
  freelancer: {
    id: string;
    name: string | null;
    email: string;
    freelancerProfile: {
      isSpecialMember: boolean;
      averageRating: number;
      totalReviews: number;
    } | null;
  } | null;
  service: { id: string; name: string } | null;
};

type SearchParams = {
  search?: string;
  status?: string;
  page?: string;
};

const statusStyles: Record<string, string> = {
  open: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed_awaiting_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  completed_awaiting_review: "Awaiting review",
  completed: "Awaiting review",
  approved: "Approved",
};

function buildPageUrl(searchParams: SearchParams, p: number) {
  const params = new URLSearchParams();
  params.set("source", "freelancer");
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.status && searchParams.status !== "all") params.set("status", searchParams.status);
  params.set("page", String(p));
  return `/admin/service-jobs?${params.toString()}`;
}

export function MarketplaceJobsTable({
  jobs,
  total,
  page,
  totalPages,
  searchParams,
}: {
  jobs: MarketplaceJobRow[];
  total: number;
  page: number;
  totalPages: number;
  searchParams: SearchParams;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleApprove(jobId: string) {
    startTransition(async () => {
      await approveFreelancerJob(jobId);
      router.refresh();
    });
  }

  function handleRemove(jobId: string, assigneeName: string) {
    if (
      !confirm(
        `Remove ${assigneeName} from this job? The job will return to the open marketplace.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      await removeFreelancerFromJob(jobId);
      router.refresh();
    });
  }

  function handleRemoveJob(jobId: string, jobTitle: string) {
    if (
      !confirm(
        `Remove "${jobTitle}" from the marketplace listing? This cannot be undone.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      await removeMarketplaceJob(jobId);
      router.refresh();
    });
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No marketplace jobs yet.</p>
        <p className="mt-2 text-sm text-gray-400">
          Create a job with assignment source &quot;Freelancer&quot; to dispatch to the portal.
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
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Payout</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Timer</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const awaitingReview =
                isAwaitingReviewStatus(job.status) && job.completionSubmittedAt != null;
              const payout = job.payoutAmount ?? job.amount;

              return (
                <tr
                  key={job.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{job.title}</p>
                    {job.service && (
                      <p className="text-xs text-gray-500">{job.service.name}</p>
                    )}
                    {job.isSpecialMemberOnly && (
                      <span className="mt-1 inline-flex items-center gap-0.5 rounded bg-siam-yellow/20 px-1.5 py-0.5 text-xs text-siam-blue-dark">
                        <Crown className="h-3 w-3" />
                        Special member job
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {job.postedBy.name ?? job.postedBy.email}
                  </td>
                  <td className="px-4 py-3">{formatJobAmount(payout, job.currency)}</td>
                  <td className="px-4 py-3">
                    {job.freelancer ? (
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-medium">
                            {job.freelancer.name ?? job.freelancer.email}
                          </p>
                          {job.freelancer.freelancerProfile?.isSpecialMember && (
                            <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-siam-yellow px-2 py-0.5 text-xs font-medium text-siam-blue-dark">
                              <Crown className="h-3 w-3" />
                              Special Member
                            </span>
                          )}
                          {job.freelancer.freelancerProfile && (
                            <FreelancerRatingBadge
                              averageRating={job.freelancer.freelancerProfile.averageRating}
                              totalReviews={job.freelancer.freelancerProfile.totalReviews}
                              className="mt-1"
                            />
                          )}
                        </div>
                        {job.status === "in_progress" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-red-600 hover:text-red-700"
                            title="Remove freelancer"
                            disabled={pending}
                            onClick={() =>
                              handleRemove(
                                job.id,
                                job.freelancer!.name ?? job.freelancer!.email
                              )
                            }
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        statusStyles[job.status] ?? statusStyles.open
                      )}
                    >
                      {statusLabel[job.status] ?? job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {awaitingReview ? (
                      <AdminAutoApprovalTimer
                        completionSubmittedAt={job.completionSubmittedAt!}
                        enableAutoApproval={job.enableAutoApproval}
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/portal/jobs/${job.id}`} title="View tracking">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {job.status !== "approved" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Remove from listing"
                          disabled={pending}
                          onClick={() => handleRemoveJob(job.id, job.title)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                      {isAwaitingReviewStatus(job.status) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={pending}
                          onClick={() => handleApprove(job.id)}
                        >
                          Approve
                        </Button>
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
    </>
  );
}
