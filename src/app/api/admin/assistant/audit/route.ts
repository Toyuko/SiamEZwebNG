import { prisma } from "@/lib/db";
import { ok } from "@/lib/api-response";
import { backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireBackofficeActor();
    const entries = await prisma.backofficeAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        createdAt: true,
        actorEmail: true,
        actorRole: true,
        action: true,
        status: true,
        summary: true,
      },
    });
    return ok({ entries });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
