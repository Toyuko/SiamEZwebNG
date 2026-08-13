"use client";

import { Link } from "@/i18n/navigation";
import { Car, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { trackVehicleEvent } from "@/components/vehicle-intake/useVehicleLeadSource";
import { useEffect } from "react";

export function VehicleHub({ locale }: { locale: string }) {
  const t = useTranslations("vehicleIntake");

  useEffect(() => {
    trackVehicleEvent("vehicle_form_opened", { page: "hub" }, locale);
  }, [locale]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href="/vehicle/sell"
        className="block rounded-2xl border-2 border-border bg-card p-6 shadow-sm transition hover:border-siam-blue hover:shadow-md"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-siam-blue/10 text-siam-blue">
            <Car className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t("sellTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("sellBlurb")}</p>
          </div>
        </div>
      </Link>
      <Link
        href="/vehicle/buy"
        className="block rounded-2xl border-2 border-border bg-card p-6 shadow-sm transition hover:border-siam-blue hover:shadow-md"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-siam-yellow/30 text-siam-blue-dark">
            <Search className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t("buyTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("buyBlurb")}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
