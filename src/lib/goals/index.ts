export type { GoalStatus, GoalTransition } from "./types";

export {
  canTransitionGoal,
  clampProgressPct,
  decideGoalTransition,
  goalTimestampPatch,
  progressPctForStatus,
  syncGoalPctFromLifeEvent,
} from "./progress";
