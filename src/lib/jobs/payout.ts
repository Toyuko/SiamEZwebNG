/** Fire-and-forget payout notification when a freelancer job is approved. */
export async function triggerFreelancerPayout(input: {
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  payoutAmount: number;
  currency: string;
}): Promise<void> {
  const url = process.env.CONTACT_FORM_WEBHOOK_URL?.trim();
  if (!url) {
    console.warn("[jobs-payout] CONTACT_FORM_WEBHOOK_URL not set; payout webhook skipped.");
    return;
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "freelancer-job-payout",
        receivedAt: new Date().toISOString(),
        ...input,
        message: `Payout released for job "${input.jobTitle}".`,
      }),
    });
  } catch (e) {
    console.warn("[jobs-payout] payout notify failed:", e);
  }
}
