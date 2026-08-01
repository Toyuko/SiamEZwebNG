/**
 * Pure progress transition helpers for life event runs / steps.
 * Timestamps are applied by callers; this module decides legal transitions.
 */

import type {
  LifeEventRunStatus,
  LifeEventStepStatus,
  RunProgressSummary,
  StepTransition,
} from "./types";

const STEP_TRANSITIONS: Record<LifeEventStepStatus, LifeEventStepStatus[]> = {
  pending: ["started", "completed", "skipped"],
  started: ["completed", "skipped", "pending"],
  completed: ["started", "pending"],
  skipped: ["pending", "started", "completed"],
};

const RUN_TRANSITIONS: Record<LifeEventRunStatus, LifeEventRunStatus[]> = {
  active: ["completed", "abandoned"],
  completed: ["active"],
  abandoned: ["active"],
};

export function canTransitionStep(
  from: LifeEventStepStatus,
  to: LifeEventStepStatus
): boolean {
  if (from === to) return false;
  return STEP_TRANSITIONS[from]?.includes(to) ?? false;
}

export function decideStepTransition(
  from: LifeEventStepStatus,
  to: LifeEventStepStatus
): StepTransition {
  if (from === to) {
    return { ok: false, reason: "same_status" };
  }
  if (!canTransitionStep(from, to)) {
    return { ok: false, reason: "invalid_transition" };
  }
  return { ok: true, from, to };
}

/**
 * Derive timestamp patches for a step status change.
 * `now` is injected for testability.
 */
export function stepTimestampPatch(
  to: LifeEventStepStatus,
  now: Date = new Date()
): { startedAt?: Date | null; completedAt?: Date | null } {
  switch (to) {
    case "pending":
      return { startedAt: null, completedAt: null };
    case "started":
      return { startedAt: now, completedAt: null };
    case "completed":
      return { startedAt: now, completedAt: now };
    case "skipped":
      return { completedAt: now };
    default:
      return {};
  }
}

export function canTransitionRun(
  from: LifeEventRunStatus,
  to: LifeEventRunStatus
): boolean {
  if (from === to) return false;
  return RUN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function decideRunTransition(
  from: LifeEventRunStatus,
  to: LifeEventRunStatus
):
  | { ok: true; from: LifeEventRunStatus; to: LifeEventRunStatus }
  | { ok: false; reason: "invalid_transition" | "same_status" } {
  if (from === to) return { ok: false, reason: "same_status" };
  if (!canTransitionRun(from, to)) return { ok: false, reason: "invalid_transition" };
  return { ok: true, from, to };
}

export function runTimestampPatch(
  to: LifeEventRunStatus,
  now: Date = new Date()
): { completedAt?: Date | null } {
  if (to === "completed") return { completedAt: now };
  if (to === "active" || to === "abandoned") return { completedAt: null };
  return {};
}

export function summarizeStepStatuses(
  statuses: LifeEventStepStatus[]
): RunProgressSummary {
  const total = statuses.length;
  let completed = 0;
  let started = 0;
  let pending = 0;
  let skipped = 0;
  for (const s of statuses) {
    if (s === "completed") completed += 1;
    else if (s === "started") started += 1;
    else if (s === "skipped") skipped += 1;
    else pending += 1;
  }
  const doneLike = completed + skipped;
  const percent = total === 0 ? 0 : Math.round((doneLike / total) * 100);
  return {
    total,
    completed,
    started,
    pending,
    skipped,
    percent,
    allDone: total > 0 && doneLike === total,
  };
}

/** Suggest run status after step statuses change. */
export function suggestRunStatusAfterSteps(
  current: LifeEventRunStatus,
  summary: RunProgressSummary
): LifeEventRunStatus {
  if (current === "abandoned") return current;
  if (summary.allDone) return "completed";
  return "active";
}
