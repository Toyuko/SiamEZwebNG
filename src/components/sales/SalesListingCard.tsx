"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type PublicSalesVehicleCard = {
  id: string;
  heroImageUrl: string;
  priceAmount: number;
  priceCurrency: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  category: "car" | "motorcycle";
  status: "available" | "reserved" | "sold" | "pending_boost";
  sellerKind: "dealer" | "private";
  /** Raw DB flag; prefer `boostActive` for UI (false when boost expired). */
  isBoosted?: boolean;
  boostActive?: boolean;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount
  );
}

type SalesListingCardProps = {
  vehicle: PublicSalesVehicleCard;
};

export function SalesListingCard({ vehicle }: SalesListingCardProps) {
  const t = useTranslations("sales");
  const boosted = Boolean(vehicle.boostActive ?? vehicle.isBoosted);

  return (
    <Link href={`/sales/${vehicle.id}`} className="group block h-full">
      <Card
        className={cn(
          "h-full overflow-hidden transition-shadow hover:shadow-lg",
          boosted &&
            "ring-2 ring-yellow-500 ring-offset-2 ring-offset-background dark:ring-offset-gray-950 shadow-md"
        )}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={vehicle.heroImageUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
          {boosted ? (
            <span className="absolute right-2 top-2 rounded-md bg-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-900 shadow-sm">
              {t("featuredBadge")}
            </span>
          ) : null}
          {vehicle.sellerKind === "dealer" ? (
            <span className="absolute left-2 top-2 rounded-md bg-siam-blue/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              {t("sellerKind.dealerChip")}
            </span>
          ) : null}
        </div>
        <CardContent className="p-4">
          <p className="text-lg font-bold text-siam-blue dark:text-siam-blue-light">
            {vehicle.priceAmount <= 0
              ? t("priceContactSeller")
              : formatPrice(vehicle.priceAmount, vehicle.priceCurrency)}
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
  );
}
