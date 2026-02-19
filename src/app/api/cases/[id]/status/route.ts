import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { CaseStatus } from "@prisma/client";

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
 * Update case status.
 * Body: { status: CaseStatus }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const c = await prisma.case.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, case: c });
  } catch (e) {
    console.error("PATCH /api/cases/[id]/status error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update case status" },
      { status: 500 }
    );
  }
}
