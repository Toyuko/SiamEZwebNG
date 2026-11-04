import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { runBackofficeTurn } from "@/lib/backoffice/turn";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().min(1).max(4500),
  conversationId: z.string().min(1).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireBackofficeActor();
    const limit = checkRateLimit(`backoffice:${actor.id ?? actor.email}`, 20, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return backofficeErrorResponse(parsed.error);
    const result = await runBackofficeTurn({
      actor,
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
    });
    return ok(result);
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
