import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ok, fail } from "@/lib/api-response";
import { approveJobByClient } from "@/lib/jobs/client-actions";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail("Unauthorized", 401);
    }

    const { id } = await params;
    const result = await approveJobByClient(session.user.id, id);

    if ("error" in result) {
      const status = result.error === "Job not found." ? 403 : 400;
      return fail(result.error ?? "Failed to approve job", status);
    }

    return ok({ ok: true, approvedAt: result.approvedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to approve job";
    return fail(message, 500);
  }
}
