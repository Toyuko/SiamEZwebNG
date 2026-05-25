import type { TrackingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getDefaultTrackingStatus,
  getTrackingStepsForServiceSlug,
  isTrackableServiceSlug,
} from "@/config/job-tracking-steps";
import { appendJobTrackingHistory } from "@/data-access/job-tracking";
import { notifyClientJobCompleted } from "@/lib/jobs/notify-client";
import { sendPushNotification } from "@/lib/sendPushNotification";
import {
  broadcastTrackingUpdated,
  serializeTrackingHistoryEntry,
} from "@/lib/jobs/tracking-realtime";

export async function updateJobTrackingStatus(
  freelancerId: string,
  jobId: string,
  status: TrackingStatus,
  notes?: string | null,
  freelancerName?: string | null,
  attachment?: { url: string; name: string } | null
) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      service: { select: { slug: true } },
      postedBy: { select: { email: true, name: true } },
      freelancer: { select: { name: true } },
    },
  });

  if (!job || job.freelancerId !== freelancerId) {
    return { error: "Job not found." as const };
  }
  if (job.status !== "in_progress") {
    return { error: "Only active jobs can be updated." as const };
  }

  const steps = getTrackingStepsForServiceSlug(job.service?.slug);
  if (!steps) {
    return { error: "This job does not support step tracking." as const };
  }

  if (!steps.some((s) => s.key === status)) {
    return { error: "Invalid status for this service." as const };
  }

  const now = new Date();
  const isDelivered = status === "DELIVERED";

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: {
      trackingStatus: status,
      trackingNotes:
        typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null,
      ...(isDelivered
        ? {
            status: "completed_awaiting_review",
            completionSubmittedAt: now,
          }
        : {}),
    },
    select: {
      status: true,
      trackingStatus: true,
      completionSubmittedAt: true,
    },
  });

  const historyEntry = await appendJobTrackingHistory(jobId, status, notes, attachment);

  void broadcastTrackingUpdated(jobId, {
    trackingHistory: serializeTrackingHistoryEntry(historyEntry),
    trackingStatus: updatedJob.trackingStatus,
    jobStatus: updatedJob.status,
    completionSubmittedAt:
      updatedJob.completionSubmittedAt?.toISOString() ?? null,
  });

  if (isDelivered) {
    void notifyClientJobCompleted({
      jobId: job.id,
      jobTitle: job.title,
      clientEmail: job.postedBy.email,
      clientName: job.postedBy.name,
      freelancerName: job.freelancer?.name ?? freelancerName ?? null,
    });

    void sendPushNotification(
      job.postedById,
      "Action Required",
      "Your service is complete! Please review within 60 mins.",
      { jobId: job.id, type: "auto_approval" }
    );
  }

  return {
    ok: true as const,
    trackingStatus: status,
    completionSubmittedAt: isDelivered ? now.toISOString() : null,
  };
}

/** Initialize tracking when a freelancer accepts a trackable service job. */
export async function initializeJobTracking(jobId: string, serviceSlug: string | null) {
  if (!isTrackableServiceSlug(serviceSlug)) return;

  const defaultStatus = getDefaultTrackingStatus(serviceSlug);
  if (!defaultStatus) return;

  await prisma.job.update({
    where: { id: jobId },
    data: { trackingStatus: defaultStatus },
  });

  await appendJobTrackingHistory(jobId, defaultStatus, null);
}
