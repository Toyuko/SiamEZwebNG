import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { CaseStatus } from "@prisma/client";
import { requireApiStaff } from "@/lib/auth/requireApiStaff";
import { assertCaseStatusTransition } from "@/lib/domain/case-status";

const VALID_STATUSES: CaseStatus[] = [
  "new",
  "under_review",
  "quoted",
  "awaiting_payment",
  "paid",
  "in_progress",
  "pending_docs",
  "completed",
  "cancelled",
];

/**
 * PATCH /api/cases/[id]/status
 * Staff/admin only. Enforces allowed status transitions.
 * Body: { status: CaseStatus }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiStaff(request);
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.case.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    try {
      assertCaseStatusTransition(existing.status, status);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid status transition" },
        { status: 400 }
      );
    }

    const c = await prisma.case.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, case: c });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update case status";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    if (status === 500) {
      console.error("PATCH /api/cases/[id]/status error", e);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
