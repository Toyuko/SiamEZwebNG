"use client";

import { useMemo, useState } from "react";
import { ServicesHero } from "@/components/sections/ServicesHero";
import { WhatsAppFloat } from "@/components/sections/WhatsAppFloat";
import {
  ServiceCommandPalette,
  type ServiceCommandPaletteLabels,
} from "@/components/services/ServiceCommandPalette";
import type { ServiceSearchBarLabels } from "@/components/services/ServiceSearchBar";
import { PopularServicesSection } from "@/components/services/PopularServicesSection";
import { ServiceDirectoryGrid } from "@/components/services/ServiceDirectoryGrid";
import { ServiceTrustSection, trustIcons } from "@/components/services/ServiceTrustSection";
import { ServicesStickyBar } from "@/components/services/ServicesStickyBar";
import type { EnrichedService, ServiceSortKey } from "@/lib/service-display";
import { popularServiceSlugs } from "@/config/service-catalog";
import type { ServiceBadgeKey } from "@/config/service-catalog";

export type ServicesSearchLabels = ServiceCommandPaletteLabels;

export interface ServicesDirectoryLabels {
  popularTitle: string;
  popularSubtitle: string;
  allCategory: string;
  sortLabel: string;
  resultsCount: string;
  noResultsTitle: string;
  noResultsDescription: string;
  lineCta: string;
  lineShortcut: string;
  processingTime: string;
  requirements: string;
  journeyTitle: string;
  journeySteps: string[];
  trustTitle: string;
  trustSubtitle: string;
  trustItems: { title: string; text: string }[];
  directoryCategories: Record<string, string>;
  sortOptions: Record<ServiceSortKey, string>;
  badges: Record<ServiceBadgeKey, string>;
}

interface ServicesPageClientProps {
  services: EnrichedService[];
  title: string;
  description: string;
  searchPlaceholder: string;
  searchButtonText: string;
  bookNowLabel: string;
  detailsLabel: string;
  priceLabel: string;
  searchLabels: ServicesSearchLabels;
  directoryLabels: ServicesDirectoryLabels;
  isLoggedIn?: boolean;
  locale?: string;
}

export function ServicesPageClient({
  services,
  title,
  description,
  searchPlaceholder,
  searchButtonText,
  bookNowLabel,
  detailsLabel,
  priceLabel,
  searchLabels,
  directoryLabels,
  isLoggedIn = true,
  locale = "en",
}: ServicesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortKey, setSortKey] = useState<ServiceSortKey>("popular");

  const voiceLang = locale === "th" ? "th-TH" : "en-US";

  const popularServices = useMemo(
    () =>
      popularServiceSlugs
        .map((slug) => services.find((s) => s.slug === slug))
        .filter((s): s is EnrichedService => !!s),
    [services]
  );

  const categoryOptions = useMemo(
    () =>
      Object.entries(directoryLabels.directoryCategories).map(([key, label]) => ({
        key,
        label,
      })),
    [directoryLabels.directoryCategories]
  );

  const sortOptions = useMemo(
    () =>
      (Object.entries(directoryLabels.sortOptions) as [ServiceSortKey, string][]).map(
        ([key, label]) => ({ key, label })
      ),
    [directoryLabels.sortOptions]
  );

  const getBookHref = (slug: string) =>
    isLoggedIn ? `/book/${slug}` : `/login?redirect=/${locale}/book/${slug}`;

  const barLabels = useMemo(
    (): ServiceSearchBarLabels => ({
      searchButton: searchButtonText,
      listening: searchLabels.listening,
      voiceUnsupported: searchLabels.voiceUnsupported,
      voicePermissionDenied: searchLabels.voicePermissionDenied,
      voiceNoSpeech: searchLabels.voiceNoSpeech,
      voiceError: searchLabels.voiceError,
      voiceSearchAria: searchLabels.voiceSearchAria,
    }),
    [searchButtonText, searchLabels]
  );

  const trustItems = directoryLabels.trustItems.map((item, i) => {
    const icons = [
      trustIcons.fast,
      trustIcons.reliable,
      trustIcons.transparent,
      trustIcons.bilingual,
      trustIcons.experience,
      trustIcons.line,
    ];
    return { ...item, icon: icons[i] ?? trustIcons.fast };
  });

  const categoryLabelsForPalette = useMemo(
    () => directoryLabels.directoryCategories,
    [directoryLabels.directoryCategories]
  );

  return (
    <>
      <ServicesHero
        title={title}
        description={description}
        searchPlaceholder={searchPlaceholder}
        searchButtonText={searchButtonText}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSearchPalette={() => setPaletteOpen(true)}
        voiceLang={voiceLang}
        searchLabels={barLabels}
      />

      <PopularServicesSection
        services={popularServices}
        title={directoryLabels.popularTitle}
        subtitle={directoryLabels.popularSubtitle}
        fromLabel={priceLabel}
        getBookHref={getBookHref}
        bookNowLabel={bookNowLabel}
      />

      <section
        id="services-section"
        className="container mx-auto px-4 py-10 pb-24 sm:py-14 sm:pb-16 lg:py-16 lg:pb-20"
      >
        <ServiceDirectoryGrid
          services={services}
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          sortKey={sortKey}
          onSortChange={setSortKey}
          categoryOptions={categoryOptions}
          allCategoryLabel={directoryLabels.allCategory}
          sortOptions={sortOptions}
          sortLabel={directoryLabels.sortLabel}
          resultsCountLabel={directoryLabels.resultsCount}
          noResultsTitle={directoryLabels.noResultsTitle}
          noResultsDescription={directoryLabels.noResultsDescription}
          lineCta={directoryLabels.lineCta}
          bookNowLabel={bookNowLabel}
          detailsLabel={detailsLabel}
          priceLabel={priceLabel}
          lineLabel={directoryLabels.lineShortcut}
          processingTimeLabel={directoryLabels.processingTime}
          requirementsLabel={directoryLabels.requirements}
          badgeLabels={directoryLabels.badges}
          journeyTitle={directoryLabels.journeyTitle}
          journeySteps={directoryLabels.journeySteps}
          isLoggedIn={isLoggedIn}
          locale={locale}
        />
      </section>

      <ServiceTrustSection
        title={directoryLabels.trustTitle}
        subtitle={directoryLabels.trustSubtitle}
        items={trustItems}
      />

      <ServiceCommandPalette
        services={services}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        categoryLabels={categoryLabelsForPalette}
        labels={searchLabels}
        voiceLang={voiceLang}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />

      <ServicesStickyBar
        bookNowLabel={bookNowLabel}
        lineLabel={directoryLabels.lineShortcut}
        bookHref={isLoggedIn ? "/book/driver-license" : `/login?redirect=/${locale}/book/driver-license`}
      />

      <WhatsAppFloat />
    </>
  );
}
