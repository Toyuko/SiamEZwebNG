import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { ok, fail } from "@/lib/api-response";
import { getJobLocationTracking } from "@/data-access/job-location";
import { assertJobLocationViewer } from "@/lib/jobs/tracking-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return fail("Unauthorized", 401);
    }

    const { id } = await params;

    try {
      await assertJobLocationViewer(
        session.user.id,
        session.user.role,
        id
      );
    } catch {
      return fail("Forbidden", 403);
    }

    const payload = await getJobLocationTracking(id);
    if (!payload) {
      return fail("Not found", 404);
    }

    return ok(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load location";
    return fail(message, 500);
  }
}
