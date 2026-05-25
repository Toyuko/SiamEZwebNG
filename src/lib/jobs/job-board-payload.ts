import {
  getPusherServer,
  privateSpecialJobsChannel,
  publicJobBoardChannel,
} from "@/lib/pusher-server";

export type JobBoardFeedItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
  payoutAmount: number | null;
  currency: string;
  isSpecialMemberOnly: boolean;
  category: string | null;
  service: { id: string; name: string; slug: string } | null;
  createdAt: string;
};

type JobForBoardPayload = {
  id: string;
  title: string;
  description: string;
  amount: number;
  payoutAmount: number | null;
  currency: string;
  isSpecialMemberOnly: boolean;
  createdAt: Date;
  service?: { id: string; slug: string; name: string } | null;
};

export function serializeJobBoardFeedItem(job: JobForBoardPayload): JobBoardFeedItem {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    amount: job.amount,
    payoutAmount: job.payoutAmount,
    currency: job.currency,
    isSpecialMemberOnly: job.isSpecialMemberOnly,
    category: job.service?.name ?? null,
    service: job.service
      ? { id: job.service.id, slug: job.service.slug, name: job.service.name }
      : null,
    createdAt: job.createdAt.toISOString(),
  };
}

export async function broadcastNewJobPosted(job: JobForBoardPayload): Promise<void> {
  const pusher = getPusherServer();
  if (!pusher) return;

  const payload = serializeJobBoardFeedItem(job);
  const channel = job.isSpecialMemberOnly
    ? privateSpecialJobsChannel()
    : publicJobBoardChannel();

  await pusher.trigger(channel, "new-job-posted", payload);
}
