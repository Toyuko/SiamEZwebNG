import { NextRequest } from "next/server";
import { advanceStepRun } from "@/data-access/workflows";
import {
  apiBadRequest,
  apiOk,
  serializeJson,
  withBearerUser,
} from "@/lib/api/v1/helpers";

type Params = { params: Promise<{ stepRunId: string }> };

/** POST /api/v1/workflows/steps/:stepRunId/advance */
export async function POST(request: NextRequest, { params }: Params) {
  return withBearerUser(request, async (userId) => {
    const { stepRunId } = await params;
    if (!stepRunId?.trim()) return apiBadRequest("stepRunId is required");
    const result = await advanceStepRun(stepRunId.trim(), userId);
    return apiOk(serializeJson(result));
  });
}
