"use client";

import { useMemo, useState } from "react";
import { ServicesHero } from "@/components/sections/ServicesHero";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { WhatsAppFloat } from "@/components/sections/WhatsAppFloat";
import {
  ServiceCommandPalette,
  type ServiceCommandPaletteLabels,
} from "@/components/services/ServiceCommandPalette";
import type { ServiceSearchBarLabels } from "@/components/services/ServiceSearchBar";
import { useServiceFuseSearch } from "@/hooks/useServiceFuseSearch";
import type { DisplayService } from "@/components/sections/ServicesGrid";

export type ServicesSearchLabels = ServiceCommandPaletteLabels;

interface ServicesPageClientProps {
  services: DisplayService[];
  title: string;
  description: string;
  searchPlaceholder: string;
  searchButtonText: string;
  bookNowLabel: string;
  detailsLabel: string;
  priceLabel: string;
  searchLabels: ServicesSearchLabels;
  categoryLabels: Record<string, string>;
  noResultsMessage: string;
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
  categoryLabels,
  noResultsMessage,
  isLoggedIn = true,
  locale = "en",
}: ServicesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const voiceLang = locale === "th" ? "th-TH" : "en-US";

  const filteredServices = useServiceFuseSearch(services, searchQuery, categoryLabels);

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
      <section id="services-section" className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <ServicesGrid
          services={filteredServices}
          searchQuery={searchQuery}
          noResultsMessage={noResultsMessage}
          bookNowLabel={bookNowLabel}
          detailsLabel={detailsLabel}
          priceLabel={priceLabel}
          isLoggedIn={isLoggedIn}
          locale={locale}
        />
      </section>
      <ServiceCommandPalette
        services={services}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        categoryLabels={categoryLabels}
        labels={searchLabels}
        voiceLang={voiceLang}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
      <WhatsAppFloat />
    </>
  );
}
