import { NextRequest } from "next/server";
import { cancelRun, getRunById } from "@/data-access/workflows";
import {
  apiBadRequest,
  apiNotFound,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";

type Params = { params: Promise<{ runId: string }> };

/** GET /api/v1/workflows/runs/:runId */
export async function GET(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { runId } = await params;
    const run = await getRunById(runId);
    if (!run || run.userId !== userId) return apiNotFound("Workflow run not found");
    return apiOk(serializeJson(run));
  });
}

/** DELETE /api/v1/workflows/runs/:runId — cancel */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { runId } = await params;
    if (!runId?.trim()) return apiBadRequest("runId is required");
    const run = await cancelRun(runId.trim(), userId);
    return apiOk(serializeJson(run));
  });
}
