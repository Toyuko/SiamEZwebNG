import { prisma } from "@/lib/db";
import { notifyClientJobCompleted } from "@/lib/jobs/notify-client";
import { initializeJobTracking } from "@/lib/jobs/tracking";

export async function acceptJobForFreelancer(freelancerId: string, jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { service: { select: { slug: true } } },
  });
  if (!job || job.status !== "open" || job.assignmentSource !== "freelancer") {
    return { error: "Job is no longer available." as const };
  }

  if (job.isSpecialMemberOnly) {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: freelancerId },
      select: { isSpecialMember: true, verificationStatus: true },
    });
    if (!profile?.isSpecialMember || profile.verificationStatus !== "verified") {
      return { error: "This job is for Special Members only." as const };
    }
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      freelancerId,
      status: "in_progress",
    },
  });

  await initializeJobTracking(jobId, job.service?.slug ?? null);

  return { ok: true as const };
}

export async function markJobCompleteForFreelancer(
  freelancerId: string,
  jobId: string,
  freelancerName?: string | null
) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      postedBy: { select: { email: true, name: true } },
      freelancer: { select: { name: true } },
    },
  });

  if (!job || job.freelancerId !== freelancerId) {
    return { error: "Job not found." as const };
  }
  if (job.status !== "in_progress") {
    return { error: "Only active jobs can be marked complete." as const };
  }

  const now = new Date();
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "completed_awaiting_review",
      completionSubmittedAt: now,
    },
  });

  void notifyClientJobCompleted({
    jobId: job.id,
    jobTitle: job.title,
    clientEmail: job.postedBy.email,
    clientName: job.postedBy.name,
    freelancerName: job.freelancer?.name ?? freelancerName ?? null,
  });

  return { ok: true as const, completionSubmittedAt: now.toISOString() };
}
