import type { JobStatus, TrackingStatus } from "@prisma/client";
import { getPusherServer, jobChannel } from "@/lib/pusher-server";

export type SerializedTrackingHistoryEntry = {
  id: string;
  status: TrackingStatus;
  note: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
};

export type TrackingUpdatedPayload = {
  trackingHistory: SerializedTrackingHistoryEntry;
  trackingStatus: TrackingStatus | null;
  jobStatus: JobStatus;
  completionSubmittedAt: string | null;
};

export function serializeTrackingHistoryEntry(entry: {
  id: string;
  status: TrackingStatus;
  note: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: Date;
}): SerializedTrackingHistoryEntry {
  return {
    id: entry.id,
    status: entry.status,
    note: entry.note,
    attachmentUrl: entry.attachmentUrl,
    attachmentName: entry.attachmentName,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function broadcastTrackingUpdated(
  jobId: string,
  payload: TrackingUpdatedPayload
): Promise<void> {
  const pusher = getPusherServer();
  if (!pusher) return;

  await pusher.trigger(jobChannel(jobId), "tracking-updated", payload);
}
