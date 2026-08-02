import { NextRequest } from "next/server";
import {
  getPublicSalesVehicles,
  getSalesFilterBounds,
  type SalesFilters,
} from "@/data-access/sales";
import {
  apiOk,
  parseOptionalNumber,
  parsePositiveInt,
  serializeJson,
  withOptionalBearerUser,
} from "@/lib/api/v1/helpers";

function parseFilters(request: NextRequest): SalesFilters {
  const sp = request.nextUrl.searchParams;
  const category = sp.get("category");
  const sellerKind = sp.get("sellerKind");
  const sort = sp.get("sort");

  return {
    category:
      category === "car" || category === "motorcycle" || category === "all"
        ? category
        : "all",
    sellerKind:
      sellerKind === "dealer" ||
      sellerKind === "private" ||
      sellerKind === "all"
        ? sellerKind
        : "all",
    search: sp.get("search") ?? undefined,
    minPrice: parseOptionalNumber(sp.get("minPrice")),
    maxPrice: parseOptionalNumber(sp.get("maxPrice")),
    minYear: parseOptionalNumber(sp.get("minYear")),
    maxYear: parseOptionalNumber(sp.get("maxYear")),
    sort:
      sort === "latest" ||
      sort === "price_asc" ||
      sort === "price_desc" ||
      sort === "year_desc" ||
      sort === "year_asc"
        ? sort
        : "latest",
    page: parsePositiveInt(sp.get("page"), 1),
    pageSize: parsePositiveInt(sp.get("pageSize"), 24),
  };
}

/** GET /api/v1/marketplace/vehicles — public inventory (Bearer optional). */
export async function GET(request: NextRequest) {
  return withOptionalBearerUser(request, async () => {
    const filters = parseFilters(request);
    const [result, bounds] = await Promise.all([
      getPublicSalesVehicles(filters),
      getSalesFilterBounds(),
    ]);
    return apiOk(
      serializeJson({
        ...result,
        bounds,
      })
    );
  });
}
