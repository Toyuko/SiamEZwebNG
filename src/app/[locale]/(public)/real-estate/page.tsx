import { setRequestLocale } from "next-intl/server";
import {
  getPublicFeaturedBoostedSalesProperties,
  getPublicSalesProperties,
  getRealEstateFilterBounds,
} from "@/data-access/real-estate";
import { parsePublicRealEstatePageSizeParam } from "@/lib/public-real-estate-inventory";
import { RealEstateInventoryClient } from "./RealEstateInventoryClient";
import type { PublicSalesPropertyCard } from "@/components/real-estate/RealEstateListingCard";

export const dynamic = "force-dynamic";

const PROPERTY_TYPES = ["condo", "house", "townhouse", "land", "commercial", "villa"] as const;

function parseIntParam(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPublicCard(
  p: Awaited<ReturnType<typeof getPublicSalesProperties>>["items"][number]
): PublicSalesPropertyCard {
  const boostActive = Boolean(
    p.isBoosted && p.boostExpiresAt != null && new Date(p.boostExpiresAt).getTime() > Date.now()
  );
  return {
    id: p.id,
    title: p.title,
    heroImageUrl: p.heroImageUrl,
    priceAmount: p.priceAmount,
    priceCurrency: p.priceCurrency,
    propertyType: p.propertyType,
    listingType: p.listingType,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    areaSqm: p.areaSqm,
    province: p.province,
    district: p.district,
    status: p.status,
    sellerKind: p.sellerKind,
    isBoosted: p.isBoosted,
    boostActive,
  };
}

export default async function RealEstatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const bounds = await getRealEstateFilterBounds();

  const typeValue = typeof sp.type === "string" ? sp.type : "";
  const propertyType = (PROPERTY_TYPES as readonly string[]).includes(typeValue)
    ? (typeValue as (typeof PROPERTY_TYPES)[number])
    : "all";
  const listingParam = typeof sp.listing === "string" ? sp.listing : "";
  const listingType = listingParam === "sale" || listingParam === "rent" ? listingParam : "all";
  const sellerParam = typeof sp.seller === "string" ? sp.seller : "";
  const sellerKind = sellerParam === "dealer" || sellerParam === "private" ? sellerParam : "all";
  const search = typeof sp.search === "string" ? sp.search : "";
  const province = typeof sp.province === "string" ? sp.province : "";
  const sortParam = typeof sp.sort === "string" ? sp.sort : "";
  const sort =
    sortParam === "price_asc" ||
    sortParam === "price_desc" ||
    sortParam === "area_desc" ||
    sortParam === "area_asc" ||
    sortParam === "latest"
      ? sortParam
      : "latest";
  const page = Math.max(1, parseIntParam(typeof sp.page === "string" ? sp.page : undefined, 1));
  const pageSize = parsePublicRealEstatePageSizeParam(
    typeof sp.pageSize === "string" ? sp.pageSize : undefined
  );
  const minBedroomsRaw = typeof sp.minBeds === "string" ? Number.parseInt(sp.minBeds, 10) : NaN;
  const minBedrooms = Number.isFinite(minBedroomsRaw) && minBedroomsRaw > 0 ? minBedroomsRaw : undefined;

  const minPrice = Math.max(
    bounds.minPrice,
    parseIntParam(typeof sp.minPrice === "string" ? sp.minPrice : undefined, bounds.minPrice)
  );
  const maxPrice = Math.min(
    bounds.maxPrice,
    parseIntParam(typeof sp.maxPrice === "string" ? sp.maxPrice : undefined, bounds.maxPrice)
  );
  const minAreaSqm = Math.max(
    bounds.minAreaSqm,
    parseIntParam(typeof sp.minArea === "string" ? sp.minArea : undefined, bounds.minAreaSqm)
  );

  const [result, featuredRaw] = await Promise.all([
    getPublicSalesProperties({
      propertyType,
      listingType,
      sellerKind,
      search,
      province,
      minPrice: Math.min(minPrice, maxPrice),
      maxPrice: Math.max(minPrice, maxPrice),
      minBedrooms,
      minAreaSqm,
      sort,
      page,
      pageSize,
    }),
    getPublicFeaturedBoostedSalesProperties(),
  ]);

  const featuredBoosted: PublicSalesPropertyCard[] = featuredRaw.map((p) => ({
    ...toPublicCard(p),
    isBoosted: true,
    boostActive: true,
  }));

  return (
    <RealEstateInventoryClient
      featuredBoosted={featuredBoosted}
      properties={result.items.map(toPublicCard)}
      bounds={bounds}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
        pageSize: result.pageSize,
      }}
      filters={{
        propertyType,
        listingType,
        sellerKind,
        search,
        province,
        minPrice: Math.min(minPrice, maxPrice),
        maxPrice: Math.max(minPrice, maxPrice),
        minBedrooms: minBedrooms ?? 0,
        minAreaSqm,
        sort,
      }}
    />
  );
}
