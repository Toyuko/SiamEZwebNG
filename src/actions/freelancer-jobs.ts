"use server";

import { revalidatePath } from "next/cache";
import { requireFreelancer } from "@/lib/auth";
import {
  acceptJobForFreelancer,
  markJobCompleteForFreelancer,
} from "@/lib/jobs/freelancer-actions";

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
