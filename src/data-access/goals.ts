import { prisma } from "@/lib/db";
import type { GoalStatus, Prisma } from "@prisma/client";
import {
  clampProgressPct,
  decideGoalTransition,
  goalTimestampPatch,
  progressPctForStatus,
} from "@/lib/goals";

export async function listGoalsForUser(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    include: {
      lifeEvent: {
        select: { id: true, key: true, titleEn: true, titleTh: true },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function countActiveGoalsForUser(userId: string): Promise<number> {
  return prisma.goal.count({
    where: { userId, status: "active" },
  });
}

export type GoalCreateInput = {
  title: string;
  lifeEventId?: string | null;
  notes?: string | null;
  progressPct?: number;
};

export async function createGoal(userId: string, data: GoalCreateInput) {
  const title = data.title.trim();
  if (!title) throw new Error("Goal title is required");
  return prisma.goal.create({
    data: {
      userId,
      title,
      lifeEventId: data.lifeEventId || null,
      notes: data.notes?.trim() || null,
      progressPct: clampProgressPct(data.progressPct ?? 0),
      status: "active",
    },
    include: {
      lifeEvent: {
        select: { id: true, key: true, titleEn: true, titleTh: true },
      },
    },
  });
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: {
    title?: string;
    notes?: string | null;
    progressPct?: number;
    lifeEventId?: string | null;
  }
) {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new Error("Goal not found");

  const patch: Prisma.GoalUpdateInput = {};
  if (data.title !== undefined) {
    const title = data.title.trim();
    if (!title) throw new Error("Goal title is required");
    patch.title = title;
  }
  if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
  if (data.progressPct !== undefined) {
    patch.progressPct = clampProgressPct(data.progressPct);
  }
  if (data.lifeEventId !== undefined) {
    patch.lifeEvent = data.lifeEventId
      ? { connect: { id: data.lifeEventId } }
      : { disconnect: true };
  }

  return prisma.goal.update({
    where: { id: goalId },
    data: patch,
    include: {
      lifeEvent: {
        select: { id: true, key: true, titleEn: true, titleTh: true },
      },
    },
  });
}

export async function transitionGoal(
  userId: string,
  goalId: string,
  to: GoalStatus,
  now: Date = new Date()
) {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new Error("Goal not found");

  const decision = decideGoalTransition(existing.status, to);
  if (!decision.ok) {
    throw new Error(`Cannot transition goal from ${existing.status} to ${to}`);
  }

  const ts = goalTimestampPatch(to, now);
  return prisma.goal.update({
    where: { id: goalId },
    data: {
      status: to,
      progressPct: progressPctForStatus(to, existing.progressPct),
      ...(ts.completedAt !== undefined ? { completedAt: ts.completedAt } : {}),
    },
    include: {
      lifeEvent: {
        select: { id: true, key: true, titleEn: true, titleTh: true },
      },
    },
  });
}

export async function deleteGoal(userId: string, goalId: string) {
  const existing = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!existing) throw new Error("Goal not found");
  return prisma.goal.delete({ where: { id: goalId } });
}
