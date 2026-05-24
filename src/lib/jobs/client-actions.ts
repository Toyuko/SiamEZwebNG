import { prisma } from "@/lib/db";
import { triggerFreelancerPayout } from "@/lib/jobs/payout";
import { isAwaitingReviewStatus } from "@/lib/jobs/auto-approve";

export async function approveJobByClient(clientId: string, jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      postedById: true,
      status: true,
      payoutAmount: true,
      amount: true,
      currency: true,
      freelancerId: true,
    },
  });

  if (!job || job.postedById !== clientId) {
    return { error: "Job not found." as const };
  }

  if (!isAwaitingReviewStatus(job.status)) {
    return { error: "This job is not awaiting your approval." as const };
  }

  const now = new Date();
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "approved",
      approvedAt: now,
    },
  });

  if (job.freelancerId) {
    void triggerFreelancerPayout({
      jobId: job.id,
      jobTitle: job.title,
      freelancerId: job.freelancerId,
      payoutAmount: job.payoutAmount ?? job.amount,
      currency: job.currency,
    });
  }

  return { ok: true as const, approvedAt: now.toISOString() };
}
