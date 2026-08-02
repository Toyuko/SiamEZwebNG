import { NextRequest } from "next/server";
import { syncLinkedGoalsFromLifeEvent } from "@/data-access/goals";
import { transitionStepProgress } from "@/data-access/life-events";
import type { LifeEventStepStatus } from "@prisma/client";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";

type Params = {
  params: Promise<{ progressId: string; stepId: string }>;
};

const STEP_STATUSES: LifeEventStepStatus[] = [
  "pending",
  "started",
  "completed",
  "skipped",
];

/** PATCH /api/v1/life-events/runs/:progressId/steps/:stepId */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { progressId, stepId } = await params;
    const body = (await request.json().catch(() => null)) as {
      status?: LifeEventStepStatus;
    } | null;

    if (!body?.status || !STEP_STATUSES.includes(body.status)) {
      return apiBadRequest(
        "status must be pending|started|completed|skipped"
      );
    }

    const result = await transitionStepProgress(
      userId,
      progressId,
      stepId,
      body.status
    );
    if (!result) {
      return apiBadRequest("Unable to update step");
    }
    if (result.lifeEventId) {
      await syncLinkedGoalsFromLifeEvent(userId, result.lifeEventId).catch(
        () => undefined
      );
    }
    return apiOk(serializeJson(result));
  });
}
