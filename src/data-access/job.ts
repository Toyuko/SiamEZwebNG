import type { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { autoApproveStaleCompletedJobs } from "@/lib/jobs/auto-approve";

const AWAITING_REVIEW: JobStatus[] = ["completed_awaiting_review", "completed"];

const jobInclude = {
  postedBy: { select: { id: true, name: true, email: true } },
  freelancer: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      freelancerProfile: {
        select: { averageRating: true, totalReviews: true, isSpecialMember: true },
      },
    },
  },
  service: { select: { id: true, slug: true, name: true } },
} as const;

export async function runJobMaintenance() {
  await autoApproveStaleCompletedJobs();
}

export async function getOpenJobsForFeed(freelancerId: string) {
  await runJobMaintenance();
  const profile = await prisma.freelancerProfile.findUnique({
    where: { userId: freelancerId },
    select: { isSpecialMember: true },
  });
  const isSpecial = profile?.isSpecialMember ?? false;

  return prisma.job.findMany({
    where: {
      status: "open",
      assignmentSource: "freelancer",
      ...(isSpecial ? {} : { isSpecialMemberOnly: false }),
    },
    include: jobInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** Jobs posted by a client (admin-created marketplace jobs). */
export async function getJobsByClientId(clientId: string) {
  await runJobMaintenance();
  return prisma.job.findMany({
    where: { postedById: clientId, assignmentSource: "freelancer" },
    include: jobInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getJobsByFreelancerId(freelancerId: string) {
  await runJobMaintenance();
  return prisma.job.findMany({
    where: { freelancerId },
    include: jobInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getActiveJobsByFreelancerId(freelancerId: string) {
  await runJobMaintenance();
  return prisma.job.findMany({
    where: {
      freelancerId,
      status: { in: ["in_progress", ...AWAITING_REVIEW] satisfies JobStatus[] },
    },
    include: jobInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getJobById(jobId: string) {
  await runJobMaintenance();
  return prisma.job.findUnique({
    where: { id: jobId },
    include: jobInclude,
  });
}

export async function getFreelancerRevenueStats(freelancerId: string) {
  await runJobMaintenance();
  const [approved, pending] = await Promise.all([
    prisma.job.aggregate({
      where: { freelancerId, status: "approved" },
      _sum: { amount: true },
    }),
    prisma.job.aggregate({
      where: { freelancerId, status: { in: AWAITING_REVIEW } },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalEarned: approved._sum.amount ?? 0,
    pendingClearance: pending._sum.amount ?? 0,
  };
}

export function formatJobAmount(amount: number, currency: string): string {
  const value = amount / 100;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
