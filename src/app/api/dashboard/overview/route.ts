import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api-response";
import { requireBearerApiUser } from "@/lib/auth/requireBearerApiUser";

/**
 * GET /api/dashboard/overview
 * Mobile client contract — counts for the member hub.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireBearerApiUser(request);

    const [activeCases, pendingInvoices, recentUpdates] = await Promise.all([
      prisma.case.count({
        where: {
          userId,
          status: { notIn: ["completed", "cancelled"] },
        },
      }),
      prisma.invoice.count({
        where: {
          case: { userId },
          status: { in: ["unpaid", "pending_verification"] },
        },
      }),
      prisma.case.count({
        where: {
          userId,
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return ok({ activeCases, pendingInvoices, recentUpdates });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return fail("Unauthorized", 401);
    }
    return fail(
      error instanceof Error ? error.message : "Failed to load overview",
      500
    );
  }
}
