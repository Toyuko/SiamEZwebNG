import {
  serviceSlugs,
  serviceDisplayNames,
  serviceShortDescriptions,
} from "@/config/services";
import { prisma } from "@/lib/db";

/** Shape used by public services grid / homepage (DB row or config fallback). */
export type PublicServiceListItem = {
  id?: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
};

/**
 * Merges DB services with `serviceSlugs` from config: any canonical slug missing
 * in the database still appears (copy from config). DB-only rows (e.g. extra
 * admin-created services, or slugs not in config) are appended after, by sortOrder.
 */
export function buildPublicServicesList(
  dbServices: Awaited<ReturnType<typeof getServicesList>>,
): PublicServiceListItem[] {
  const dbBySlug = new Map(dbServices.map((s) => [s.slug, s]));
  const canonical = new Set<string>(serviceSlugs);

  const list: PublicServiceListItem[] = [];

  for (const slug of serviceSlugs) {
    const row = dbBySlug.get(slug);
    if (row) {
      list.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        shortDescription: row.shortDescription,
        description: row.description,
        priceAmount: row.priceAmount,
        priceCurrency: row.priceCurrency,
      });
    } else {
      list.push({
        slug,
        name: serviceDisplayNames[slug],
        shortDescription: serviceShortDescriptions[slug],
        description: null,
        priceAmount: null,
        priceCurrency: null,
      });
    }
  }

  const extras = dbServices
    .filter((s) => !canonical.has(s.slug))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      shortDescription: row.shortDescription,
      description: row.description,
      priceAmount: row.priceAmount,
      priceCurrency: row.priceCurrency,
    }));

  return [...list, ...extras];
}

/** Public-facing service list: DB when available, plus config fallbacks for new canonical slugs. */
export async function getPublicServicesList(activeOnly = true) {
  const db = await getServicesList(activeOnly).catch(() => []);
  return buildPublicServicesList(db);
}

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
