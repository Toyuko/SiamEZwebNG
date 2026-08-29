import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { resolveApiUserId } from "@/lib/auth/resolveApiUserId";
import { createJobReview } from "@/lib/jobs/reviews";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = await resolveApiUserId(request);
    if (!clientId) {
      return fail("Unauthorized", 401);
    }

    const { id } = await params;
    const body = (await request.json()) as {
      rating?: unknown;
      comment?: unknown;
    };

    const rating =
      typeof body.rating === "number"
        ? body.rating
        : typeof body.rating === "string"
          ? Number.parseInt(body.rating, 10)
          : NaN;

    const result = await createJobReview({
      clientId,
      jobId: id,
      rating,
      comment: typeof body.comment === "string" ? body.comment : null,
    });

    if ("error" in result) {
      const status =
        result.error === "Job not found."
          ? 403
          : result.error === "A review already exists for this job."
            ? 409
            : 400;
      return fail(result.error ?? "Failed to submit review", status);
    }

    return ok({
      review: {
        id: result.review.id,
        rating: result.review.rating,
        comment: result.review.comment,
        createdAt: result.review.createdAt.toISOString(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit review";
    return fail(message, 500);
  }
}
