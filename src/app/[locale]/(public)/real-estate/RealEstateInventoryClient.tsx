"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  DEFAULT_PUBLIC_REAL_ESTATE_PAGE_SIZE,
  PUBLIC_REAL_ESTATE_PAGE_SIZES,
} from "@/lib/public-real-estate-inventory";
import { FeaturedBoostedPropertiesCarousel } from "@/components/real-estate/FeaturedBoostedPropertiesCarousel";
import {
  RealEstateListingCard,
  type PublicSalesPropertyCard,
} from "@/components/real-estate/RealEstateListingCard";

type FilterBounds = {
  minPrice: number;
  maxPrice: number;
  minAreaSqm: number;
  maxAreaSqm: number;
};

type PropertyTypeFilter =
  | "all"
  | "condo"
  | "house"
  | "townhouse"
  | "land"
  | "commercial"
  | "villa";

type RealEstateInventoryClientProps = {
  featuredBoosted?: PublicSalesPropertyCard[];
  properties: PublicSalesPropertyCard[];
  bounds: FilterBounds;
  filters: {
    propertyType: PropertyTypeFilter;
    listingType: "all" | "sale" | "rent";
    sellerKind: "all" | "dealer" | "private";
    search: string;
    province: string;
    minPrice: number;
    maxPrice: number;
    minBedrooms: number;
    minAreaSqm: number;
    sort: "latest" | "price_asc" | "price_desc" | "area_desc" | "area_asc";
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

const PROPERTY_TYPE_OPTIONS: Exclude<PropertyTypeFilter, "all">[] = [
  "condo",
  "house",
  "townhouse",
  "land",
  "commercial",
  "villa",
];

export function RealEstateInventoryClient({
  featuredBoosted = [],
  properties,
  bounds,
  filters,
  pagination,
}: RealEstateInventoryClientProps) {
  const t = useTranslations("realEstate");
  const router = useRouter();
  const pathname = usePathname();

  const hasFilters = useMemo(() => {
    return (
      filters.propertyType !== "all" ||
      filters.listingType !== "all" ||
      filters.sellerKind !== "all" ||
      filters.search.length > 0 ||
      filters.province.length > 0 ||
      filters.minPrice !== bounds.minPrice ||
      filters.maxPrice !== bounds.maxPrice ||
      filters.minBedrooms > 0 ||
      filters.minAreaSqm !== bounds.minAreaSqm
    );
  }, [filters, bounds]);

  const patchSearchParams = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    for (const [key, raw] of Object.entries(updates)) {
      if (raw === undefined || raw === "" || raw === "all" || raw === 0) {
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
        if (!Number.isFinite(n) || n === DEFAULT_PUBLIC_REAL_ESTATE_PAGE_SIZE) {
          params.delete("pageSize");
          continue;
        }
        if (!(PUBLIC_REAL_ESTATE_PAGE_SIZES as readonly number[]).includes(n)) {
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
        <h1 className="text-display-md font-bold text-gray-900 dark:text-gray-100">
          {t("inventoryTitle")}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("inventoryDescription")}</p>
      </div>

      <FeaturedBoostedPropertiesCarousel properties={featuredBoosted} />

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
                <option value="area_desc">{t("sort.areaLargeSmall")}</option>
                <option value="area_asc">{t("sort.areaSmallLarge")}</option>
              </Select>
            </div>
            <div className="flex items-center justify-end">
              {hasFilters ? (
                <Button variant="ghost" onClick={() => router.push(pathname)}>
                  {t("resetFilters")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("listingType.label")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["all", "sale", "rent"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filters.listingType === value ? "default" : "outline"}
                  className={
                    filters.listingType === value
                      ? "bg-siam-blue text-white hover:bg-siam-blue-light"
                      : ""
                  }
                  onClick={() =>
                    patchSearchParams({
                      listing: value === "all" ? "all" : value,
                      page: 1,
                    })
                  }
                >
                  {value === "all" ? t("listingType.all") : t(`listingType.${value}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("propertyType.label")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={filters.propertyType === "all" ? "default" : "outline"}
                className={
                  filters.propertyType === "all"
                    ? "bg-siam-blue text-white hover:bg-siam-blue-light"
                    : ""
                }
                onClick={() => patchSearchParams({ type: "all", page: 1 })}
              >
                {t("propertyType.all")}
              </Button>
              {PROPERTY_TYPE_OPTIONS.map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={filters.propertyType === type ? "default" : "outline"}
                  className={
                    filters.propertyType === type
                      ? "bg-siam-blue text-white hover:bg-siam-blue-light"
                      : ""
                  }
                  onClick={() =>
                    patchSearchParams({
                      type: filters.propertyType === type ? "all" : type,
                      page: 1,
                    })
                  }
                >
                  {t(`propertyType.${type}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("sellerKind.label")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["all", "dealer", "private"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filters.sellerKind === value ? "default" : "outline"}
                  className={
                    filters.sellerKind === value
                      ? "bg-siam-blue text-white hover:bg-siam-blue-light"
                      : ""
                  }
                  onClick={() =>
                    patchSearchParams({
                      seller: value === "all" ? "all" : value,
                      page: 1,
                    })
                  }
                >
                  {value === "all" ? t("sellerKind.all") : t(`sellerKind.${value}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 md:col-span-2">
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

            <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <Labelish label={t("minBedrooms")} />
                <Select
                  value={String(filters.minBedrooms)}
                  onChange={(e) => {
                    patchSearchParams({
                      minBeds: Number(e.currentTarget.value) || undefined,
                      page: 1,
                    });
                  }}
                >
                  <option value="0">{t("any")}</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </Select>
              </div>
              <div>
                <Labelish label={t("province")} />
                <Input
                  defaultValue={filters.province}
                  placeholder={t("provincePlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      patchSearchParams({
                        province: (e.currentTarget as HTMLInputElement).value.trim(),
                        page: 1,
                      });
                    }
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
            <label
              htmlFor="real-estate-inventory-page-size"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {t("perPageLabel")}
            </label>
            <Select
              id="real-estate-inventory-page-size"
              className="h-10 w-[5.5rem] shrink-0"
              value={String(pagination.pageSize)}
              onChange={(e) => {
                patchSearchParams({ pageSize: Number(e.currentTarget.value), page: 1 });
              }}
            >
              {PUBLIC_REAL_ESTATE_PAGE_SIZES.map((n) => (
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
        {properties.map((property) => (
          <RealEstateListingCard key={property.id} property={property} />
        ))}
      </div>

      {properties.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-gray-100">{t("emptyStateTitle")}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("emptyStateBody")}</p>
        </div>
      ) : null}

      {pagination.totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-sm text-gray-500">
            {t("pagination.pageInfo", {
              page: pagination.page,
              totalPages: pagination.totalPages,
            })}
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

function Labelish({ label }: { label: string }) {
  return (
    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </p>
  );
}
