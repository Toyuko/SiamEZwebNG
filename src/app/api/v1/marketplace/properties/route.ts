import { NextRequest } from "next/server";
import {
  getPublicSalesProperties,
  getRealEstateFilterBounds,
  type RealEstateFilters,
} from "@/data-access/real-estate";
import {
  apiOk,
  parseOptionalNumber,
  parsePositiveInt,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

function parseFilters(request: NextRequest): RealEstateFilters {
  const sp = request.nextUrl.searchParams;
  const propertyType = sp.get("propertyType");
  const listingType = sp.get("listingType");
  const sellerKind = sp.get("sellerKind");
  const sort = sp.get("sort");

  return {
    propertyType:
      propertyType === "condo" ||
      propertyType === "house" ||
      propertyType === "townhouse" ||
      propertyType === "land" ||
      propertyType === "commercial" ||
      propertyType === "villa" ||
      propertyType === "all"
        ? propertyType
        : "all",
    listingType:
      listingType === "sale" ||
      listingType === "rent" ||
      listingType === "all"
        ? listingType
        : "all",
    sellerKind:
      sellerKind === "dealer" ||
      sellerKind === "private" ||
      sellerKind === "all"
        ? sellerKind
        : "all",
    search: sp.get("search") ?? undefined,
    province: sp.get("province") ?? undefined,
    minPrice: parseOptionalNumber(sp.get("minPrice")),
    maxPrice: parseOptionalNumber(sp.get("maxPrice")),
    minBedrooms: parseOptionalNumber(sp.get("minBedrooms")),
    minAreaSqm: parseOptionalNumber(sp.get("minAreaSqm")),
    sort:
      sort === "latest" ||
      sort === "price_asc" ||
      sort === "price_desc" ||
      sort === "area_desc" ||
      sort === "area_asc"
        ? sort
        : "latest",
    page: parsePositiveInt(sp.get("page"), 1),
    pageSize: parsePositiveInt(sp.get("pageSize"), 24),
  };
}

/** GET /api/v1/marketplace/properties — public inventory (Bearer optional). */
export async function GET(request: NextRequest) {
  return withOptionalBearerUser(request, async () => {
    const filters = parseFilters(request);
    const [result, bounds] = await Promise.all([
      getPublicSalesProperties(filters),
      getRealEstateFilterBounds(),
    ]);
    return apiOk(
      serializeJson({
        ...result,
        bounds,
      })
    );
  });
}
