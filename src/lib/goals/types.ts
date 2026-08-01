export type GoalStatus = "active" | "completed" | "cancelled";

export type GoalTransition =
  | { ok: true; from: GoalStatus; to: GoalStatus }
  | { ok: false; reason: "invalid_transition" | "same_status" };
