import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { resolveApiUserId } from "@/lib/auth/resolveApiUserId";
import {
  ensureFreelancerProfile,
  getFreelancerProfileByUserId,
  isFreelancerSlugAvailable,
  serializeOwnerProfile,
  upsertFreelancerPublicProfile,
} from "@/data-access/freelancer";
import {
  freelancerProfileUpdateSchema,
  RESERVED_FREELANCER_SLUGS,
} from "@/lib/freelancer-profile";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) return fail("Unauthorized", 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true, name: true, email: true, image: true },
    });
    if (!user?.active) return fail("Unauthorized", 401);

    let profile = await getFreelancerProfileByUserId(userId);
    if (!profile && (user.role === "freelancer" || user.role === "customer")) {
      await ensureFreelancerProfile(userId);
      profile = await getFreelancerProfileByUserId(userId);
    }

    return ok({
      profile: profile ? serializeOwnerProfile(profile) : null,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load freelancer profile";
    return fail(message, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) return fail("Unauthorized", 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });
    if (!user?.active) return fail("Unauthorized", 401);
    if (user.role !== "freelancer" && user.role !== "customer") {
      return fail("Forbidden", 403);
    }

    const body = await request.json();
    const parsed = freelancerProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid profile data", 400);
    }

    const data = parsed.data;
    if (RESERVED_FREELANCER_SLUGS.has(data.slug)) {
      return fail("This username is reserved. Please choose another.", 400);
    }

    if (data.isPublic && !data.slug) {
      return fail("A public URL slug is required to list your profile.", 400);
    }

    const available = await isFreelancerSlugAvailable(data.slug, userId);
    if (!available) {
      return fail("That username is already taken.", 409);
    }

    const profile = await upsertFreelancerPublicProfile(userId, data);
    return ok({ profile: serializeOwnerProfile(profile) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save freelancer profile";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}
