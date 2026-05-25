import Pusher from "pusher";

let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  const cluster = process.env.PUSHER_CLUSTER?.trim();

  if (!appId || !key || !secret || !cluster) {
    return null;
  }

  if (!pusherServer) {
    pusherServer = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  return pusherServer;
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

export async function isUserActiveInJobChat(
  jobId: string,
  userId: string
): Promise<boolean> {
  const pusher = getPusherServer();
  if (!pusher) return false;

  try {
    const response = await pusher.get({
      path: `/channels/${jobPresenceChannel(jobId)}/users`,
    });
    const body = response.body as { users?: { id: string }[] } | undefined;
    return (body?.users ?? []).some((user) => user.id === userId);
  } catch {
    return false;
  }
}
