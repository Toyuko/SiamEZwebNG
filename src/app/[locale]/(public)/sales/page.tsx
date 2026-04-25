import { setRequestLocale } from "next-intl/server";
import { getPublicSalesVehicles, getSalesFilterBounds } from "@/data-access/sales";
import { SalesInventoryClient } from "./SalesInventoryClient";

export const dynamic = "force-dynamic";

function parseIntParam(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  const minPrice = Math.max(bounds.minPrice, parseIntParam(typeof sp.minPrice === "string" ? sp.minPrice : undefined, bounds.minPrice));
  const maxPrice = Math.min(bounds.maxPrice, parseIntParam(typeof sp.maxPrice === "string" ? sp.maxPrice : undefined, bounds.maxPrice));
  const minYear = Math.max(bounds.minYear, parseIntParam(typeof sp.minYear === "string" ? sp.minYear : undefined, bounds.minYear));
  const maxYear = Math.min(bounds.maxYear, parseIntParam(typeof sp.maxYear === "string" ? sp.maxYear : undefined, bounds.maxYear));

  const result = await getPublicSalesVehicles({
    category,
    search,
    minPrice: Math.min(minPrice, maxPrice),
    maxPrice: Math.max(minPrice, maxPrice),
    minYear: Math.min(minYear, maxYear),
    maxYear: Math.max(minYear, maxYear),
    sort,
    page,
    pageSize: 9,
  });

  return (
    <SalesInventoryClient
      vehicles={result.items}
      bounds={bounds}
      pagination={{
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      }}
      filters={{
        category,
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
