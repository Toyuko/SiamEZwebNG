import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api-response";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { submitAccountDeletionRequest } from "@/lib/account-deletion/service";
import { ACCOUNT_DELETION_GENERIC_ACK } from "@/config/account-deletion";

const bodySchema = z.object({
  email: z.string().min(3).max(254),
  confirmed: z.boolean(),
  locale: z.enum(["en", "th"]).optional(),
});

/**
 * POST /api/account/deletion-request
 * Public (unauthenticated) account deletion REQUEST — never executes hard delete.
 * Always returns a generic acknowledgement (no account enumeration).
 */
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(
    clientKeyFromRequest(request, "account-deletion-request"),
    5,
    60 * 60 * 1000
  );
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfterSec);
  }

  // Per-email soft limit (same window) to reduce repeated submissions
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return fail("Invalid request. Provide a valid email and confirmation.", 400);
    }

    const emailKey = `account-deletion-email:${parsed.data.email.trim().toLowerCase()}`;
    const emailRl = checkRateLimit(emailKey, 3, 60 * 60 * 1000);
    if (!emailRl.allowed) {
      return rateLimitResponse(emailRl.retryAfterSec);
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const result = await submitAccountDeletionRequest({
      email: parsed.data.email,
      confirmed: parsed.data.confirmed,
      locale: parsed.data.locale,
      ip,
      source: "PUBLIC",
      deleteImmediately: false,
    });

    if (!result.ok) {
      return fail(result.error, 400);
    }

    // Never include requestId or existence hints in the public response body.
    return ok({ message: ACCOUNT_DELETION_GENERIC_ACK });
  } catch (e) {
    console.error(
      "[account-deletion-request]",
      e instanceof Error ? e.message : "unknown"
    );
    return fail("Unable to submit deletion request. Please try again later.", 500);
  }
}
