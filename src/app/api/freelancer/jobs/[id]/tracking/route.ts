import { NextRequest } from "next/server";
import type { TrackingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiFreelancer } from "@/lib/auth/requireApiFreelancer";
import { ok, fail } from "@/lib/api-response";
import { getFreelancerJobTracking } from "@/data-access/job-tracking";
import { updateJobTrackingStatus } from "@/lib/jobs/tracking";

const TRACKING_STATUSES = new Set<string>([
  "DOCUMENTS_PENDING",
  "APPOINTMENT_SET",
  "DLT_EXAM_PREP",
  "LICENSE_ISSUED",
  "POR_ROR_BOR_PAID",
  "DLT_INSPECTION",
  "PLATES_ISSUED",
  "DELIVERED",
]);

type TrackingUpdateBody = {
  status?: string;
  notes?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function parseTrackingAttachment(
  body: TrackingUpdateBody
): { url: string; name: string } | null {
  const url =
    typeof body.attachmentUrl === "string" ? body.attachmentUrl.trim() : "";
  if (!url) return null;

  const name =
    typeof body.attachmentName === "string" && body.attachmentName.trim().length > 0
      ? body.attachmentName.trim()
      : "attachment";

  return { url, name };
}

function parseTrackingCoordinates(
  body: TrackingUpdateBody
): { latitude: number; longitude: number } | null {
  const { latitude, longitude } = body;
  if (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return { latitude, longitude };
  }
  return null;
}

async function handleTrackingUpdate(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  const { userId } = await requireApiFreelancer(request);
  const { id } = await params;

  let body: TrackingUpdateBody;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const status = body.status;
  if (!status || !TRACKING_STATUSES.has(status)) {
    return fail("A valid tracking status is required.", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const result = await updateJobTrackingStatus(
    userId,
    id,
    status as TrackingStatus,
    body.notes,
    user?.name,
    parseTrackingAttachment(body),
    parseTrackingCoordinates(body)
  );

  if ("error" in result) {
    return fail(result.error ?? "Failed to update tracking", 400);
  }

  return ok({
    ok: true,
    trackingStatus: result.trackingStatus,
    completionSubmittedAt: result.completionSubmittedAt,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const { id } = await params;
    const payload = await getFreelancerJobTracking(id, userId);

    if (!payload) {
      return fail("Forbidden", 403);
    }

    return ok(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load tracking";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    return await handleTrackingUpdate(request, context.params);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update tracking";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}

/** Alias for mobile clients that call PUT /api/freelancer/jobs/[id]/tracking */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return POST(request, context);
}
