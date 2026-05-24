import { prisma } from "@/lib/db";

export type JobTrackingAccess = {
  jobId: string;
  postedById: string;
  freelancerId: string | null;
  status: string;
};

export async function getJobTrackingAccess(
  jobId: string
): Promise<JobTrackingAccess | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      postedById: true,
      freelancerId: true,
      status: true,
    },
  });
  if (!job) return null;
  return {
    jobId: job.id,
    postedById: job.postedById,
    freelancerId: job.freelancerId,
    status: job.status,
  };
}

/** Client (job owner) or assigned freelancer may view tracking data and attachments. */
export async function assertJobTrackingViewer(
  userId: string,
  jobId: string
): Promise<JobTrackingAccess> {
  const job = await getJobTrackingAccess(jobId);
  if (!job) {
    throw new Error("Forbidden");
  }
  const isClient = job.postedById === userId;
  const isFreelancer = job.freelancerId === userId;
  if (!isClient && !isFreelancer) {
    throw new Error("Forbidden");
  }
  return job;
}

/** Only the assigned freelancer may upload tracking attachments or update progress. */
export async function assertFreelancerCanUpdateJobTracking(
  userId: string,
  jobId: string
): Promise<JobTrackingAccess> {
  const job = await getJobTrackingAccess(jobId);
  if (!job || job.freelancerId !== userId) {
    throw new Error("Forbidden");
  }
  if (job.status !== "in_progress") {
    throw new Error("Forbidden");
  }
  return job;
}
