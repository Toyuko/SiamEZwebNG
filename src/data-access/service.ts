import { prisma } from "@/lib/db";

export async function getServiceBySlug(slug: string) {
  try {
    return await prisma.service.findFirst({
      where: { slug, active: true },
    });
  } catch (error) {
    // If database is not available, return null to allow fallback to config
    console.warn("Database unavailable, falling back to config:", error);
    return null;
  }
}

export async function getServicesList(activeOnly = true) {
  try {
    return await prisma.service.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    // If database is not available, return empty array to allow fallback to config
    console.warn("Database unavailable, falling back to config:", error);
    return [];
  }
}

export async function getServiceById(id: string) {
  return prisma.service.findUnique({
    where: { id },
  });
}
