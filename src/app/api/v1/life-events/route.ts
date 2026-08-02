import { NextRequest } from "next/server";
import { listActiveLifeEvents } from "@/data-access/life-events";
import {
  apiOk,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

/** GET /api/v1/life-events — active definitions (public catalog). */
export async function GET(request: NextRequest) {
  return withOptionalBearerUser(request, async () => {
    const events = await listActiveLifeEvents();
    return apiOk(serializeJson(events));
  });
}
