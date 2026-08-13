"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { VEHICLE_FINDER_SERVICE_SLUG } from "@/config/vehicle-intake";

/** Same vehicle intake as the public quick link — used from the booking wizard. */
export function VehicleWizardBanner({ serviceSlug }: { serviceSlug: string }) {
  const t = useTranslations("vehicleIntake");
  if (serviceSlug !== VEHICLE_FINDER_SERVICE_SLUG) return null;
  return (
    <div className="mb-6 rounded-2xl border border-siam-blue/30 bg-siam-blue/5 p-4">
      <p className="font-semibold text-foreground">{t("wizardBannerTitle")}</p>
      <p className="mt-1 text-sm text-muted">{t("wizardBannerBody")}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg" className="flex-1">
          <Link href="/vehicle/sell?source=booking_wizard">{t("wizardSell")}</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href="/vehicle/buy?source=booking_wizard">{t("wizardBuy")}</Link>
        </Button>
      </div>
    </div>
  );
}
