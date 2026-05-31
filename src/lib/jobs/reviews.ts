import { prisma } from "@/lib/db";
import type { JobStatus, Prisma, TrackingStatus } from "@prisma/client";

export function canSubmitJobReview(input: {
  status: JobStatus;
  trackingStatus: TrackingStatus | null;
}): boolean {
  return input.status === "approved" || input.trackingStatus === "DELIVERED";
}

export async function recalculateFreelancerRatings(
  tx: Prisma.TransactionClient,
  freelancerUserId: string
) {
  const stats = await tx.review.aggregate({
    where: { freelancerId: freelancerUserId },
    _avg: { rating: true },
    _count: { id: true },
  });

  await tx.freelancerProfile.update({
    where: { userId: freelancerUserId },
    data: {
      averageRating: stats._avg.rating ?? 0,
      totalReviews: stats._count.id,
    },
  });

  return {
    averageRating: stats._avg.rating ?? 0,
    totalReviews: stats._count.id,
  };
}

export async function createJobReview(input: {
  clientId: string;
  jobId: string;
  rating: number;
  comment?: string | null;
}) {
  const job = await prisma.job.findUnique({
    where: { id: input.jobId },
    select: {
      id: true,
      postedById: true,
      freelancerId: true,
      status: true,
      trackingStatus: true,
      review: { select: { id: true } },
    },
  });

  if (!job || job.postedById !== input.clientId) {
    return { error: "Job not found." as const };
  }

  if (!job.freelancerId) {
    return { error: "This job has no assigned freelancer to review." as const };
  }

  if (!canSubmitJobReview(job)) {
    return {
      error: "You can only review after the job is approved or marked delivered." as const,
    };
  }

  if (job.review) {
    return { error: "A review already exists for this job." as const };
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { error: "Rating must be an integer from 1 to 5." as const };
  }

  const trimmedComment =
    typeof input.comment === "string" && input.comment.trim().length > 0
      ? input.comment.trim()
      : null;

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        jobId: job.id,
        clientId: input.clientId,
        freelancerId: job.freelancerId!,
        rating: input.rating,
        comment: trimmedComment,
      },
    });

    await recalculateFreelancerRatings(tx, job.freelancerId!);
    return created;
  });

  return { ok: true as const, review };
}
