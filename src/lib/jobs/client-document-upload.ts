import { prisma } from "@/lib/db";
import { appendJobTrackingHistory } from "@/data-access/job-tracking";
import { isTrackableServiceSlug } from "@/config/job-tracking-steps";
import { assertClientCanUploadJobDocuments } from "@/lib/jobs/tracking-access";

export async function submitClientJobDocument(
  clientId: string,
  jobId: string,
  attachment: { url: string; name: string },
  note?: string | null
) {
  await assertClientCanUploadJobDocuments(clientId, jobId);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { service: { select: { slug: true } } },
  });

  if (!job || !isTrackableServiceSlug(job.service?.slug ?? null)) {
    return { error: "This job does not support document uploads." as const };
  }

  if (!job.trackingStatus) {
    return { error: "Tracking has not started for this job yet." as const };
  }

  const trimmedNote =
    typeof note === "string" && note.trim().length > 0 ? note.trim() : null;

  await appendJobTrackingHistory(
    jobId,
    job.trackingStatus,
    trimmedNote,
    attachment
  );

  return { ok: true as const };
}
