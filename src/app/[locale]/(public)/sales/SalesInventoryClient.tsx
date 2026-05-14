"use client";

import { useMemo } from "react";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { DEFAULT_PUBLIC_SALES_PAGE_SIZE, PUBLIC_SALES_PAGE_SIZES } from "@/lib/public-sales-inventory";
import { FeaturedBoostedCarousel } from "@/components/sales/FeaturedBoostedCarousel";
import { SalesListingCard, type PublicSalesVehicleCard } from "@/components/sales/SalesListingCard";

type FilterBounds = {
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
};

type SalesInventoryClientProps = {
  featuredBoosted?: PublicSalesVehicleCard[];
  vehicles: PublicSalesVehicleCard[];
  bounds: FilterBounds;
  filters: {
    category: "all" | "car" | "motorcycle";
    sellerKind: "all" | "dealer" | "private";
    search: string;
    minPrice: number;
    maxPrice: number;
    minYear: number;
    maxYear: number;
    sort: "latest" | "price_asc" | "price_desc" | "year_desc" | "year_asc";
  };
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
  };
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount
  );
}

export function SalesInventoryClient({
  featuredBoosted = [],
  vehicles,
  bounds,
  filters,
  pagination,
}: SalesInventoryClientProps) {
  const t = useTranslations("sales");
  const router = useRouter();
  const pathname = usePathname();

  const hasFilters = useMemo(() => {
    return (
      filters.category !== "all" ||
      filters.sellerKind !== "all" ||
      filters.search.length > 0 ||
      filters.minPrice !== bounds.minPrice ||
      filters.maxPrice !== bounds.maxPrice ||
      filters.minYear !== bounds.minYear ||
      filters.maxYear !== bounds.maxYear
    );
  }, [filters, bounds]);

  /** Apply several query changes in one navigation (sequential setParam calls would read stale `location` and drop prior updates). */
  const patchSearchParams = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    for (const [key, raw] of Object.entries(updates)) {
      if (raw === undefined || raw === "" || raw === "all") {
        params.delete(key);
        continue;
      }
      if (key === "page") {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (Number.isFinite(n) && n <= 1) {
          params.delete("page");
          continue;
        }
      }
      if (key === "pageSize") {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(n) || n === DEFAULT_PUBLIC_SALES_PAGE_SIZE) {
          params.delete("pageSize");
          continue;
        }
        if (!(PUBLIC_SALES_PAGE_SIZES as readonly number[]).includes(n)) {
          params.delete("pageSize");
          continue;
        }
        params.set("pageSize", String(n));
        continue;
      }
      params.set(key, String(raw));
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(window.location.search);
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-6">
        <h1 className="text-display-md font-bold text-gray-900 dark:text-gray-100">{t("inventoryTitle")}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t("inventoryDescription")}
        </p>
      </div>

      <FeaturedBoostedCarousel vehicles={featuredBoosted} />

      <div className="mb-6 rounded-xl border border-siam-blue/25 bg-siam-blue/[0.06] p-4 dark:bg-siam-blue/10">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("finderPromoTitle")}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("finderPromoBody")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" className="bg-siam-blue text-white hover:bg-siam-blue-light">
            <Link href="/book/car-motorbike-finder-selling-service">{t("finderBookFinder")}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="border-siam-blue text-siam-blue hover:bg-siam-blue/10">
            <Link href="/services/car-motorbike-finder-selling-service">{t("finderServiceDetails")}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input
                defaultValue={filters.search}
                placeholder={t("searchPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    patchSearchParams({
                      search: (e.currentTarget as HTMLInputElement).value.trim(),
                      page: 1,
                    });
                  }
                }}
              />
            </div>
            <div>
              <Select
                value={filters.sort}
                onChange={(e) => {
                  patchSearchParams({ sort: e.currentTarget.value, page: 1 });
                }}
              >
                <option value="latest">{t("sort.latest")}</option>
                <option value="price_asc">{t("sort.priceLowHigh")}</option>
                <option value="price_desc">{t("sort.priceHighLow")}</option>
                <option value="year_desc">{t("sort.yearNewOld")}</option>
                <option value="year_asc">{t("sort.yearOldNew")}</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={filters.category === "car" ? "default" : "outline"}
                className="w-full"
                onClick={() => {
                  patchSearchParams({
                    category: filters.category === "car" ? "all" : "car",
                    page: 1,
                  });
                }}
              >
                {t("category.cars")}
              </Button>
              <Button
                type="button"
                variant={filters.category === "motorcycle" ? "default" : "outline"}
                className="w-full"
                onClick={() => {
                  patchSearchParams({
                    category: filters.category === "motorcycle" ? "all" : "motorcycle",
                    page: 1,
                  });
                }}
              >
                {t("category.motorcycles")}
              </Button>
            </div>
            <div className="flex items-center justify-end">
              {hasFilters ? (
                <Button variant="ghost" onClick={() => router.push(pathname)}>{t("resetFilters")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("sellerKind.label")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={filters.sellerKind === "all" ? "default" : "outline"}
                className={filters.sellerKind === "all" ? "bg-siam-blue text-white hover:bg-siam-blue-light" : ""}
                onClick={() => patchSearchParams({ seller: "all", page: 1 })}
              >
                {t("sellerKind.all")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filters.sellerKind === "dealer" ? "default" : "outline"}
                className={filters.sellerKind === "dealer" ? "bg-siam-blue text-white hover:bg-siam-blue-light" : ""}
                onClick={() =>
                  patchSearchParams({
                    seller: filters.sellerKind === "dealer" ? "all" : "dealer",
                    page: 1,
                  })
                }
              >
                {t("sellerKind.dealer")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={filters.sellerKind === "private" ? "default" : "outline"}
                className={filters.sellerKind === "private" ? "bg-siam-blue text-white hover:bg-siam-blue-light" : ""}
                onClick={() =>
                  patchSearchParams({
                    seller: filters.sellerKind === "private" ? "all" : "private",
                    page: 1,
                  })
                }
              >
                {t("sellerKind.private")}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{t("priceRange")}</span>
                <span className="text-gray-500">
                  {formatPrice(filters.minPrice, "THB")} - {formatPrice(filters.maxPrice, "THB")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="range"
                  min={bounds.minPrice}
                  max={bounds.maxPrice}
                  value={filters.minPrice}
                  onChange={(e) => {
                    patchSearchParams({ minPrice: Number(e.currentTarget.value), page: 1 });
                  }}
                />
                <Input
                  type="range"
                  min={bounds.minPrice}
                  max={bounds.maxPrice}
                  value={filters.maxPrice}
                  onChange={(e) => {
                    patchSearchParams({ maxPrice: Number(e.currentTarget.value), page: 1 });
                  }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{t("yearRange")}</span>
                <span className="text-gray-500">
                  {filters.minYear} - {filters.maxYear}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="range"
                  min={bounds.minYear}
                  max={bounds.maxYear}
                  value={filters.minYear}
                  onChange={(e) => {
                    patchSearchParams({ minYear: Number(e.currentTarget.value), page: 1 });
                  }}
                />
                <Input
                  type="range"
                  min={bounds.minYear}
                  max={bounds.maxYear}
                  value={filters.maxYear}
                  onChange={(e) => {
                    patchSearchParams({ maxYear: Number(e.currentTarget.value), page: 1 });
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {pagination.total > 0 ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("pagination.showingRange", {
              from: (pagination.page - 1) * pagination.pageSize + 1,
              to: Math.min(pagination.page * pagination.pageSize, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-2 sm:justify-end">
            <label htmlFor="sales-inventory-page-size" className="text-sm text-gray-600 dark:text-gray-400">
              {t("perPageLabel")}
            </label>
            <Select
              id="sales-inventory-page-size"
              className="h-10 w-[5.5rem] shrink-0"
              value={String(pagination.pageSize)}
              onChange={(e) => {
                patchSearchParams({ pageSize: Number(e.currentTarget.value), page: 1 });
              }}
            >
              {PUBLIC_SALES_PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : null}

      <div
        className={
          pagination.total > 0
            ? "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            : "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        }
      >
        {vehicles.map((vehicle) => (
          <SalesListingCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>

      {vehicles.length === 0 ? (
        <div className="mt-8 space-y-4 rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-gray-100">{t("emptyStateFinderTitle")}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("emptyStateFinderBody")}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild size="sm" className="bg-siam-blue text-white hover:bg-siam-blue-light">
              <Link href="/book/car-motorbike-finder-selling-service">{t("finderBookFinder")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/services/car-motorbike-finder-selling-service">{t("finderServiceDetails")}</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {pagination.totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button variant="outline" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>
            {t("pagination.previous")}
          </Button>
          <span className="text-sm text-gray-500">
            {t("pagination.pageInfo", { page: pagination.page, totalPages: pagination.totalPages })}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
          >
            {t("pagination.next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
