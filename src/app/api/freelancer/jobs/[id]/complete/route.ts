import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiFreelancer } from "@/lib/auth/requireApiFreelancer";
import { ok, fail } from "@/lib/api-response";
import { markJobCompleteForFreelancer } from "@/lib/jobs/freelancer-actions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const result = await markJobCompleteForFreelancer(userId, id, user?.name);
    if ("error" in result) {
      return fail(result.error ?? "Failed to complete job", 400);
    }
    return ok({
      ok: true,
      completionSubmittedAt: result.completionSubmittedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to complete job";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}
