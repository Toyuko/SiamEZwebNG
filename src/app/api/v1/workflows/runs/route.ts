import { NextRequest } from "next/server";
import {
  listUserRuns,
  startWorkflowRun,
} from "@/data-access/workflows";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";

/** GET /api/v1/workflows/runs */
export async function GET(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const runs = await listUserRuns(userId);
    return apiOk(serializeJson(runs));
  });
}

/** POST /api/v1/workflows/runs — body: { templateId } */
export async function POST(request: NextRequest) {
  return withBearerUser(request, async (userId) => {
    const body = (await request.json().catch(() => null)) as {
      templateId?: string;
    } | null;
    const templateId =
      typeof body?.templateId === "string" ? body.templateId.trim() : "";
    if (!templateId) return apiBadRequest("templateId is required");
    const run = await startWorkflowRun(userId, templateId);
    return apiOk(serializeJson(run), 201);
  });
}
