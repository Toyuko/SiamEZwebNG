import { NextRequest } from "next/server";
import {
  createSavedSearch,
  listSavedSearches,
} from "@/data-access/saved-searches";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";
import { buildUserOwner } from "@/lib/marketplace-engagement";

/** GET /api/v1/saved-searches */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const rows = await listSavedSearches(buildUserOwner(userId));
    return apiOk(serializeJson(rows));
  });
}

/** POST /api/v1/saved-searches */
export async function POST(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      listingType?: string;
      query?: Record<string, string>;
    } | null;

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const listingType =
      body?.listingType === "vehicle" || body?.listingType === "property"
        ? body.listingType
        : null;
    const query =
      body?.query && typeof body.query === "object" && !Array.isArray(body.query)
        ? Object.fromEntries(
            Object.entries(body.query)
              .filter(([, v]) => typeof v === "string")
              .map(([k, v]) => [k, String(v).slice(0, 200)])
          )
        : null;

    if (!name || !listingType || !query) {
      return apiBadRequest("name, listingType, and query are required");
    }

    try {
      const saved = await createSavedSearch(buildUserOwner(userId), {
        name,
        listingType,
        query,
      });
      return apiOk(serializeJson(saved), 201);
    } catch (error) {
      if (error instanceof Error && error.message === "Saved search limit reached") {
        return apiBadRequest("Saved search limit reached");
      }
      throw error;
    }
  });
}
