import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function getActiveServices() {
  return prisma.service.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function registerPushDevice(input: {
  userId: string;
  token: string;
  platform: string;
  appVersion?: string;
  deviceId?: string;
}) {
  const key = "mobile_push_devices";
  const current = await prisma.appSetting.findUnique({ where: { key } });
  const now = new Date().toISOString();

  const list = Array.isArray(current?.value) ? (current.value as Array<Record<string, unknown>>) : [];
  const filtered = list.filter(
    (item) =>
      !(item.userId === input.userId && item.token === input.token) &&
      !(input.deviceId && item.userId === input.userId && item.deviceId === input.deviceId)
  );

  filtered.push({
    userId: input.userId,
    token: input.token,
    platform: input.platform,
    appVersion: input.appVersion ?? null,
    deviceId: input.deviceId ?? null,
    updatedAt: now,
  });

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: filtered as Prisma.InputJsonValue },
    update: { value: filtered as Prisma.InputJsonValue },
  });
}
