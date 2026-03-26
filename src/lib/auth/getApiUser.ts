import { NextRequest } from "next/server";
import { verifyApiJwt } from "@/lib/auth/api-jwt";
import { prisma } from "@/lib/db";

export async function getApiUser(request: NextRequest) {
  const cachedUserId = request.headers.get("x-api-user-id");
  if (cachedUserId) {
    return { userId: cachedUserId };
  }

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
    select: { id: true, active: true },
  });
  if (!user || !user.active) {
    throw new Error("Unauthorized");
  }
  return { userId: user.id };
}
