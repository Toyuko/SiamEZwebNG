import { prisma } from "@/lib/db";
import { resolvePublicSalesPageSize } from "@/lib/public-sales-inventory";
import type { SalesListingStatus } from "@prisma/client";
import { boostDaysFromTier } from "@/lib/sales-boost-packages";

export type VehicleCategoryFilter = "all" | "car" | "motorcycle";
export type SalesSellerKindFilter = "all" | "dealer" | "private";
export type ListingStatus = "available" | "reserved" | "sold" | "pending_boost";

/** Published inventory shown on /sales (includes bank-slip boost pending review). */
export const PUBLIC_SALES_INVENTORY_STATUSES: SalesListingStatus[] = ["available", "reserved", "pending_boost"];

export type SalesFilters = {
  category?: VehicleCategoryFilter;
  sellerKind?: SalesSellerKindFilter;
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
  sellerKind: true,
  isBoosted: true,
  boostExpiresAt: true,
  boostTier: true,
  omiseChargeId: true,
  boostProofDocumentId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

const SALES_STRIPE_LEGACY_BOOST_DAYS = 30;

/** Applies paid boost window and marks listing available (clears pending_boost after bank approval). */
export async function applySalesBoostAfterPayment(
  salesVehicleId: string,
  opts: { days: number; tier?: string | null; clearOmiseCharge?: boolean }
) {
  const days = Number.isFinite(opts.days) && opts.days > 0 ? opts.days : boostDaysFromTier(opts.tier);
  const boostExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await prisma.salesVehicle.update({
    where: { id: salesVehicleId },
    data: {
      isBoosted: true,
      boostExpiresAt,
      ...(opts.tier !== undefined && opts.tier !== null ? { boostTier: opts.tier } : {}),
      status: "available",
      ...(opts.clearOmiseCharge ? { omiseChargeId: null } : {}),
    },
  });
}

/** Called from Stripe webhook after verified payment for legacy Super Boost checkout. */
export async function applySalesSuperBoostForListing(salesVehicleId: string) {
  await applySalesBoostAfterPayment(salesVehicleId, {
    days: SALES_STRIPE_LEGACY_BOOST_DAYS,
    tier: "stripe_30d",
    clearOmiseCharge: false,
  });
}

/** Clears boost flags when the window has passed (read-path maintenance, no cron required). */
export async function expireStaleSalesBoostsNow() {
  try {
    await prisma.salesVehicle.updateMany({
      where: {
        isBoosted: true,
        boostExpiresAt: { lte: new Date() },
      },
      data: { isBoosted: false },
    });
  } catch (error) {
    console.warn("expireStaleSalesBoostsNow skipped:", error);
  }
}

/** Active boosted vehicles for the featured carousel (empty when none). */
export async function getPublicFeaturedBoostedSalesVehicles() {
  await expireStaleSalesBoostsNow();
  const where = {
    published: true,
    status: { in: ["available", "reserved"] as SalesListingStatus[] },
    isBoosted: true,
    boostExpiresAt: { gt: new Date() },
  };
  try {
    return await prisma.salesVehicle.findMany({
      where,
      orderBy: [{ boostExpiresAt: "desc" }, { createdAt: "desc" }],
      take: 24,
    });
  } catch (error) {
    console.warn("Featured boosted vehicles unavailable:", error);
    return [];
  }
}

function isMissingSalesMediaColumnError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("video_urls") ||
    message.includes("videourls") ||
    message.includes("hero_media_type") ||
    message.includes("heromediatype") ||
    message.includes("hero_video_url") ||
    message.includes("herovideourl")
  );
}

const SALES_FALLBACK_HERO_MEDIA_TYPE = "image" as const;

function normalizeHeroMediaType(value: unknown): "image" | "video" | undefined {
  return value === "video" || value === "image" ? value : undefined;
}

export async function getSalesFilterBounds() {
  try {
    const [minPrice, maxPrice, minYear, maxYear] = await Promise.all([
      prisma.salesVehicle.aggregate({
        where: { published: true, status: { in: PUBLIC_SALES_INVENTORY_STATUSES } },
        _min: { priceAmount: true },
      }),
      prisma.salesVehicle.aggregate({
        where: { published: true, status: { in: PUBLIC_SALES_INVENTORY_STATUSES } },
        _max: { priceAmount: true },
      }),
      prisma.salesVehicle.aggregate({
        where: { published: true, status: { in: PUBLIC_SALES_INVENTORY_STATUSES } },
        _min: { year: true },
      }),
      prisma.salesVehicle.aggregate({
        where: { published: true, status: { in: PUBLIC_SALES_INVENTORY_STATUSES } },
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
  const pageSize = resolvePublicSalesPageSize(filters.pageSize);

  const where = {
    published: true,
    status: { in: PUBLIC_SALES_INVENTORY_STATUSES },
    ...(filters.category && filters.category !== "all" ? { category: filters.category } : {}),
    ...(filters.sellerKind && filters.sellerKind !== "all"
      ? { sellerKind: filters.sellerKind }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { make: { contains: search, mode: "insensitive" as const } },
            { model: { contains: search, mode: "insensitive" as const } },
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

  const secondaryOrder =
    filters.sort === "price_asc"
      ? ([{ priceAmount: "asc" as const }, { createdAt: "desc" as const }] as const)
      : filters.sort === "price_desc"
        ? ([{ priceAmount: "desc" as const }, { createdAt: "desc" as const }] as const)
        : filters.sort === "year_desc"
          ? ([{ year: "desc" as const }, { createdAt: "desc" as const }] as const)
          : filters.sort === "year_asc"
            ? ([{ year: "asc" as const }, { createdAt: "desc" as const }] as const)
            : ([{ createdAt: "desc" as const }] as const);

  const orderBy = [{ isBoosted: "desc" as const }, ...secondaryOrder];

  await expireStaleSalesBoostsNow();

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
    if (isMissingSalesMediaColumnError(error)) {
      console.warn("sales media columns missing; using fallback query without video columns");
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
        items: items.map((item) => ({
          ...item,
          heroMediaType: SALES_FALLBACK_HERO_MEDIA_TYPE,
          heroVideoUrl: null,
          videoUrls: [],
        })),
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
  await expireStaleSalesBoostsNow();
  try {
    return await prisma.salesVehicle.findFirst({
      where: { id, published: true },
    });
  } catch (error) {
    if (isMissingSalesMediaColumnError(error)) {
      console.warn("sales media columns missing; using fallback detail query without video columns");
      const listing = await prisma.salesVehicle.findFirst({
        where: { id, published: true },
        select: salesVehicleLegacySelect,
      });
      return listing
        ? {
            ...listing,
            heroMediaType: SALES_FALLBACK_HERO_MEDIA_TYPE,
            heroVideoUrl: null,
            videoUrls: [],
          }
        : null;
    }
    console.warn("Sales vehicle detail unavailable:", error);
    return null;
  }
}

export async function getAdminSalesVehicles() {
  try {
    const items = await prisma.salesVehicle.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    return items.map((item) => ({
      ...item,
      heroMediaType: normalizeHeroMediaType(item.heroMediaType),
    }));
  } catch (error) {
    if (isMissingSalesMediaColumnError(error)) {
      console.warn("sales media columns missing; using fallback admin query without video columns");
      const items = await prisma.salesVehicle.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: salesVehicleLegacySelect,
      });
      return items.map((item) => ({
        ...item,
        heroMediaType: SALES_FALLBACK_HERO_MEDIA_TYPE,
        heroVideoUrl: null,
        videoUrls: [],
      }));
    }
    console.warn("Admin sales list unavailable, returning empty list:", error);
    return [];
  }
}

export async function getSalesVehiclesByOwner(userId: string) {
  try {
    const items = await prisma.salesVehicle.findMany({
      where: { createdById: userId },
      orderBy: [{ createdAt: "desc" }],
    });
    return items.map((item) => ({
      ...item,
      heroMediaType: normalizeHeroMediaType(item.heroMediaType),
    }));
  } catch (error) {
    if (isMissingSalesMediaColumnError(error)) {
      console.warn("sales media columns missing; using fallback owner query without video columns");
      const items = await prisma.salesVehicle.findMany({
        where: { createdById: userId },
        orderBy: [{ createdAt: "desc" }],
        select: salesVehicleLegacySelect,
      });
      return items.map((item) => ({
        ...item,
        heroMediaType: SALES_FALLBACK_HERO_MEDIA_TYPE,
        heroVideoUrl: null,
        videoUrls: [],
      }));
    }
    console.warn("User sales list unavailable, returning empty list:", error);
    return [];
  }
}
