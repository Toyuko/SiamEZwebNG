"use server";

import { revalidatePath } from "next/cache";
import { requireFreelancer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyClientJobCompleted } from "@/lib/jobs/notify-client";

export async function acceptJob(jobId: string) {
  const session = await requireFreelancer();

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "open") {
    return { error: "Job is no longer available." };
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      freelancerId: session.user.id,
      status: "in_progress",
    },
  });

  revalidatePath("/portal/freelancer");
  return { ok: true as const };
}

export async function markJobComplete(jobId: string) {
  const session = await requireFreelancer();

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      postedBy: { select: { email: true, name: true } },
      freelancer: { select: { name: true } },
    },
  });

  if (!job || job.freelancerId !== session.user.id) {
    return { error: "Job not found." };
  }
  if (job.status !== "in_progress") {
    return { error: "Only active jobs can be marked complete." };
  }

  const now = new Date();
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completionSubmittedAt: now,
    },
  });

  void notifyClientJobCompleted({
    jobId: job.id,
    jobTitle: job.title,
    clientEmail: job.postedBy.email,
    clientName: job.postedBy.name,
    freelancerName: job.freelancer?.name ?? session.user.name,
  });

  revalidatePath("/portal/freelancer");
  revalidatePath(`/portal/jobs/${jobId}`);
  return { ok: true as const, completionSubmittedAt: now.toISOString() };
}
