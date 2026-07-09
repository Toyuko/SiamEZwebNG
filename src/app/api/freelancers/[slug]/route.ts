import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { getPublicFreelancerBySlug } from "@/data-access/freelancer";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug?.trim()) return fail("Not found", 404);

    const profile = await getPublicFreelancerBySlug(slug.trim().toLowerCase());
    if (!profile) return fail("Not found", 404);

    return ok({
      ...profile,
      createdAt: profile.createdAt.toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load freelancer";
    return fail(message, 500);
  }
}
