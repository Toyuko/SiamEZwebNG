import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiFreelancer } from "@/lib/auth/requireApiFreelancer";
import { ok, fail } from "@/lib/api-response";
import { assertFreelancerCanUpdateJobTracking } from "@/lib/jobs/tracking-access";
import { broadcastJobLocationUpdate } from "@/data-access/job-location";

const postBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.string().datetime().optional(),
  inTransit: z.boolean().optional(),
});

const putBodySchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timestamp: z.string().datetime().optional(),
});

async function assertFreelancerLocationAccess(userId: string, jobId: string) {
  try {
    await assertFreelancerCanUpdateJobTracking(userId, jobId);
  } catch {
    throw new Error("Forbidden");
  }
}

/** Live coordinate ping while in transit (sets isCurrentlyInTransit + Pusher broadcast). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const { id: jobId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid JSON body.", 400);
    }

    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
    }

    await assertFreelancerLocationAccess(userId, jobId);

    const inTransit = parsed.data.inTransit ?? true;
    const timestamp = parsed.data.timestamp ?? new Date().toISOString();

    await prisma.job.update({
      where: { id: jobId },
      data: { isCurrentlyInTransit: inTransit },
    });

    if (inTransit) {
      await broadcastJobLocationUpdate(jobId, {
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        timestamp,
      });
    }

    return ok({ ok: true, isCurrentlyInTransit: inTransit });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update location";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}

/** End live transit — clears isCurrentlyInTransit so the web map stops listening. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const { id: jobId } = await params;

    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      return fail("Invalid JSON body.", 400);
    }

    const parsed = putBodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
    }

    await assertFreelancerLocationAccess(userId, jobId);

    await prisma.job.update({
      where: { id: jobId },
      data: { isCurrentlyInTransit: false },
    });

    return ok({ ok: true, isCurrentlyInTransit: false as const });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to end live transit";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}
