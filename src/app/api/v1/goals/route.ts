import { NextRequest } from "next/server";
import { createGoal, listGoalsForUser } from "@/data-access/goals";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";

/** GET /api/v1/goals */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const goals = await listGoalsForUser(userId);
    return apiOk(serializeJson(goals));
  });
}

/** POST /api/v1/goals */
export async function POST(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const body = (await request.json().catch(() => null)) as {
      title?: string;
      lifeEventId?: string | null;
      workflowTemplateId?: string | null;
      notes?: string | null;
      progressPct?: number;
    } | null;

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) return apiBadRequest("title is required");

    const goal = await createGoal(userId, {
      title,
      lifeEventId: body?.lifeEventId ?? null,
      workflowTemplateId: body?.workflowTemplateId ?? null,
      notes: body?.notes ?? null,
      progressPct: body?.progressPct,
    });
    return apiOk(serializeJson(goal), 201);
  });
}
