"use client";

import { useTranslations } from "next-intl";
import { RealEstateListingCard, type PublicSalesPropertyCard } from "./RealEstateListingCard";

type FeaturedBoostedPropertiesCarouselProps = {
  properties: PublicSalesPropertyCard[];
};

export function FeaturedBoostedPropertiesCarousel({
  properties,
}: FeaturedBoostedPropertiesCarouselProps) {
  const t = useTranslations("realEstate");

  if (properties.length === 0) {
    return null;
  }

  return (
    <section className="mb-8" aria-labelledby="featured-boosted-properties-heading">
      <div className="mb-4">
        <h2
          id="featured-boosted-properties-heading"
          className="text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          {t("featuredTitle")}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("featuredSubtitle")}</p>
      </div>
      <div
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 pt-1 scroll-smooth snap-x snap-mandatory md:mx-0 md:px-0"
        tabIndex={0}
        aria-label={t("featuredCarouselAria")}
      >
        {properties.map((property) => (
          <div key={property.id} className="w-[min(100%,300px)] shrink-0 snap-start">
            <RealEstateListingCard property={property} />
          </div>
        ))}
      </div>
    </section>
  );
}
