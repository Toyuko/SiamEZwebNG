import { NextRequest } from "next/server";
import { syncLinkedGoalsFromLifeEvent } from "@/data-access/goals";
import {
  getUserLifeEventProgress,
  setRunStatus,
} from "@/data-access/life-events";
import type { LifeEventRunStatus } from "@prisma/client";
import {
  apiBadRequest,
  apiNotFound,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";

type Params = { params: Promise<{ progressId: string }> };

const RUN_STATUSES: LifeEventRunStatus[] = [
  "active",
  "completed",
  "abandoned",
];

/** GET /api/v1/life-events/runs/:progressId */
export async function GET(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { progressId } = await params;
    const run = await getUserLifeEventProgress(userId, progressId);
    if (!run) return apiNotFound("Life event run not found");
    return apiOk(serializeJson(run));
  });
}

/** PATCH /api/v1/life-events/runs/:progressId — update run status. */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { progressId } = await params;
    const body = (await request.json().catch(() => null)) as {
      status?: LifeEventRunStatus;
    } | null;

    if (!body?.status || !RUN_STATUSES.includes(body.status)) {
      return apiBadRequest("status must be active|completed|abandoned");
    }

    const result = await setRunStatus(userId, progressId, body.status);
    if (result.lifeEventId) {
      await syncLinkedGoalsFromLifeEvent(userId, result.lifeEventId).catch(
        () => undefined
      );
    }
    return apiOk(serializeJson(result));
  });
}
