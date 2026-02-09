import { prisma } from "@/lib/db";

export async function getServiceBySlug(slug: string) {
  return prisma.service.findFirst({
    where: { slug, active: true },
  });
}

export async function getServicesList(activeOnly = true) {
  return prisma.service.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { sortOrder: "asc" },
  });
}

export async function getServiceById(id: string) {
  return prisma.service.findUnique({
    where: { id },
  });
}
