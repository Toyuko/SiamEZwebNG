/** Fire-and-forget client notification when a freelancer marks a job complete. */
export async function notifyClientJobCompleted(input: {
  jobId: string;
  jobTitle: string;
  clientEmail: string;
  clientName: string | null;
  freelancerName: string | null;
}): Promise<void> {
  const url = process.env.CONTACT_FORM_WEBHOOK_URL?.trim();
  if (!url) {
    console.warn("[jobs] CONTACT_FORM_WEBHOOK_URL not set; client notify skipped.");
    return;
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "freelancer-job-completed",
        receivedAt: new Date().toISOString(),
        ...input,
        message: `Freelancer marked "${input.jobTitle}" as done. Auto-approval in 60 minutes unless you review sooner.`,
      }),
    });
  } catch (e) {
    console.warn("[jobs] client notify failed:", e);
  }
}
