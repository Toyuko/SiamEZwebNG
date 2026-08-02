import { NextRequest } from "next/server";
import { verifyApiJwt } from "@/lib/auth/api-jwt";
import { prisma } from "@/lib/db";

export type ApiUser = {
  userId: string;
  role: string;
};

async function loadActiveApiUser(userId: string): Promise<ApiUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, active: true, role: true },
  });
  if (!user || !user.active) {
    throw new Error("Unauthorized");
  }
  return { userId: user.id, role: user.role };
}

export async function getApiUser(request: NextRequest): Promise<ApiUser> {
  const cachedUserId = request.headers.get("x-api-user-id");
  if (cachedUserId) {
    return loadActiveApiUser(cachedUserId);
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
  return loadActiveApiUser(payload.userId);
}
