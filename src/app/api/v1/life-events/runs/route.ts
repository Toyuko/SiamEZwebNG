import { NextRequest } from "next/server";
import { listUserLifeEventProgress } from "@/data-access/life-events";
import { apiOk, serializeJson, withBearerUser } from "@/lib/api/v1/helpers";

/** GET /api/v1/life-events/runs — current user's progress. */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const runs = await listUserLifeEventProgress(userId);
    return apiOk(serializeJson(runs));
  });
}
