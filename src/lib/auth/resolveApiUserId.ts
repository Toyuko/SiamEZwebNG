import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getApiUser } from "@/lib/auth/getApiUser";

/**
 * Resolves the current user for API routes that must work from both
 * the web portal (session cookie) and the mobile app (Bearer JWT).
 */
export async function resolveApiUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { userId } = await getApiUser(request);
      return userId;
    } catch {
      return null;
    }
  }

  const session = await auth();
  return session?.user?.id ?? null;
}
