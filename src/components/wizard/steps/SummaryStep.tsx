"use client";

import type { Service } from "@prisma/client";
import { useTranslations } from "next-intl";
import { DriverLicensePriceGuide } from "@/components/sections/DriverLicensePriceGuide";
import { formatCurrency } from "@/lib/utils";

interface SummaryStepProps {
  service: Service;
  serviceSlug?: string;
  description?: string;
}

export function SummaryStep({ service, serviceSlug, description }: SummaryStepProps) {
  const tPriceGuide = useTranslations("driverLicensePage");
  const priceAmount = service.priceAmount;
  const priceCurrency = service.priceCurrency ?? "THB";
  const isFixed = service.type === "fixed";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Service summary</h2>
      {description ? (
        <p className="text-sm text-muted">{description}</p>
      ) : null}
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="font-medium text-foreground">{service.name}</p>
        {service.shortDescription ? (
          <p className="mt-1 text-sm text-muted">{service.shortDescription}</p>
        ) : null}
        <div className="mt-4 flex items-center gap-2">
          {isFixed && priceAmount != null ? (
            <span className="text-lg font-semibold text-siam-blue">
              {formatCurrency(priceAmount, priceCurrency)}
            </span>
          ) : (
            <span className="text-sm text-muted">
              Quote-based — we&apos;ll send you a quote after review
            </span>
          )}
        </div>
      </div>
      {serviceSlug === "driver-license" ? (
        <DriverLicensePriceGuide
          title={tPriceGuide("priceGuideTitle")}
          sections={tPriceGuide.raw("priceGuideSections") as Array<{
            title: string;
            rows: Array<{ label: string; price: string }>;
          }>}
          additionalTitle={tPriceGuide("priceGuideAdditionalTitle")}
          additionalRows={
            tPriceGuide.raw("priceGuideAdditionalRows") as Array<{ label: string; price: string }>
          }
          compact
        />
      ) : null}
    </div>
  );
}
