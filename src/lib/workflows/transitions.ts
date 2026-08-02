/**
 * Pure transition helpers for workflow runs / steps.
 * Approval gates and advance rules are deterministic (no AI).
 */

import type {
  RunTransitionResult,
  StepTransitionResult,
  WorkflowRunStatus,
  WorkflowRunSummary,
  WorkflowStepRunStatus,
} from "./types";

const STEP_TRANSITIONS: Record<WorkflowStepRunStatus, WorkflowStepRunStatus[]> = {
  pending: ["in_progress", "skipped"],
  in_progress: ["awaiting_approval", "completed", "skipped", "pending"],
  awaiting_approval: ["approved", "rejected"],
  approved: ["completed"],
  rejected: ["pending", "in_progress"],
  completed: ["pending"],
  skipped: ["pending", "in_progress"],
};

const RUN_TRANSITIONS: Record<WorkflowRunStatus, WorkflowRunStatus[]> = {
  active: ["completed", "cancelled", "rejected"],
  completed: ["active"],
  cancelled: ["active"],
  rejected: ["active"],
};

export function canTransitionStep(
  from: WorkflowStepRunStatus,
  to: WorkflowStepRunStatus
): boolean {
  if (from === to) return false;
  return STEP_TRANSITIONS[from]?.includes(to) ?? false;
}

export function decideStepTransition(
  from: WorkflowStepRunStatus,
  to: WorkflowStepRunStatus
): StepTransitionResult {
  if (from === to) return { ok: false, reason: "same_status" };
  if (!canTransitionStep(from, to)) return { ok: false, reason: "invalid_transition" };
  return { ok: true, from, to };
}

/**
 * Customer/staff advance: move the active step forward one gate.
 * - pending → in_progress
 * - in_progress + requiresApproval → awaiting_approval
 * - in_progress + !requiresApproval → completed
 * - approved → completed
 */
export function decideAdvanceStep(input: {
  current: WorkflowStepRunStatus;
  requiresApproval: boolean;
  runStatus: WorkflowRunStatus;
}): StepTransitionResult {
  if (input.runStatus !== "active") {
    return { ok: false, reason: "run_not_active" };
  }
  const { current, requiresApproval } = input;

  if (current === "pending" || current === "rejected") {
    return decideStepTransition(current, "in_progress");
  }
  if (current === "in_progress") {
    if (requiresApproval) {
      return decideStepTransition(current, "awaiting_approval");
    }
    return decideStepTransition(current, "completed");
  }
  if (current === "approved") {
    return decideStepTransition(current, "completed");
  }
  if (current === "awaiting_approval") {
    return { ok: false, reason: "requires_approval" };
  }
  return { ok: false, reason: "invalid_transition" };
}

export function decideStaffApprove(input: {
  current: WorkflowStepRunStatus;
  runStatus: WorkflowRunStatus;
}): StepTransitionResult {
  if (input.runStatus !== "active") {
    return { ok: false, reason: "run_not_active" };
  }
  if (input.current !== "awaiting_approval") {
    return { ok: false, reason: "not_awaiting_approval" };
  }
  return decideStepTransition(input.current, "approved");
}

export function decideStaffReject(input: {
  current: WorkflowStepRunStatus;
  runStatus: WorkflowRunStatus;
}): StepTransitionResult {
  if (input.runStatus !== "active") {
    return { ok: false, reason: "run_not_active" };
  }
  if (input.current !== "awaiting_approval") {
    return { ok: false, reason: "not_awaiting_approval" };
  }
  return decideStepTransition(input.current, "rejected");
}

export function stepTimestampPatch(
  to: WorkflowStepRunStatus,
  now: Date = new Date()
): {
  startedAt?: Date | null;
  completedAt?: Date | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
} {
  switch (to) {
    case "pending":
      return {
        startedAt: null,
        completedAt: null,
        approvedAt: null,
        rejectedAt: null,
      };
    case "in_progress":
      return { startedAt: now, completedAt: null, rejectedAt: null };
    case "awaiting_approval":
      return { startedAt: now };
    case "approved":
      return { approvedAt: now, rejectedAt: null };
    case "rejected":
      return { rejectedAt: now, approvedAt: null };
    case "completed":
      return { startedAt: now, completedAt: now };
    case "skipped":
      return { completedAt: now };
    default:
      return {};
  }
}

export function canTransitionRun(
  from: WorkflowRunStatus,
  to: WorkflowRunStatus
): boolean {
  if (from === to) return false;
  return RUN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function decideRunTransition(
  from: WorkflowRunStatus,
  to: WorkflowRunStatus
): RunTransitionResult {
  if (from === to) return { ok: false, reason: "same_status" };
  if (!canTransitionRun(from, to)) return { ok: false, reason: "invalid_transition" };
  return { ok: true, from, to };
}

export function runTimestampPatch(
  to: WorkflowRunStatus,
  now: Date = new Date()
): { completedAt?: Date | null } {
  if (to === "completed") return { completedAt: now };
  if (to === "active" || to === "cancelled" || to === "rejected") {
    return { completedAt: null };
  }
  return {};
}

export function summarizeStepStatuses(
  statuses: WorkflowStepRunStatus[]
): WorkflowRunSummary {
  const total = statuses.length;
  let completed = 0;
  let awaitingApproval = 0;
  let rejected = 0;
  let inProgress = 0;
  let pending = 0;
  let skipped = 0;
  let approved = 0;

  for (const s of statuses) {
    if (s === "completed") completed += 1;
    else if (s === "awaiting_approval") awaitingApproval += 1;
    else if (s === "rejected") rejected += 1;
    else if (s === "in_progress") inProgress += 1;
    else if (s === "pending") pending += 1;
    else if (s === "skipped") skipped += 1;
    else if (s === "approved") approved += 1;
  }

  const doneLike = completed + skipped;
  const percent = total === 0 ? 0 : Math.round((doneLike / total) * 100);
  return {
    total,
    completed,
    awaitingApproval,
    rejected,
    inProgress: inProgress + approved,
    pending,
    percent,
    allDone: total > 0 && doneLike === total,
  };
}

export function suggestRunStatusAfterSteps(
  current: WorkflowRunStatus,
  summary: WorkflowRunSummary
): WorkflowRunStatus {
  if (current === "cancelled" || current === "rejected") return current;
  if (summary.allDone) return "completed";
  return "active";
}

/** Find the first non-terminal step index (sorted by sortOrder externally). */
export function findActiveStepIndex(statuses: WorkflowStepRunStatus[]): number {
  const terminal: WorkflowStepRunStatus[] = ["completed", "skipped"];
  const idx = statuses.findIndex((s) => !terminal.includes(s));
  return idx;
}
