import { NextRequest } from "next/server";
import { requireApiFreelancer } from "@/lib/auth/requireApiFreelancer";
import { ok, fail } from "@/lib/api-response";
import { getOpenJobsForFeed } from "@/data-access/job";
import { serializeJobBoardFeedItem } from "@/lib/jobs/job-board-payload";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const jobs = await getOpenJobsForFeed(userId);
    return ok({ jobs: jobs.map(serializeJobBoardFeedItem) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load jobs";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}
