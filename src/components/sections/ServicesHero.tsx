"use client";

import { ServiceSearchBar, type ServiceSearchBarLabels } from "@/components/services/ServiceSearchBar";

interface ServicesHeroProps {
  title: string;
  description: string;
  searchPlaceholder?: string;
  searchButtonText?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSearchPalette?: () => void;
  voiceLang?: string;
  searchLabels: ServiceSearchBarLabels;
}

export function ServicesHero({
  title,
  description,
  searchPlaceholder = "What service are you looking for?",
  searchButtonText = "Search",
  searchQuery,
  onSearchChange,
  onOpenSearchPalette,
  voiceLang,
  searchLabels,
}: ServicesHeroProps) {
  return (
    <section className="relative overflow-hidden bg-hero-gradient py-12 sm:py-16 md:py-20">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
      <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-siam-yellow/15 blur-3xl" />
      <div className="container relative mx-auto px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-4 max-w-3xl text-base text-white/95 sm:text-lg md:text-xl lg:mt-6">
            {description}
          </p>
        )}
        <div className="mx-auto mt-8 sm:mt-10 md:mt-12">
          <ServiceSearchBar
            placeholder={searchPlaceholder}
            searchButtonText={searchButtonText}
            value={searchQuery}
            onChange={onSearchChange}
            onOpenPalette={onOpenSearchPalette}
            voiceLang={voiceLang}
            labels={searchLabels}
          />
          <p className="mt-3 text-xs text-white/70">
            <kbd className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>{" "}
            /{" "}
            <kbd className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl+K
            </kbd>
          </p>
        </div>
      </div>
    </section>
  );
}
