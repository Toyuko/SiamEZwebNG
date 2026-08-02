import { NextRequest } from "next/server";
import { listActiveTemplates } from "@/data-access/workflows";
import {
  apiOk,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

/** GET /api/v1/workflow-templates */
export async function GET(request: NextRequest) {
  return withOptionalBearerUser(request, async () => {
    const templates = await listActiveTemplates();
    return apiOk(serializeJson(templates));
  });
}
