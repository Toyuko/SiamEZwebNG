import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export function trackPlatformEvent(
  kind: string,
  meta?: Record<string, unknown>,
  userId?: string,
  locale?: string
) {
  return prisma.platformMetricEvent
    .create({ data: { kind, meta: meta as Prisma.InputJsonValue | undefined, userId, locale } })
    .catch(() => undefined);
}
