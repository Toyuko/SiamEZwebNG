import { NextRequest } from "next/server";
import {
  deleteGoal,
  transitionGoal,
  updateGoal,
} from "@/data-access/goals";
import type { GoalStatus } from "@prisma/client";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";

type Params = { params: Promise<{ goalId: string }> };

const GOAL_STATUSES: GoalStatus[] = ["active", "completed", "cancelled"];

/** PATCH /api/v1/goals/:goalId */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { goalId } = await params;
    const body = (await request.json().catch(() => null)) as {
      title?: string;
      notes?: string | null;
      progressPct?: number;
      lifeEventId?: string | null;
      workflowTemplateId?: string | null;
      status?: GoalStatus;
    } | null;

    if (!body) return apiBadRequest("JSON body required");

    if (body.status !== undefined) {
      if (!GOAL_STATUSES.includes(body.status)) {
        return apiBadRequest("status must be active|completed|cancelled");
      }
      const goal = await transitionGoal(userId, goalId, body.status);
      return apiOk(serializeJson(goal));
    }

    const goal = await updateGoal(userId, goalId, {
      title: body.title,
      notes: body.notes,
      progressPct: body.progressPct,
      lifeEventId: body.lifeEventId,
      workflowTemplateId: body.workflowTemplateId,
    });
    return apiOk(serializeJson(goal));
  });
}

/** DELETE /api/v1/goals/:goalId */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { goalId } = await params;
    await deleteGoal(userId, goalId);
    return apiOk({ deleted: true, goalId });
  });
}
