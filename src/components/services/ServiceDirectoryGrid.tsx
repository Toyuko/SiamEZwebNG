"use client";

import { useEffect, useMemo, useRef } from "react";
import { ServiceCard } from "@/components/sections/ServiceCard";
import { ServiceEmptyState } from "@/components/services/ServiceEmptyState";
import { ServiceCategoryChips } from "@/components/services/ServiceCategoryChips";
import { useServiceFuseSearch } from "@/hooks/useServiceFuseSearch";
import {
  filterByCategory,
  sortServices,
  type EnrichedService,
  type ServiceSortKey,
} from "@/lib/service-display";
import { trackEvent } from "@/lib/analytics";
import { getServiceIcon } from "@/lib/service-icons";
import type { ServiceBadgeKey } from "@/config/service-catalog";
interface ServiceDirectoryGridProps {
  services: EnrichedService[];
  searchQuery: string;
  activeCategory: string;
  onCategoryChange: (key: string) => void;
  sortKey: ServiceSortKey;
  onSortChange: (key: ServiceSortKey) => void;
  categoryOptions: { key: string; label: string }[];
  allCategoryLabel: string;
  sortOptions: { key: ServiceSortKey; label: string }[];
  sortLabel: string;
  resultsCountLabel: string;
  noResultsTitle: string;
  noResultsDescription: string;
  lineCta: string;
  bookNowLabel: string;
  detailsLabel: string;
  priceLabel: string;
  lineLabel: string;
  processingTimeLabel: string;
  requirementsLabel: string;
  badgeLabels: Record<ServiceBadgeKey, string>;
  journeyTitle: string;
  journeySteps: string[];
  isLoggedIn: boolean;
  locale: string;
}

export function ServiceDirectoryGrid({
  services,
  searchQuery,
  activeCategory,
  onCategoryChange,
  sortKey,
  onSortChange,
  categoryOptions,
  allCategoryLabel,
  sortOptions,
  sortLabel,
  resultsCountLabel,
  noResultsTitle,
  noResultsDescription,
  lineCta,
  bookNowLabel,
  detailsLabel,
  priceLabel,
  lineLabel,
  processingTimeLabel,
  requirementsLabel,
  badgeLabels,
  journeyTitle,
  journeySteps,
  isLoggedIn,
  locale,
}: ServiceDirectoryGridProps) {
  const viewedSlugs = useRef(new Set<string>());
  const categoryLabels = useMemo(
    () => Object.fromEntries(categoryOptions.map((c) => [c.key, c.label])),
    [categoryOptions]
  );

  const fuseResults = useServiceFuseSearch(services, searchQuery, categoryLabels);

  const filtered = useMemo(() => {
    const byCategory = filterByCategory(fuseResults, activeCategory);
    return sortServices(byCategory, sortKey);
  }, [fuseResults, activeCategory, sortKey]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 2) {
      trackEvent("service_search", { query: q, results: filtered.length });
    }
  }, [searchQuery, filtered.length]);

  useEffect(() => {
    for (const service of filtered) {
      if (!viewedSlugs.current.has(service.slug)) {
        viewedSlugs.current.add(service.slug);
        trackEvent("service_card_view", { slug: service.slug });
      }
    }
  }, [filtered]);

  const getBookHref = (slug: string) =>
    isLoggedIn ? `/book/${slug}` : `/login?redirect=/${locale}/book/${slug}`;

  const countText = resultsCountLabel.replace("{count}", String(filtered.length));

  return (
    <div className="space-y-6">
      <ServiceCategoryChips
        categories={categoryOptions}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
        allLabel={allCategoryLabel}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{countText}</p>
        <div className="flex items-center gap-2">
          <label htmlFor="service-sort" className="text-sm font-medium text-foreground">
            {sortLabel}
          </label>
          <select
            id="service-sort"
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as ServiceSortKey)}
            className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          >
            {sortOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer journey */}
      <div className="rounded-xl border border-siam-blue/20 bg-siam-blue/5 p-4 dark:border-siam-blue/30 dark:bg-siam-blue/10">
        <p className="text-sm font-semibold text-siam-blue">{journeyTitle}</p>
        <ol className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
          {journeySteps.map((step, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className="font-medium text-foreground">{i + 1}.</span>
              {step}
              {i < journeySteps.length - 1 && (
                <span className="mx-1 text-gray-400" aria-hidden>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {filtered.length === 0 ? (
        <ServiceEmptyState
          title={noResultsTitle}
          description={noResultsDescription}
          lineCta={lineCta}
          query={searchQuery.trim() || undefined}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard
              key={service.slug}
              slug={service.slug}
              name={service.name}
              description={service.shortDescription ?? ""}
              thumbnailImage={service.thumbnailImage}
              Icon={getServiceIcon(service.iconName)}
              iconBg={service.iconBg}
              iconText={service.iconText}
              iconShape={service.iconShape}
              priceAmount={service.priceAmount}
              priceCurrency={service.priceCurrency}
              priceLabel={priceLabel}
              processingTime={service.processingTime}
              processingTimeLabel={processingTimeLabel}
              requirementsSummary={service.requirementsSummary}
              requirementsLabel={requirementsLabel}
              badges={service.badges as ServiceBadgeKey[]}
              badgeLabels={badgeLabels}
              bookNowLabel={bookNowLabel}
              detailsLabel={detailsLabel}
              lineLabel={lineLabel}
              getBookHref={getBookHref}
              onBookClick={() =>
                trackEvent("service_book_click", { slug: service.slug, source: "card" })
              }
              onDetailsClick={() =>
                trackEvent("service_details_click", { slug: service.slug, source: "card" })
              }
              onLineClick={() =>
                trackEvent("service_line_click", { slug: service.slug, source: "card" })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
