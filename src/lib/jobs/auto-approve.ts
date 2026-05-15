import type { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { JOB_AUTO_APPROVE_MS } from "./constants";

/** Approve completed jobs whose completion was submitted more than 60 minutes ago. */
export async function autoApproveStaleCompletedJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - JOB_AUTO_APPROVE_MS);

  const result = await prisma.job.updateMany({
    where: {
      status: "completed",
      completionSubmittedAt: { lte: cutoff },
    },
    data: {
      status: "approved",
    },
  });

  return result.count;
}

export function getAutoApprovalDeadline(completionSubmittedAt: Date): Date {
  return new Date(completionSubmittedAt.getTime() + JOB_AUTO_APPROVE_MS);
}

export function getAutoApprovalRemainingMs(completionSubmittedAt: Date): number {
  return Math.max(0, getAutoApprovalDeadline(completionSubmittedAt).getTime() - Date.now());
}

export function jobProgressPercent(status: JobStatus): number {
  switch (status) {
    case "open":
      return 10;
    case "in_progress":
      return 50;
    case "completed":
      return 90;
    case "approved":
      return 100;
    default:
      return 0;
  }
}
