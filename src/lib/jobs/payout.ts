import { prisma } from "@/lib/db";
import { sendPayoutEmail } from "@/lib/email/messages";

/** Fire-and-forget payout notification when a freelancer job is approved. */
export async function triggerFreelancerPayout(input: {
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  payoutAmount: number;
  currency: string;
}): Promise<void> {
  const freelancer = await prisma.user.findUnique({
    where: { id: input.freelancerId },
    select: { email: true, name: true },
  });

  if (!freelancer?.email) {
    console.warn("[jobs-payout] freelancer email missing; payout email skipped.");
    return;
  }

  sendPayoutEmail({
    freelancerEmail: freelancer.email,
    freelancerName: freelancer.name,
    jobTitle: input.jobTitle,
    payoutAmount: input.payoutAmount,
    currency: input.currency,
  });
}
