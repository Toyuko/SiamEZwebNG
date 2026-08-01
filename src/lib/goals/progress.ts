/**
 * Pure goal status / progress helpers.
 */

import type { GoalStatus, GoalTransition } from "./types";

const GOAL_TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  active: ["completed", "cancelled"],
  completed: ["active"],
  cancelled: ["active"],
};

export function canTransitionGoal(from: GoalStatus, to: GoalStatus): boolean {
  if (from === to) return false;
  return GOAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function decideGoalTransition(from: GoalStatus, to: GoalStatus): GoalTransition {
  if (from === to) return { ok: false, reason: "same_status" };
  if (!canTransitionGoal(from, to)) return { ok: false, reason: "invalid_transition" };
  return { ok: true, from, to };
}

export function clampProgressPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * When status becomes completed, progress snaps to 100.
 * When reopened to active, keep existing pct unless it was 100 (reset to 0).
 */
export function progressPctForStatus(
  to: GoalStatus,
  currentPct: number
): number {
  if (to === "completed") return 100;
  if (to === "cancelled") return clampProgressPct(currentPct);
  // active
  const clamped = clampProgressPct(currentPct);
  return clamped === 100 ? 0 : clamped;
}

export function goalTimestampPatch(
  to: GoalStatus,
  now: Date = new Date()
): { completedAt?: Date | null } {
  if (to === "completed") return { completedAt: now };
  return { completedAt: null };
}

/** Derive goal progress from life-event step completion percent. */
export function syncGoalPctFromLifeEvent(lifeEventPercent: number): number {
  return clampProgressPct(lifeEventPercent);
}
