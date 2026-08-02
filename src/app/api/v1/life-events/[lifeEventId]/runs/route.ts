import { NextRequest } from "next/server";
import { syncLinkedGoalsFromLifeEvent } from "@/data-access/goals";
import { startLifeEventForUser } from "@/data-access/life-events";
import { apiOk, serializeJson, withBearerUser } from "@/lib/api/v1/helpers";

type Params = { params: Promise<{ lifeEventId: string }> };

/** POST /api/v1/life-events/:lifeEventId/runs — start or resume. */
export async function POST(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { lifeEventId } = await params;
    const run = await startLifeEventForUser(userId, lifeEventId);
    await syncLinkedGoalsFromLifeEvent(userId, lifeEventId).catch(() => undefined);
    return apiOk(serializeJson(run), 201);
  });
}
