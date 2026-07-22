import { prisma } from "@/lib/db";
import { resolvePublicRealEstatePageSize } from "@/lib/public-real-estate-inventory";
import type { PropertyListingType, PropertyType, SalesListingStatus } from "@prisma/client";

export type PropertyTypeFilter = "all" | PropertyType;
export type PropertyListingTypeFilter = "all" | PropertyListingType;
export type SalesSellerKindFilter = "all" | "dealer" | "private";

/** Published inventory shown on /real-estate. */
export const PUBLIC_REAL_ESTATE_INVENTORY_STATUSES: SalesListingStatus[] = [
  "available",
  "reserved",
  "pending_boost",
];

export type RealEstateFilters = {
  propertyType?: PropertyTypeFilter;
  listingType?: PropertyListingTypeFilter;
  sellerKind?: SalesSellerKindFilter;
  search?: string;
  province?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minAreaSqm?: number;
  sort?: "latest" | "price_asc" | "price_desc" | "area_desc" | "area_asc";
  page?: number;
  pageSize?: number;
};

/** Clears boost flags when the window has passed. */
export async function expireStalePropertyBoostsNow() {
  try {
    await prisma.salesProperty.updateMany({
      where: {
        isBoosted: true,
        boostExpiresAt: { lte: new Date() },
      },
      data: { isBoosted: false },
    });
  } catch (error) {
    console.warn("expireStalePropertyBoostsNow skipped:", error);
  }
}

export async function getPublicFeaturedBoostedSalesProperties() {
  await expireStalePropertyBoostsNow();
  const where = {
    published: true,
    status: { in: ["available", "reserved"] as SalesListingStatus[] },
    isBoosted: true,
    boostExpiresAt: { gt: new Date() },
  };
  try {
    return await prisma.salesProperty.findMany({
      where,
      orderBy: [{ boostExpiresAt: "desc" }, { createdAt: "desc" }],
      take: 24,
    });
  } catch (error) {
    console.warn("Featured boosted properties unavailable:", error);
    return [];
  }
}

export async function getRealEstateFilterBounds() {
  try {
    const [minPrice, maxPrice, minArea, maxArea] = await Promise.all([
      prisma.salesProperty.aggregate({
        where: { published: true, status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES } },
        _min: { priceAmount: true },
      }),
      prisma.salesProperty.aggregate({
        where: { published: true, status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES } },
        _max: { priceAmount: true },
      }),
      prisma.salesProperty.aggregate({
        where: { published: true, status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES } },
        _min: { areaSqm: true },
      }),
      prisma.salesProperty.aggregate({
        where: { published: true, status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES } },
        _max: { areaSqm: true },
      }),
    ]);

    return {
      minPrice: minPrice._min.priceAmount ?? 0,
      maxPrice: maxPrice._max.priceAmount ?? 50_000_000,
      minAreaSqm: minArea._min.areaSqm ?? 20,
      maxAreaSqm: maxArea._max.areaSqm ?? 1000,
    };
  } catch (error) {
    console.warn("Real estate filter bounds unavailable, falling back to defaults:", error);
    return {
      minPrice: 0,
      maxPrice: 50_000_000,
      minAreaSqm: 20,
      maxAreaSqm: 1000,
    };
  }
}

export async function getPublicSalesProperties(filters: RealEstateFilters) {
  const search = filters.search?.trim();
  const province = filters.province?.trim();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = resolvePublicRealEstatePageSize(filters.pageSize);

  const where = {
    published: true,
    status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES },
    ...(filters.propertyType && filters.propertyType !== "all"
      ? { propertyType: filters.propertyType }
      : {}),
    ...(filters.listingType && filters.listingType !== "all"
      ? { listingType: filters.listingType }
      : {}),
    ...(filters.sellerKind && filters.sellerKind !== "all"
      ? { sellerKind: filters.sellerKind }
      : {}),
    ...(province
      ? { province: { contains: province, mode: "insensitive" as const } }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { province: { contains: search, mode: "insensitive" as const } },
            { district: { contains: search, mode: "insensitive" as const } },
            { neighborhood: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? {
          priceAmount: {
            ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
          },
        }
      : {}),
    ...(filters.minBedrooms !== undefined
      ? { bedrooms: { gte: filters.minBedrooms } }
      : {}),
    ...(filters.minAreaSqm !== undefined
      ? { areaSqm: { gte: filters.minAreaSqm } }
      : {}),
  };

  const secondaryOrder =
    filters.sort === "price_asc"
      ? ([{ priceAmount: "asc" as const }, { createdAt: "desc" as const }] as const)
      : filters.sort === "price_desc"
        ? ([{ priceAmount: "desc" as const }, { createdAt: "desc" as const }] as const)
        : filters.sort === "area_desc"
          ? ([{ areaSqm: "desc" as const }, { createdAt: "desc" as const }] as const)
          : filters.sort === "area_asc"
            ? ([{ areaSqm: "asc" as const }, { createdAt: "desc" as const }] as const)
            : ([{ createdAt: "desc" as const }] as const);

  const orderBy = [{ isBoosted: "desc" as const }, ...secondaryOrder];

  await expireStalePropertyBoostsNow();

  try {
    const [items, total] = await Promise.all([
      prisma.salesProperty.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.salesProperty.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error) {
    console.warn("Public real estate inventory unavailable, returning empty list:", error);
    return {
      items: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }
}

export async function getPublicSalesPropertyById(id: string) {
  await expireStalePropertyBoostsNow();
  try {
    return await prisma.salesProperty.findFirst({
      where: { id, published: true },
    });
  } catch (error) {
    console.warn("Sales property detail unavailable:", error);
    return null;
  }
}

export async function getAdminSalesProperties() {
  try {
    return await prisma.salesProperty.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (error) {
    console.warn("Admin real estate list unavailable, returning empty list:", error);
    return [];
  }
}

export async function getSalesPropertiesByOwner(userId: string) {
  try {
    return await prisma.salesProperty.findMany({
      where: { createdById: userId },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (error) {
    console.warn("User real estate list unavailable, returning empty list:", error);
    return [];
  }
}
