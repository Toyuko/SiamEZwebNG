"use client";

import Image from "next/image";
import { useMemo } from "react";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useTranslations } from "next-intl";

type VehicleCard = {
  id: string;
  heroImageUrl: string;
  priceAmount: number;
  priceCurrency: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  category: "car" | "motorcycle";
  status: "available" | "reserved" | "sold";
};

type FilterBounds = {
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
};

type SalesInventoryClientProps = {
  vehicles: VehicleCard[];
  bounds: FilterBounds;
  filters: {
    category: "all" | "car" | "motorcycle";
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
  };
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount
  );
}

export function SalesInventoryClient({ vehicles, bounds, filters, pagination }: SalesInventoryClientProps) {
  const t = useTranslations("sales");
  const router = useRouter();
  const pathname = usePathname();

  const hasFilters = useMemo(() => {
    return (
      filters.category !== "all" ||
      filters.search.length > 0 ||
      filters.minPrice !== bounds.minPrice ||
      filters.maxPrice !== bounds.maxPrice ||
      filters.minYear !== bounds.minYear ||
      filters.maxYear !== bounds.maxYear
    );
  }, [filters, bounds]);

  const setParam = (key: string, value: string | number | undefined) => {
    const params = new URLSearchParams(window.location.search);
    if (value === undefined || value === "" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
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

      <Card>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input
                defaultValue={filters.search}
                placeholder={t("searchPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setParam("search", (e.currentTarget as HTMLInputElement).value.trim());
                    setParam("page", 1);
                  }
                }}
              />
            </div>
            <div>
              <Select
                value={filters.sort}
                onChange={(e) => {
                  setParam("sort", e.currentTarget.value);
                  setParam("page", 1);
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
                  setParam("category", filters.category === "car" ? "all" : "car");
                  setParam("page", 1);
                }}
              >
                {t("category.cars")}
              </Button>
              <Button
                type="button"
                variant={filters.category === "motorcycle" ? "default" : "outline"}
                className="w-full"
                onClick={() => {
                  setParam("category", filters.category === "motorcycle" ? "all" : "motorcycle");
                  setParam("page", 1);
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
                    setParam("minPrice", Number(e.currentTarget.value));
                    setParam("page", 1);
                  }}
                />
                <Input
                  type="range"
                  min={bounds.minPrice}
                  max={bounds.maxPrice}
                  value={filters.maxPrice}
                  onChange={(e) => {
                    setParam("maxPrice", Number(e.currentTarget.value));
                    setParam("page", 1);
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
                    setParam("minYear", Number(e.currentTarget.value));
                    setParam("page", 1);
                  }}
                />
                <Input
                  type="range"
                  min={bounds.minYear}
                  max={bounds.maxYear}
                  value={filters.maxYear}
                  onChange={(e) => {
                    setParam("maxYear", Number(e.currentTarget.value));
                    setParam("page", 1);
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {vehicles.map((vehicle) => (
          <Link key={vehicle.id} href={`/sales/${vehicle.id}`} className="group">
            <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={vehicle.heroImageUrl}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <CardContent className="p-4">
                <p className="text-lg font-bold text-siam-blue dark:text-siam-blue-light">
                  {formatPrice(vehicle.priceAmount, vehicle.priceCurrency)}
                </p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                  {vehicle.make} {vehicle.model}
                </p>
                <div className="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{vehicle.year}</span>
                  <span>{vehicle.mileageKm.toLocaleString()} km</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {vehicles.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">{t("emptyState")}</div>
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
