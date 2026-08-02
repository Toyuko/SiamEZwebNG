import { NextRequest } from "next/server";
import { verifyApiJwt } from "@/lib/auth/api-jwt";
import { prisma } from "@/lib/db";
import type { ApiUser } from "@/lib/auth/getApiUser";

/**
 * Always verifies Authorization: Bearer. Never trusts x-api-user-id.
 * Use this for /api/v1 routes (and any new mobile-facing endpoints).
 */
export async function requireBearerApiUser(
  request: NextRequest
): Promise<ApiUser> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const payload = await verifyApiJwt(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, active: true, role: true },
  });
  if (!user || !user.active) {
    throw new Error("Unauthorized");
  }
  return { userId: user.id, role: user.role };
}

/** Same as requireBearerApiUser, but returns null when no/invalid token. */
export async function optionalBearerApiUser(
  request: NextRequest
): Promise<ApiUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  try {
    return await requireBearerApiUser(request);
  } catch {
    return null;
  }
}
