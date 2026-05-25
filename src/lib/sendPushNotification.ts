import { Expo, type ExpoPushMessage } from "expo-server-sdk";

import { prisma } from "@/lib/db";

const expo = new Expo();

async function resolveExpoPushToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      expoPushToken: true,
      freelancerProfile: { select: { expoPushToken: true } },
    },
  });

  if (!user) {
    return null;
  }

  return user.expoPushToken ?? user.freelancerProfile?.expoPushToken ?? null;
}

/**
 * Sends an Expo push notification to the given user when a valid token is stored.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string | number | boolean | null>
): Promise<boolean> {
  const pushToken = await resolveExpoPushToken(userId);
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    return false;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: "default",
    title,
    body,
    data: data ?? {},
  };

  const chunks = expo.chunkPushNotifications([message]);

  try {
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === "error") {
          console.warn("[push] delivery error:", ticket.message, ticket.details);
        }
      }
    }
    return true;
  } catch (error) {
    console.warn("[push] send failed:", error);
    return false;
  }
}
