import { NextRequest } from "next/server";
import { DEFAULT_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import {
  apiOk,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

/** GET /api/v1/feature-flags — public resolved flags for clients. */
export async function GET(request: NextRequest) {
  return withOptionalBearerUser(request, async () => {
    const keys = Object.keys(DEFAULT_FLAGS);
    const entries = await Promise.all(
      keys.map(async (key) => [key, await isFeatureEnabled(key)] as const)
    );
    return apiOk(serializeJson(Object.fromEntries(entries)));
  });
}
