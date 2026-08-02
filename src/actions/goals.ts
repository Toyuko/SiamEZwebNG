"use server";

import { revalidatePath } from "next/cache";
import type { GoalStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import * as goalsDA from "@/data-access/goals";

export async function listMyGoals() {
  const session = await requireAuth();
  return goalsDA.listGoalsForUser(session.user.id);
}

export async function createMyGoal(formData: FormData) {
  const session = await requireAuth();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const lifeEventId = String(formData.get("lifeEventId") ?? "").trim() || null;
  const workflowTemplateId =
    String(formData.get("workflowTemplateId") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const goal = await goalsDA.createGoal(session.user.id, {
    title,
    lifeEventId,
    workflowTemplateId,
    notes,
  });
  revalidatePath("/portal/goals");
  return goal;
}

export async function updateMyGoalStatus(goalId: string, status: GoalStatus) {
  const session = await requireAuth();
  const goal = await goalsDA.transitionGoal(session.user.id, goalId, status);
  revalidatePath("/portal/goals");
  return goal;
}

export async function updateMyGoalProgress(goalId: string, progressPct: number) {
  const session = await requireAuth();
  const goal = await goalsDA.updateGoal(session.user.id, goalId, { progressPct });
  revalidatePath("/portal/goals");
  return goal;
}

export async function deleteMyGoal(goalId: string) {
  const session = await requireAuth();
  await goalsDA.deleteGoal(session.user.id, goalId);
  revalidatePath("/portal/goals");
}
