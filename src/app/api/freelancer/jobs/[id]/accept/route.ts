import { NextRequest } from "next/server";
import { requireApiFreelancer } from "@/lib/auth/requireApiFreelancer";
import { ok, fail } from "@/lib/api-response";
import { acceptJobForFreelancer } from "@/lib/jobs/freelancer-actions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const { id } = await params;
    const result = await acceptJobForFreelancer(userId, id);
    if ("error" in result) {
      return fail(result.error ?? "Failed to accept job", 400);
    }
    return ok({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to accept job";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}
