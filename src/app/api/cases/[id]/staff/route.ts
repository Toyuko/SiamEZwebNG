import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/cases/[id]/staff
 * Assign staff to a case.
 * Body: { userId: string, role?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const { userId, role = "support" } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const assignment = await prisma.staffAssignment.upsert({
      where: { caseId_userId: { caseId, userId } },
      create: { caseId, userId, role },
      update: { role },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (e) {
    console.error("POST /api/cases/[id]/staff error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to assign staff" },
      { status: 500 }
    );
  }
}
