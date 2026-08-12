import type { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { JOB_AUTO_APPROVE_MS } from "./constants";
import { triggerFreelancerPayout } from "./payout";

const AWAITING_REVIEW_STATUSES: JobStatus[] = ["completed_awaiting_review", "completed"];

/** Approve marketplace jobs past the 1-hour review window when auto-approval is enabled. */
export async function autoApproveStaleCompletedJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - JOB_AUTO_APPROVE_MS);

  const stale = await prisma.job.findMany({
    where: {
      status: { in: AWAITING_REVIEW_STATUSES },
      enableAutoApproval: true,
      completionSubmittedAt: { lte: cutoff },
    },
    select: {
      id: true,
      title: true,
      payoutAmount: true,
      amount: true,
      currency: true,
      freelancerId: true,
    },
  });

  if (stale.length === 0) return 0;

  const now = new Date();
  await prisma.job.updateMany({
    where: { id: { in: stale.map((j) => j.id) } },
    data: {
      status: "approved",
      approvedAt: now,
    },
  });

  for (const job of stale) {
    if (job.freelancerId) {
      void triggerFreelancerPayout({
        jobId: job.id,
        jobTitle: job.title,
        freelancerId: job.freelancerId,
        payoutAmount: job.payoutAmount ?? job.amount,
        currency: job.currency,
      });
    }
  }

  return stale.length;
}
