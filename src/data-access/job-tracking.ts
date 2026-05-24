import type { TrackingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getTrackingStepsForServiceSlug,
  isTrackableServiceSlug,
  type TrackingStep,
} from "@/config/job-tracking-steps";
import { formatFreelancerDisplayName } from "@/lib/jobs/freelancer-display";

const jobTrackingInclude = {
  service: { select: { id: true, slug: true, name: true } },
  freelancer: { select: { id: true, name: true } },
  trackingHistory: { orderBy: { createdAt: "asc" as const } },
} as const;

export async function appendJobTrackingHistory(
  jobId: string,
  status: TrackingStatus,
  note?: string | null,
  attachment?: { url: string; name: string } | null
) {
  await prisma.jobTrackingHistory.create({
    data: {
      jobId,
      status,
      note:
        typeof note === "string" && note.trim().length > 0 ? note.trim() : null,
      attachmentUrl: attachment?.url ?? null,
      attachmentName: attachment?.name ?? null,
    },
  });
}

export async function getClientJobTracking(jobId: string, clientId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: jobTrackingInclude,
  });

  if (!job || job.postedById !== clientId) {
    return null;
  }

  const serviceSlug = job.service?.slug ?? null;
  const steps: TrackingStep[] | null = getTrackingStepsForServiceSlug(serviceSlug);

  let trackingHistory = job.trackingHistory.map((entry) => ({
    id: entry.id,
    status: entry.status,
    note: entry.note,
    attachmentUrl: entry.attachmentUrl,
    attachmentName: entry.attachmentName,
    createdAt: entry.createdAt.toISOString(),
  }));

  if (
    trackingHistory.length === 0 &&
    job.trackingStatus &&
    isTrackableServiceSlug(serviceSlug)
  ) {
    trackingHistory = [
      {
        id: "legacy-current",
        status: job.trackingStatus,
        note: job.trackingNotes,
        attachmentUrl: null,
        attachmentName: null,
        createdAt: job.updatedAt.toISOString(),
      },
    ];
  }

  return {
    job: {
      id: job.id,
      title: job.title,
      status: job.status,
      trackingStatus: job.trackingStatus,
      completionSubmittedAt: job.completionSubmittedAt?.toISOString() ?? null,
      enableAutoApproval: job.enableAutoApproval,
      updatedAt: job.updatedAt.toISOString(),
      service: job.service
        ? { id: job.service.id, slug: job.service.slug, name: job.service.name }
        : null,
      freelancer: job.freelancer
        ? {
            displayName: formatFreelancerDisplayName(job.freelancer.name),
          }
        : null,
    },
    trackingHistory,
    steps,
    isTrackable: isTrackableServiceSlug(serviceSlug),
  };
}

export function serializeClientJobTracking(payload: NonNullable<
  Awaited<ReturnType<typeof getClientJobTracking>>
>) {
  return payload;
}
