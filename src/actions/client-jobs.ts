"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { approveJobByClient } from "@/lib/jobs/client-actions";

export async function confirmJobAndReleaseFunds(jobId: string) {
  const session = await requireAuth();
  const result = await approveJobByClient(session.user.id, jobId);
  if ("error" in result) {
    return result;
  }
  revalidatePath(`/portal/client/jobs/${jobId}`);
  revalidatePath(`/portal/jobs/${jobId}`);
  return result;
}
