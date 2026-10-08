import { NextResponse } from "next/server";
import { listPublicIntakeOptions } from "@/data-access/job-intake";
import { getJobIntakeMemory } from "@/data-access/job-intake-memory";
import { formatJobIntakeMemoryBrief, isJobIntakeMemoryToken, jobIntakeMemoryPath, originFromHeaders } from "@/lib/jobs/intake-memory";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const limit = checkRateLimit(clientKeyFromRequest(request, "job-intake-memory-read"), 60, 10 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);

  const { token } = await context.params;
  if (!isJobIntakeMemoryToken(token)) {
    return NextResponse.json({ error: "Saved link not found." }, { status: 404 });
  }

  const saved = await getJobIntakeMemory(token);
  if (!saved) return NextResponse.json({ error: "Saved link not found." }, { status: 404 });

  const { services, staff } = await listPublicIntakeOptions();
  const url = `${originFromHeaders(request.headers)}${jobIntakeMemoryPath(saved.token)}`;
  const body = {
    kind: "siamez-job-intake-memory",
    url,
    updatedAt: saved.updatedAt.toISOString(),
    caseId: saved.caseId,
    memory: saved.memory,
    details: saved.details,
    brief: formatJobIntakeMemoryBrief({
      url,
      updatedAt: saved.updatedAt,
      caseId: saved.caseId,
      memory: saved.memory,
      details: saved.details,
      services,
      staff,
    }),
  };

  const wantsText = new URL(request.url).searchParams.get("format") === "text";
  if (wantsText) {
    return new Response(body.brief, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}
