import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { resolvePendingAction } from "@/lib/backoffice/actions";
import { backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  actionId: z.string().min(1),
  decision: z.enum(["confirm", "reject"]),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireBackofficeActor();
    const limit = checkRateLimit(`backoffice-confirm:${actor.id ?? actor.email}`, 20, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return backofficeErrorResponse(parsed.error);
    const result = await resolvePendingAction({
      actor,
      actionId: parsed.data.actionId,
      decision: parsed.data.decision,
    });
    return ok(result);
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
