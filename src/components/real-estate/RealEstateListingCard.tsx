"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type PublicSalesPropertyCard = {
  id: string;
  title: string;
  heroImageUrl: string;
  priceAmount: number;
  priceCurrency: string;
  propertyType: "condo" | "house" | "townhouse" | "land" | "commercial" | "villa";
  listingType: "sale" | "rent";
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number;
  province: string;
  district: string | null;
  status: "available" | "reserved" | "sold" | "pending_boost";
  sellerKind: "dealer" | "private";
  isBoosted?: boolean;
  boostActive?: boolean;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount
  );
}

type RealEstateListingCardProps = {
  property: PublicSalesPropertyCard;
};

export function RealEstateListingCard({ property }: RealEstateListingCardProps) {
  const t = useTranslations("realEstate");
  const boosted = Boolean(property.boostActive ?? property.isBoosted);
  const location = [property.district, property.province].filter(Boolean).join(", ");

  return (
    <Link href={`/real-estate/${property.id}`} className="group block h-full">
      <Card
        className={cn(
          "h-full overflow-hidden transition-shadow hover:shadow-lg",
          boosted &&
            "ring-2 ring-yellow-500 ring-offset-2 ring-offset-background dark:ring-offset-gray-950 shadow-md"
        )}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={property.heroImageUrl}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
          {boosted ? (
            <span className="absolute right-2 top-2 rounded-md bg-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-900 shadow-sm">
              {t("featuredBadge")}
            </span>
          ) : null}
          <span className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            {t(`listingType.${property.listingType}`)}
          </span>
          {property.sellerKind === "dealer" ? (
            <span className="absolute left-2 bottom-2 rounded-md bg-siam-blue/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              {t("sellerKind.dealerChip")}
            </span>
          ) : null}
        </div>
        <CardContent className="p-4">
          <p className="text-lg font-bold text-siam-blue dark:text-siam-blue-light">
            {property.priceAmount <= 0
              ? t("priceContactSeller")
              : formatPrice(property.priceAmount, property.priceCurrency)}
            {property.listingType === "rent" && property.priceAmount > 0 ? (
              <span className="text-sm font-medium text-gray-500"> {t("perMonth")}</span>
            ) : null}
          </p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {property.title}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t(`propertyType.${property.propertyType}`)}
            {location ? ` · ${location}` : ""}
          </p>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {property.bedrooms != null
                ? t("bedsShort", { count: property.bedrooms })
                : t("bedsNa")}
              {" · "}
              {property.bathrooms != null
                ? t("bathsShort", { count: property.bathrooms })
                : t("bathsNa")}
            </span>
            <span>{property.areaSqm.toLocaleString()} m²</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
