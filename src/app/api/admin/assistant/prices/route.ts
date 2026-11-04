import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/api-response";
import { BackofficeError, backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { ensureBackofficeCatalogue } from "@/lib/backoffice/catalogue";
import { canEditPriceCatalogue } from "@/lib/backoffice/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireBackofficeActor();
    await ensureBackofficeCatalogue();
    const items = await prisma.backofficePriceItem.findMany({ orderBy: { sortOrder: "asc" } });
    return ok({ items });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  amountBaht: z.number().finite().nonnegative().max(1_000_000_000),
  active: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireBackofficeActor();
    if (!canEditPriceCatalogue(actor.role)) {
      throw new BackofficeError("Only an administrator can change catalogue prices.", 403);
    }
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return backofficeErrorResponse(parsed.error);
    const amountSatang = Math.round(parsed.data.amountBaht * 100);
    const item = await prisma.backofficePriceItem.update({
      where: { id: parsed.data.id },
      data: {
        amountSatang,
        active: parsed.data.active,
        updatedById: actor.id,
      },
    });
    await prisma.backofficeAuditLog.create({
      data: {
        staffId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "update_price",
        status: "success",
        summary: `${item.name} set to ${parsed.data.amountBaht} THB.`,
        entityType: "backoffice_price_item",
        entityId: item.id,
      },
    });
    return ok({ item });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
