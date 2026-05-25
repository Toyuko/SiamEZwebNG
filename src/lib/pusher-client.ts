"use client";

import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();

  if (!key || !cluster) {
    return null;
  }

  if (!pusherClient) {
    pusherClient = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/chat/pusher-auth",
    });
  }

  return pusherClient;
}

/** Unified private channel for job chat, tracking, and related realtime events. */
export function jobChannel(jobId: string): string {
  return `private-job-${jobId}`;
}

/** @deprecated Use {@link jobChannel} — alias kept for gradual migration. */
export function jobChatChannel(jobId: string): string {
  return jobChannel(jobId);
}

export function jobPresenceChannel(jobId: string): string {
  return `presence-job-chat-${jobId}`;
}

export function jobLocationChannel(jobId: string): string {
  return `private-job-location-${jobId}`;
}

export function publicJobBoardChannel(): string {
  return "public-job-board";
}

export function privateSpecialJobsChannel(): string {
  return "private-special-jobs";
}
