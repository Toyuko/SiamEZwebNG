import { NextRequest } from "next/server";
import { requireApiFreelancer } from "@/lib/auth/requireApiFreelancer";
import { ok, fail } from "@/lib/api-response";
import { getJobById } from "@/data-access/job";
import { serializeFreelancerJob } from "@/lib/jobs/serialize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const { id } = await params;
    const job = await getJobById(id);

    if (!job) {
      return fail("Job not found.", 404);
    }

    const isAssignedFreelancer = job.freelancerId === userId;
    const isOpen = job.status === "open";
    if (!isOpen && !isAssignedFreelancer) {
      return fail("Job not found.", 404);
    }

    return ok(serializeFreelancerJob(job));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load job";
    const status =
      message === "Unauthorized" || message === "Forbidden"
        ? 401
        : message === "Job not found."
          ? 404
          : 500;
    return fail(message, status);
  }
}
