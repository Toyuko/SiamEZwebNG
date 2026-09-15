import { NextRequest } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { ok, fail } from "@/lib/api-response";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { optionalBearerApiUser } from "@/lib/auth/requireBearerApiUser";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { submitAccountDeletionRequest } from "@/lib/account-deletion/service";
import {
  ACCOUNT_DELETION_CONFIRM_PHRASE,
  ACCOUNT_DELETION_GENERIC_ACK,
} from "@/config/account-deletion";

const bodySchema = z.object({
  confirmPhrase: z.string().min(1).max(200),
  password: z.string().min(1).max(200).optional(),
  locale: z.enum(["en", "th"]).optional(),
});

/**
 * POST /api/account/delete
 * Authenticated permanent account deletion.
 * Requires session cookie or Bearer JWT, confirmation phrase, and password when the account uses credentials.
 */
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(clientKeyFromRequest(request, "account-delete"), 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return rateLimitResponse(rl.retryAfterSec);
  }

  try {
    const session = await auth();
    const bearer = await optionalBearerApiUser(request);
    const userId = session?.user?.id ?? bearer?.userId;

    if (!userId) {
      return fail("Authentication required.", 401);
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return fail("Invalid request.", 400);
    }

    if (parsed.data.confirmPhrase.trim() !== ACCOUNT_DELETION_CONFIRM_PHRASE) {
      return fail(
        `Type exactly: ${ACCOUNT_DELETION_CONFIRM_PHRASE}`,
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true, active: true, role: true },
    });

    if (!user || !user.active) {
      return fail("Authentication required.", 401);
    }

    if (user.passwordHash) {
      if (!parsed.data.password) {
        return fail("Password is required to delete your account.", 400);
      }
      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) {
        return fail("Password is incorrect.", 401);
      }
    }

    const result = await submitAccountDeletionRequest({
      email: user.email,
      confirmed: true,
      locale: parsed.data.locale,
      source: "AUTHENTICATED",
      authenticatedUserId: user.id,
      deleteImmediately: true,
      actorId: user.id,
    });

    if (!result.ok) {
      return fail(result.error, 400);
    }

    if (session?.user?.id) {
      await signOut({ redirect: false });
    }

    return ok({ message: ACCOUNT_DELETION_GENERIC_ACK, deleted: true });
  } catch (e) {
    console.error("[account-delete]", e instanceof Error ? e.message : "unknown");
    return fail("Unable to delete account. Please try again or contact support.", 500);
  }
}
