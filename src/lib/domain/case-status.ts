import type { CaseStatus } from "@prisma/client";

/**
 * Allowed staff-driven case status transitions.
 * Payment systems may set `paid` via webhook (bypasses this graph).
 */
export const CASE_STATUS_TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  new: ["under_review", "awaiting_payment", "cancelled"],
  under_review: ["quoted", "awaiting_payment", "cancelled", "pending_docs"],
  quoted: ["awaiting_payment", "under_review", "cancelled"],
  awaiting_payment: ["paid", "cancelled", "under_review"],
  paid: ["in_progress", "pending_docs", "cancelled"],
  in_progress: ["pending_docs", "completed", "cancelled"],
  pending_docs: ["in_progress", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionCaseStatus(from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return true;
  return CASE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCaseStatusTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransitionCaseStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}
