import { prisma } from "@/lib/db";
import {
  PUBLIC_REAL_ESTATE_INVENTORY_STATUSES,
} from "@/data-access/real-estate";
import { PUBLIC_SALES_INVENTORY_STATUSES } from "@/data-access/sales";
import { countUrlList } from "@/lib/migration/media";
import type { AnalyzePublishedListingsResult, ListingSnapshot } from "@/lib/migration/types";

/**
 * Read-only Prisma surface used by the Migration Engine.
 * Dry-run analysis must only call findMany / count — never update/delete.
 */
export type MigrationPrismaClient = {
  salesVehicle: {
    findMany: typeof prisma.salesVehicle.findMany;
  };
  salesProperty: {
    findMany: typeof prisma.salesProperty.findMany;
  };
};

const vehicleSelect = {
  id: true,
  slug: true,
  title: true,
  make: true,
  model: true,
  year: true,
  category: true,
  status: true,
  published: true,
  priceAmount: true,
  priceCurrency: true,
  heroImageUrl: true,
  imageUrls: true,
  videoUrls: true,
  sellerKind: true,
  isBoosted: true,
  createdAt: true,
  updatedAt: true,
} as const;

const propertySelect = {
  id: true,
  slug: true,
  title: true,
  propertyType: true,
  listingType: true,
  province: true,
  status: true,
  published: true,
  priceAmount: true,
  priceCurrency: true,
  heroImageUrl: true,
  imageUrls: true,
  videoUrls: true,
  sellerKind: true,
  isBoosted: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toVehicleSnapshot(row: {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  year: number;
  category: string;
  status: string;
  published: boolean;
  priceAmount: number;
  priceCurrency: string;
  heroImageUrl: string;
  imageUrls: unknown;
  videoUrls: unknown;
  sellerKind: string;
  isBoosted: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ListingSnapshot {
  return {
    id: row.id,
    slug: row.slug,
    division: "sales",
    title: row.title,
    status: row.status,
    published: row.published,
    priceAmount: row.priceAmount,
    priceCurrency: row.priceCurrency,
    heroImageUrl: row.heroImageUrl,
    imageCount: countUrlList(row.imageUrls),
    videoCount: countUrlList(row.videoUrls),
    sellerKind: row.sellerKind,
    isBoosted: row.isBoosted,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    summary: `${row.year} ${row.make} ${row.model} (${row.category})`,
  };
}

function toPropertySnapshot(row: {
  id: string;
  slug: string;
  title: string;
  propertyType: string;
  listingType: string;
  province: string;
  status: string;
  published: boolean;
  priceAmount: number;
  priceCurrency: string;
  heroImageUrl: string;
  imageUrls: unknown;
  videoUrls: unknown;
  sellerKind: string;
  isBoosted: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ListingSnapshot {
  return {
    id: row.id,
    slug: row.slug,
    division: "real-estate",
    title: row.title,
    status: row.status,
    published: row.published,
    priceAmount: row.priceAmount,
    priceCurrency: row.priceCurrency,
    heroImageUrl: row.heroImageUrl,
    imageCount: countUrlList(row.imageUrls),
    videoCount: countUrlList(row.videoUrls),
    sellerKind: row.sellerKind,
    isBoosted: row.isBoosted,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    summary: `${row.propertyType} · ${row.listingType} · ${row.province}`,
  };
}

export type AnalyzePublishedListingsOptions = {
  /** Injected for unit tests; defaults to app Prisma client. */
  db?: MigrationPrismaClient;
};

/**
 * Inventory all published SalesVehicle + SalesProperty rows that match public
 * marketplace status filters. Non-destructive: findMany only.
 */
export async function analyzePublishedListings(
  options: AnalyzePublishedListingsOptions = {}
): Promise<AnalyzePublishedListingsResult> {
  const db = options.db ?? prisma;

  const [vehicles, properties] = await Promise.all([
    db.salesVehicle.findMany({
      where: {
        published: true,
        status: { in: PUBLIC_SALES_INVENTORY_STATUSES },
      },
      select: vehicleSelect,
      orderBy: { createdAt: "asc" },
    }),
    db.salesProperty.findMany({
      where: {
        published: true,
        status: { in: PUBLIC_REAL_ESTATE_INVENTORY_STATUSES },
      },
      select: propertySelect,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const vehicleSnapshots = vehicles.map(toVehicleSnapshot);
  const propertySnapshots = properties.map(toPropertySnapshot);

  return {
    vehicles: vehicleSnapshots,
    properties: propertySnapshots,
    all: [...vehicleSnapshots, ...propertySnapshots],
  };
}
