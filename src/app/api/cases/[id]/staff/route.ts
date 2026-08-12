import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiStaff } from "@/lib/auth/requireApiStaff";

/**
 * POST /api/cases/[id]/staff
 * Staff/admin only. Assign staff to a case.
 * Body: { userId: string, role?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiStaff(request);
    const { id: caseId } = await params;
    const body = await request.json();
    const { userId, role = "support" } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const assignee = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true },
    });
    if (!assignee || !assignee.active) {
      return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
    }
    if (assignee.role !== "admin" && assignee.role !== "staff") {
      return NextResponse.json(
        { error: "Assignee must be staff or admin" },
        { status: 400 }
      );
    }

    const assignment = await prisma.staffAssignment.upsert({
      where: { caseId_userId: { caseId, userId } },
      create: { caseId, userId, role: typeof role === "string" ? role : "support" },
      update: { role: typeof role === "string" ? role : "support" },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to assign staff";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    if (status === 500) {
      console.error("POST /api/cases/[id]/staff error", e);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
