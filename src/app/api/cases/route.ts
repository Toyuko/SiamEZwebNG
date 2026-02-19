import { NextRequest, NextResponse } from "next/server";
import { createCase } from "@/data-access/case";
import { nextCaseNumber } from "@/lib/utils";
import { prisma } from "@/lib/db";
import type { CaseStatus } from "@prisma/client";

/**
 * POST /api/cases
 * Create a new case (e.g. from booking).
 * Body: { userId, serviceId, guestEmail?, guestName?, guestPhone?, formData?, documentIds? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, serviceId, guestEmail, guestName, guestPhone, formData, documentIds } = body;

    if (!userId || !serviceId) {
      return NextResponse.json({ error: "userId and serviceId required" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.active) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    const caseNumber = nextCaseNumber();
    const status: CaseStatus = "new";

    const c = await createCase({
      caseNumber,
      userId,
      serviceId,
      status,
      guestEmail: guestEmail ?? null,
      guestName: guestName ?? null,
      guestPhone: guestPhone ?? null,
      formData: formData ?? undefined,
    });

    if (documentIds?.length) {
      await prisma.document.updateMany({
        where: { id: { in: documentIds } },
        data: { caseId: c.id },
      });
    }

    return NextResponse.json({
      success: true,
      caseId: c.id,
      caseNumber: c.caseNumber,
    });
  } catch (e) {
    console.error("POST /api/cases error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create case" },
      { status: 500 }
    );
  }
}
