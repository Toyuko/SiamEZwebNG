import { NextRequest } from "next/server";
import { z } from "zod";

import { ok, fail } from "@/lib/api-response";
import { exchangeMobileOAuthCode } from "@/lib/auth/mobile-oauth";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const bodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().min(1).optional(),
});

/**
 * POST /api/auth/oauth/exchange
 * Mobile app exchanges the short-lived OAuth code from `/auth/mobile/complete`
 * for a Bearer API JWT (same shape as `/api/auth/login`).
 */
export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(
      clientKeyFromRequest(request, "oauth-exchange"),
      30,
      60_000
    );
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSec);
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return fail("Authorization code is required", 400);
    }

    const result = await exchangeMobileOAuthCode(parsed.data.code);
    return ok(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth exchange failed";
    const status =
      message.includes("expired") || message.includes("Invalid") ? 401 : 500;
    return fail(message, status);
  }
}
