"use server";

import { revalidatePath } from "next/cache";
import { requireFreelancer } from "@/lib/auth";
import type { TrackingStatus } from "@prisma/client";
import {
  acceptJobForFreelancer,
  markJobCompleteForFreelancer,
} from "@/lib/jobs/freelancer-actions";
import { updateJobTrackingStatus } from "@/lib/jobs/tracking";

export async function acceptJob(jobId: string) {
  const session = await requireFreelancer();
  const result = await acceptJobForFreelancer(session.user.id, jobId);
  if ("error" in result) {
    return result;
  }
  revalidatePath("/portal/freelancer");
  return result;
}

export async function markJobComplete(jobId: string) {
  const session = await requireFreelancer();
  const result = await markJobCompleteForFreelancer(
    session.user.id,
    jobId,
    session.user.name
  );
  if ("error" in result) {
    return result;
  }
  revalidatePath("/portal/freelancer");
  revalidatePath(`/portal/jobs/${jobId}`);
  return result;
}

export async function updateJobTrackingProgress(
  jobId: string,
  status: TrackingStatus,
  notes?: string | null
) {
  const session = await requireFreelancer();
  const result = await updateJobTrackingStatus(
    session.user.id,
    jobId,
    status,
    notes,
    session.user.name
  );
  if ("error" in result) {
    return result;
  }
  revalidatePath("/portal/freelancer");
  revalidatePath(`/portal/jobs/${jobId}`);
  return result;
}
