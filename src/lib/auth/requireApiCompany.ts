import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser } from "@/lib/auth/getApiUser";

export async function requireApiCompany(request: NextRequest) {
  const { userId } = await getApiUser(request);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true },
  });
  if (!user?.active || user.role !== "company") {
    throw new Error("Forbidden");
  }
  return { userId: user.id };
}
