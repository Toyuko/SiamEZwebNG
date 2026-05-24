import { NextRequest } from "next/server";
import type { TrackingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiFreelancer } from "@/lib/auth/requireApiFreelancer";
import { ok, fail } from "@/lib/api-response";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireApiFreelancer(request);
    const { id } = await params;

    let body: {
      status?: string;
      notes?: string | null;
      attachmentUrl?: string | null;
      attachmentName?: string | null;
    };
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

    const attachment =
      body.attachmentUrl && body.attachmentName
        ? { url: body.attachmentUrl, name: body.attachmentName }
        : null;

    const result = await updateJobTrackingStatus(
      userId,
      id,
      status as TrackingStatus,
      body.notes,
      user?.name,
      attachment
    );

    if ("error" in result) {
      return fail(result.error ?? "Failed to update tracking", 400);
    }

    return ok({
      ok: true,
      trackingStatus: result.trackingStatus,
      completionSubmittedAt: result.completionSubmittedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update tracking";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 500;
    return fail(message, status);
  }
}
