import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { resolveApiUserId } from "@/lib/auth/resolveApiUserId";

/**
 * Requires an authenticated freelancer via Bearer JWT (mobile) or
 * session cookie (web portal). Role is always loaded from the database.
 */
export async function requireApiFreelancer(request: NextRequest) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true },
  });
  if (!user?.active || user.role !== "freelancer") {
    throw new Error("Forbidden");
  }
  return { userId: user.id };
}
