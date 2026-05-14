import { setRequestLocale } from "next-intl/server";
import {
  getPublicFeaturedBoostedSalesVehicles,
  getPublicSalesVehicles,
  getSalesFilterBounds,
} from "@/data-access/sales";
import { parsePublicSalesPageSizeParam } from "@/lib/public-sales-inventory";
import { SalesInventoryClient } from "./SalesInventoryClient";
import type { PublicSalesVehicleCard } from "@/components/sales/SalesListingCard";
import {
  isSunsetScootersDealerMotorcycleListing,
  resolveSunsetDealerMotorcycleHeroUrl,
} from "@/lib/sunset-dealer-motorcycle-hero";

export const dynamic = "force-dynamic";

function parseIntParam(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPublicSalesVehicleCard(
  v: Awaited<ReturnType<typeof getPublicSalesVehicles>>["items"][number]
): PublicSalesVehicleCard {
  const boostActive = Boolean(
    v.isBoosted && v.boostExpiresAt != null && new Date(v.boostExpiresAt).getTime() > Date.now()
  );
  const heroImageUrl = isSunsetScootersDealerMotorcycleListing({
    category: v.category,
    sellerKind: v.sellerKind,
  })
    ? resolveSunsetDealerMotorcycleHeroUrl({
        slug: v.slug,
        heroImageUrl: v.heroImageUrl,
        imageUrls: v.imageUrls,
      })
    : v.heroImageUrl;
  return {
    id: v.id,
    heroImageUrl,
    priceAmount: v.priceAmount,
    priceCurrency: v.priceCurrency,
    make: v.make,
    model: v.model,
    year: v.year,
    mileageKm: v.mileageKm,
    category: v.category,
    status: v.status,
    sellerKind: v.sellerKind,
    isBoosted: v.isBoosted,
    boostActive,
  };
}

export default async function SalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const bounds = await getSalesFilterBounds();

  const categoryValue = typeof sp.category === "string" ? sp.category : "";
  const category = categoryValue === "car" || categoryValue === "motorcycle" ? categoryValue : "all";
  const sellerParam = typeof sp.seller === "string" ? sp.seller : "";
  const sellerKind = sellerParam === "dealer" || sellerParam === "private" ? sellerParam : "all";
  const search = typeof sp.search === "string" ? sp.search : "";
  const sortParam = typeof sp.sort === "string" ? sp.sort : "";
  const sort =
    sortParam === "price_asc" ||
    sortParam === "price_desc" ||
    sortParam === "year_desc" ||
    sortParam === "year_asc" ||
    sortParam === "latest"
      ? sortParam
      : "latest";
  const page = Math.max(1, parseIntParam(typeof sp.page === "string" ? sp.page : undefined, 1));
  const pageSize = parsePublicSalesPageSizeParam(typeof sp.pageSize === "string" ? sp.pageSize : undefined);

  const minPrice = Math.max(bounds.minPrice, parseIntParam(typeof sp.minPrice === "string" ? sp.minPrice : undefined, bounds.minPrice));
  const maxPrice = Math.min(bounds.maxPrice, parseIntParam(typeof sp.maxPrice === "string" ? sp.maxPrice : undefined, bounds.maxPrice));
  const minYear = Math.max(bounds.minYear, parseIntParam(typeof sp.minYear === "string" ? sp.minYear : undefined, bounds.minYear));
  const maxYear = Math.min(bounds.maxYear, parseIntParam(typeof sp.maxYear === "string" ? sp.maxYear : undefined, bounds.maxYear));

  const [result, featuredRaw] = await Promise.all([
    getPublicSalesVehicles({
      category,
      sellerKind,
      search,
      minPrice: Math.min(minPrice, maxPrice),
      maxPrice: Math.max(minPrice, maxPrice),
      minYear: Math.min(minYear, maxYear),
      maxYear: Math.max(minYear, maxYear),
      sort,
      page,
      pageSize,
    }),
    getPublicFeaturedBoostedSalesVehicles(),
  ]);

  const featuredBoosted: PublicSalesVehicleCard[] = featuredRaw.map((v) => ({
    ...toPublicSalesVehicleCard(v),
    isBoosted: true,
    boostActive: true,
  }));

  return (
    <SalesInventoryClient
      featuredBoosted={featuredBoosted}
      vehicles={result.items.map(toPublicSalesVehicleCard)}
      bounds={bounds}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        pageSize: result.pageSize,
      }}
      filters={{
        category,
        sellerKind,
        search,
        minPrice: Math.min(minPrice, maxPrice),
        maxPrice: Math.max(minPrice, maxPrice),
        minYear: Math.min(minYear, maxYear),
        maxYear: Math.max(minYear, maxYear),
        sort,
      }}
    />
  );
}
