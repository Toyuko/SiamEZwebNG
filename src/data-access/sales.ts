import { prisma } from "@/lib/db";
import type { SalesListingStatus } from "@prisma/client";

export type VehicleCategoryFilter = "all" | "car" | "motorcycle";
export type ListingStatus = "available" | "reserved" | "sold";

export type SalesFilters = {
  category?: VehicleCategoryFilter;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  sort?: "latest" | "price_asc" | "price_desc" | "year_desc" | "year_asc";
  page?: number;
  pageSize?: number;
};

const salesVehicleLegacySelect = {
  id: true,
  slug: true,
  title: true,
  make: true,
  model: true,
  year: true,
  mileageKm: true,
  priceAmount: true,
  priceCurrency: true,
  category: true,
  status: true,
  heroImageUrl: true,
  imageUrls: true,
  description: true,
  specifications: true,
  published: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

function isMissingVideoUrlsColumnError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("video_urls") || message.includes("videourls");
}

export async function getSalesFilterBounds() {
  try {
    const [minPrice, maxPrice, minYear, maxYear] = await Promise.all([
      prisma.salesVehicle.aggregate({
        where: { published: true, status: { in: ["available", "reserved"] } },
        _min: { priceAmount: true },
      }),
      prisma.salesVehicle.aggregate({
        where: { published: true, status: { in: ["available", "reserved"] } },
        _max: { priceAmount: true },
      }),
      prisma.salesVehicle.aggregate({
        where: { published: true, status: { in: ["available", "reserved"] } },
        _min: { year: true },
      }),
      prisma.salesVehicle.aggregate({
        where: { published: true, status: { in: ["available", "reserved"] } },
        _max: { year: true },
      }),
    ]);

    return {
      minPrice: minPrice._min.priceAmount ?? 0,
      maxPrice: maxPrice._max.priceAmount ?? 5000000,
      minYear: minYear._min.year ?? 1990,
      maxYear: maxYear._max.year ?? new Date().getFullYear(),
    };
  } catch (error) {
    console.warn("Sales filter bounds unavailable, falling back to defaults:", error);
    return {
      minPrice: 0,
      maxPrice: 5000000,
      minYear: 1990,
      maxYear: new Date().getFullYear(),
    };
  }
}

export async function getPublicSalesVehicles(filters: SalesFilters) {
  const search = filters.search?.trim();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(24, filters.pageSize ?? 9));

  const where = {
    published: true,
    status: { in: ["available", "reserved"] as SalesListingStatus[] },
    ...(filters.category && filters.category !== "all" ? { category: filters.category } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { make: { contains: search } },
            { model: { contains: search } },
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
    ...(filters.minYear !== undefined || filters.maxYear !== undefined
      ? {
          year: {
            ...(filters.minYear !== undefined ? { gte: filters.minYear } : {}),
            ...(filters.maxYear !== undefined ? { lte: filters.maxYear } : {}),
          },
        }
      : {}),
  };

  const orderBy =
    filters.sort === "price_asc"
      ? [{ priceAmount: "asc" as const }, { createdAt: "desc" as const }]
      : filters.sort === "price_desc"
        ? [{ priceAmount: "desc" as const }, { createdAt: "desc" as const }]
        : filters.sort === "year_desc"
          ? [{ year: "desc" as const }, { createdAt: "desc" as const }]
          : filters.sort === "year_asc"
            ? [{ year: "asc" as const }, { createdAt: "desc" as const }]
            : [{ createdAt: "desc" as const }];

  try {
    const [items, total] = await Promise.all([
      prisma.salesVehicle.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.salesVehicle.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error) {
    if (isMissingVideoUrlsColumnError(error)) {
      console.warn("sales_vehicles.video_urls missing; using fallback query without videoUrls");
      const [items, total] = await Promise.all([
        prisma.salesVehicle.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: salesVehicleLegacySelect,
        }),
        prisma.salesVehicle.count({ where }),
      ]);
      return {
        items: items.map((item) => ({ ...item, videoUrls: [] })),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }
    console.warn("Public sales inventory unavailable, returning empty list:", error);
    return {
      items: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
    };
  }
}

export async function getPublicSalesVehicleById(id: string) {
  try {
    return await prisma.salesVehicle.findFirst({
      where: { id, published: true },
    });
  } catch (error) {
    if (isMissingVideoUrlsColumnError(error)) {
      console.warn("sales_vehicles.video_urls missing; using fallback detail query without videoUrls");
      const listing = await prisma.salesVehicle.findFirst({
        where: { id, published: true },
        select: salesVehicleLegacySelect,
      });
      return listing ? { ...listing, videoUrls: [] } : null;
    }
    console.warn("Sales vehicle detail unavailable:", error);
    return null;
  }
}

export async function getAdminSalesVehicles() {
  try {
    return await prisma.salesVehicle.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (error) {
    if (isMissingVideoUrlsColumnError(error)) {
      console.warn("sales_vehicles.video_urls missing; using fallback admin query without videoUrls");
      const items = await prisma.salesVehicle.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: salesVehicleLegacySelect,
      });
      return items.map((item) => ({ ...item, videoUrls: [] }));
    }
    console.warn("Admin sales list unavailable, returning empty list:", error);
    return [];
  }
}

export async function getSalesVehiclesByOwner(userId: string) {
  try {
    return await prisma.salesVehicle.findMany({
      where: { createdById: userId },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (error) {
    if (isMissingVideoUrlsColumnError(error)) {
      console.warn("sales_vehicles.video_urls missing; using fallback owner query without videoUrls");
      const items = await prisma.salesVehicle.findMany({
        where: { createdById: userId },
        orderBy: [{ createdAt: "desc" }],
        select: salesVehicleLegacySelect,
      });
      return items.map((item) => ({ ...item, videoUrls: [] }));
    }
    console.warn("User sales list unavailable, returning empty list:", error);
    return [];
  }
}
