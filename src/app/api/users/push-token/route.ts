import { NextRequest } from "next/server";
import { z } from "zod";
import { Expo } from "expo-server-sdk";

import { ok, fail } from "@/lib/api-response";
import { getApiUser } from "@/lib/auth/getApiUser";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getApiUser(request);
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return fail("A valid Expo push token is required.", 400);
    }

    const token = parsed.data.token.trim();
    if (!Expo.isExpoPushToken(token)) {
      return fail("Invalid Expo push token.", 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token },
    });

    await prisma.freelancerProfile.updateMany({
      where: { userId },
      data: { expoPushToken: token },
    });

    return ok({ saved: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save push token";
    return fail(message, message === "Unauthorized" ? 401 : 500);
  }
}
