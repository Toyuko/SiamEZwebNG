import { prisma } from "@/lib/db";
import {
  getPusherServer,
  jobChannel,
  jobLocationChannel,
} from "@/lib/pusher-server";

export type JobLocationHistoryEntry = {
  id: string;
  status: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export type JobLocationPayload = {
  jobId: string;
  trackingStatus: string | null;
  isCurrentlyInTransit: boolean;
  trackingHistory: JobLocationHistoryEntry[];
  realtime: {
    channel: string;
    legacyChannel: string;
    authEndpoint: string;
    event: string;
    pusherKey: string;
    pusherCluster: string;
  } | null;
  /** Helps debug why live GPS may not connect (safe to log in browser). */
  realtimeDiagnostics: {
    isCurrentlyInTransit: boolean;
    clientPusherConfigured: boolean;
    serverPusherConfigured: boolean;
    willSubscribe: boolean;
  };
};

export async function getJobLocationTracking(
  jobId: string
): Promise<JobLocationPayload | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      trackingStatus: true,
      isCurrentlyInTransit: true,
      trackingHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          note: true,
          latitude: true,
          longitude: true,
          createdAt: true,
        },
      },
    },
  });

  if (!job) return null;

  const trackingHistory: JobLocationHistoryEntry[] = job.trackingHistory.map(
    (entry) => ({
      id: entry.id,
      status: entry.status,
      note: entry.note,
      latitude: entry.latitude,
      longitude: entry.longitude,
      createdAt: entry.createdAt.toISOString(),
    })
  );

  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim() ?? "";
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim() ?? "";
  const clientPusherConfigured = Boolean(pusherKey && pusherCluster);
  const serverPusherConfigured = Boolean(getPusherServer());
  const willSubscribe =
    job.isCurrentlyInTransit && clientPusherConfigured;

  const realtime = willSubscribe
      ? {
          /** Unified job channel (same as chat / tracking-updated). */
          channel: jobChannel(jobId),
          /** Legacy channel — still listened to for older mobile builds. */
          legacyChannel: jobLocationChannel(jobId),
          authEndpoint: "/api/chat/pusher-auth",
          event: "location-update",
          pusherKey,
          pusherCluster,
        }
      : null;

  return {
    jobId: job.id,
    trackingStatus: job.trackingStatus,
    isCurrentlyInTransit: job.isCurrentlyInTransit,
    trackingHistory,
    realtime,
    realtimeDiagnostics: {
      isCurrentlyInTransit: job.isCurrentlyInTransit,
      clientPusherConfigured,
      serverPusherConfigured,
      willSubscribe,
    },
  };
}

export type LocationCoordinate = {
  latitude: number;
  longitude: number;
  /** @deprecated Prefer `timestamp` — kept for internal callers */
  recordedAt?: string;
  timestamp?: string;
};

/** Broadcast live coordinates to subscribers on the job location channel. */
export async function broadcastJobLocationUpdate(
  jobId: string,
  coordinate: LocationCoordinate
): Promise<void> {
  const pusher = getPusherServer();
  if (!pusher) return;

  const timestamp =
    coordinate.timestamp ??
    coordinate.recordedAt ??
    new Date().toISOString();

  const payload = {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    timestamp,
    jobId,
  };

  await Promise.all([
    pusher.trigger(jobChannel(jobId), "location-update", payload),
    pusher.trigger(jobLocationChannel(jobId), "location-update", payload),
  ]);
}
