import { NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth/getApiUser";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getApiUser(request);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user?.active) {
      return fail("Unauthorized", 401);
    }
    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load profile";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
