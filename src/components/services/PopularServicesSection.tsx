"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import type { EnrichedService } from "@/lib/service-display";

interface PopularServicesSectionProps {
  services: EnrichedService[];
  title: string;
  subtitle: string;
  fromLabel: string;
  getBookHref: (slug: string) => string;
  bookNowLabel: string;
}

export function PopularServicesSection({
  services,
  title,
  subtitle,
  fromLabel,
  getBookHref,
  bookNowLabel,
}: PopularServicesSectionProps) {
  if (!services.length) return null;

  return (
    <section className="border-b border-gray-200 bg-gradient-to-b from-siam-blue/5 to-transparent py-10 dark:border-gray-800 sm:py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
        <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-5">
          {services.map((service) => (
            <article
              key={service.slug}
              className="flex w-[min(280px,78vw)] shrink-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-card sm:w-auto"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${service.iconBg} ${service.iconText}`}
                >
                  <service.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-tight text-card-foreground">
                    <Link
                      href={`/services/${service.slug}`}
                      className="hover:text-siam-blue"
                      onClick={() =>
                        trackEvent("service_details_click", { slug: service.slug, source: "popular" })
                      }
                    >
                      {service.name}
                    </Link>
                  </h3>
                  {service.processingTime && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden />
                      {service.processingTime}
                    </p>
                  )}
                </div>
              </div>
              {service.priceAmount != null && (
                <p className="mt-3 text-sm font-medium text-siam-blue">
                  {fromLabel} {formatCurrency(service.priceAmount, service.priceCurrency ?? "THB")}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Link
                  href={getBookHref(service.slug)}
                  className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg bg-siam-blue px-3 text-xs font-semibold text-white hover:bg-siam-blue-light"
                  onClick={() =>
                    trackEvent("service_book_click", { slug: service.slug, source: "popular" })
                  }
                >
                  {bookNowLabel}
                </Link>
                <Link
                  href={`/services/${service.slug}`}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-label={`View ${service.name} details`}
                  onClick={() =>
                    trackEvent("service_details_click", { slug: service.slug, source: "popular_arrow" })
                  }
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
