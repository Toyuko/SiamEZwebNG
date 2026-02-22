"use client";

import { useState } from "react";
import { ServicesHero } from "@/components/sections/ServicesHero";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { WhatsAppFloat } from "@/components/sections/WhatsAppFloat";
import type { DisplayService } from "@/components/sections/ServicesGrid";

interface ServicesPageClientProps {
  services: DisplayService[];
  title: string;
  description: string;
  searchPlaceholder: string;
  searchButtonText: string;
  bookNowLabel: string;
  detailsLabel: string;
  priceLabel: string;
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
  isLoggedIn = true,
  locale = "en",
}: ServicesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <ServicesHero
        title={title}
        description={description}
        searchPlaceholder={searchPlaceholder}
        searchButtonText={searchButtonText}
        onSearchChange={setSearchQuery}
      />
      <section id="services-section" className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <ServicesGrid
          services={services}
          searchQuery={searchQuery}
          bookNowLabel={bookNowLabel}
          detailsLabel={detailsLabel}
          priceLabel={priceLabel}
          isLoggedIn={isLoggedIn}
          locale={locale}
        />
      </section>
      <WhatsAppFloat />
    </>
  );
}
