"use client";

import { useTranslations } from "next-intl";
import { SalesListingCard, type PublicSalesVehicleCard } from "./SalesListingCard";

type FeaturedBoostedCarouselProps = {
  vehicles: PublicSalesVehicleCard[];
};

export function FeaturedBoostedCarousel({ vehicles }: FeaturedBoostedCarouselProps) {
  const t = useTranslations("sales");

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <section className="mb-8" aria-labelledby="featured-boosted-heading">
      <div className="mb-4">
        <h2 id="featured-boosted-heading" className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t("featuredTitle")}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("featuredSubtitle")}</p>
      </div>
      <div
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 pt-1 scroll-smooth snap-x snap-mandatory md:mx-0 md:px-0"
        tabIndex={0}
        aria-label={t("featuredCarouselAria")}
      >
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="w-[min(100%,300px)] shrink-0 snap-start">
            <SalesListingCard vehicle={vehicle} />
          </div>
        ))}
      </div>
    </section>
  );
}
