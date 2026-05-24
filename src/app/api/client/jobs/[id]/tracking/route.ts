import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail } from "@/lib/api-response";
import { getClientJobTracking } from "@/data-access/job-tracking";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail("Unauthorized", 401);
    }

    const { id } = await params;
    const payload = await getClientJobTracking(id, session.user.id);

    if (!payload) {
      return fail("Forbidden", 403);
    }

    return ok(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load tracking";
    return fail(message, 500);
  }
}
