import type { JobStatus } from "@prisma/client";
import { JOB_AUTO_APPROVE_MS } from "./constants";

const AWAITING_REVIEW_STATUSES: JobStatus[] = ["completed_awaiting_review", "completed"];

export function getAutoApprovalDeadline(completionSubmittedAt: Date): Date {
  return new Date(completionSubmittedAt.getTime() + JOB_AUTO_APPROVE_MS);
}

export function getAutoApprovalRemainingMs(completionSubmittedAt: Date): number {
  return Math.max(0, getAutoApprovalDeadline(completionSubmittedAt).getTime() - Date.now());
}

export function isAwaitingReviewStatus(status: JobStatus): boolean {
  return AWAITING_REVIEW_STATUSES.includes(status);
}

export function jobProgressPercent(status: JobStatus): number {
  switch (status) {
    case "open":
      return 10;
    case "in_progress":
      return 50;
    case "completed_awaiting_review":
    case "completed":
      return 90;
    case "approved":
      return 100;
    default:
      return 0;
  }
}
