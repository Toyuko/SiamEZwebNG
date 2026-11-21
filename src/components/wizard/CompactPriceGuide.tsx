"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { DriverLicensePriceGuide } from "@/components/sections/DriverLicensePriceGuide";
import { cn } from "@/lib/utils";

/** Collapsed-by-default price guide for the service step — avoids a wall of pricing before booking. */
export function CompactPriceGuide() {
  const t = useTranslations("driverLicensePage");
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-[#DCE6F5] bg-siam-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-siam-ink">Quick price guide</p>
          <p className="text-xs text-[#64748B]">Optional — your quote is calculated from your answers</p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-siam-blue transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-[#DCE6F5] px-4 py-4">
          <DriverLicensePriceGuide
            title={t("priceGuideTitle")}
            sections={
              t.raw("priceGuideSections") as Array<{
                title: string;
                rows: Array<{ label: string; price: string }>;
              }>
            }
            additionalTitle={t("priceGuideAdditionalTitle")}
            additionalRows={
              t.raw("priceGuideAdditionalRows") as Array<{ label: string; price: string }>
            }
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
