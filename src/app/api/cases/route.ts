import { NextRequest, NextResponse } from "next/server";
import { createCase } from "@/data-access/case";
import { nextCaseNumber } from "@/lib/utils";
import { prisma } from "@/lib/db";
import type { CaseStatus } from "@prisma/client";
import { getApiUser } from "@/lib/auth/getApiUser";
import { isStaffRole } from "@/lib/auth/roles";
import { getUserCases } from "@/lib/domain/cases";
import { attachOwnedDocumentsToCase } from "@/lib/documents/ownership";
import { ok, fail } from "@/lib/api-response";

/**
 * POST /api/cases
 * Create a new case for the authenticated API user.
 * Staff may optionally set userId for another customer.
 * Body: { serviceId, guestEmail?, guestName?, guestPhone?, formData?, documentIds?, userId? }
 */
export async function POST(request: NextRequest) {
  try {
    const apiUser = await getApiUser(request);
    const body = await request.json();
    const { serviceId, guestEmail, guestName, guestPhone, formData, documentIds } = body;

    if (!serviceId) {
      return NextResponse.json({ error: "serviceId required" }, { status: 400 });
    }

    let userId = apiUser.userId;
    if (typeof body?.userId === "string" && body.userId !== apiUser.userId) {
      if (!isStaffRole(apiUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      userId = body.userId;
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.active) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    const caseNumber = nextCaseNumber();
    const status: CaseStatus = service.type === "fixed" ? "new" : "under_review";

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

    if (Array.isArray(documentIds) && documentIds.length) {
      await attachOwnedDocumentsToCase({
        caseId: c.id,
        documentIds,
        userId: apiUser.userId,
      });
    }

    return NextResponse.json({
      success: true,
      caseId: c.id,
      caseNumber: c.caseNumber,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create case";
    const status = message === "Unauthorized" ? 401 : 500;
    if (status === 500) {
      console.error("POST /api/cases error", e);
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getApiUser(request);
    const cases = await getUserCases(userId);
    return ok(cases);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch cases";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
