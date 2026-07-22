"use client";

import { ServiceCard } from "./ServiceCard";
import type { ServiceSlug } from "@/config/services";
import { serviceThumbnailImages } from "@/config/services";
import {
  Heart,
  FileText,
  Car,
  Shield,
  Plane,
  Wrench,
  Handshake,
  ClipboardList,
  Bus,
  User,
  PartyPopper,
  Building2,
  type LucideIcon,
} from "lucide-react";

const iconBySlug: Record<ServiceSlug, LucideIcon> = {
  "driver-license": Car,
  "vehicle-registration": ClipboardList,
  "visa-services": Plane,
  "translation-services": FileText,
  "police-clearance": Shield,
  "marriage-registration": Heart,
  "basic-translation": FileText,
  "construction-handyman": Wrench,
  "real-estate-services": Building2,
  "car-motorbike-finder-selling-service": Handshake,
  "transportation-services": Bus,
  "private-driver-service": User,
  "event-planning-venue-services": PartyPopper,
};

// Softer pastel colors matching the design - with dark mode variants
const iconColorBySlug: Record<ServiceSlug, { bg: string; text: string; shape: "circle" | "square" }> = {
  "driver-license": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", shape: "circle" },
  "vehicle-registration": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", shape: "square" },
  "visa-services": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", shape: "circle" },
  "translation-services": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", shape: "square" },
  "police-clearance": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", shape: "circle" },
  "marriage-registration": { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", shape: "circle" },
  "basic-translation": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", shape: "square" },
  "construction-handyman": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", shape: "circle" },
  "real-estate-services": { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-400", shape: "circle" },
  "car-motorbike-finder-selling-service": { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", shape: "circle" },
  "transportation-services": { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", shape: "circle" },
  "private-driver-service": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", shape: "circle" },
  "event-planning-venue-services": { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400", shape: "circle" },
};

export type DisplayService = {
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  thumbnailImage?: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
};

interface ServicesGridProps {
  services: DisplayService[];
  searchQuery?: string;
  noResultsMessage?: string;
  bookNowLabel: string;
  detailsLabel: string;
  priceLabel?: string;
  /** When false, Book Now links to login with redirect; when true, links directly to booking */
  isLoggedIn?: boolean;
  /** Used for redirect param when not logged in */
  locale?: string;
}

export function ServicesGrid({
  services,
  searchQuery = "",
  noResultsMessage = "No services found matching your search.",
  bookNowLabel,
  detailsLabel,
  priceLabel,
  isLoggedIn = false,
  locale = "en",
}: ServicesGridProps) {
  const getBookHref = (slug: string) =>
    isLoggedIn ? `/book/${slug}` : `/login?redirect=/${locale}/book/${slug}`;
  if (searchQuery.trim() && services.length === 0) {
    const message = noResultsMessage.replace("{query}", searchQuery.trim());
    return (
      <div className="py-12 text-center" role="status">
        <p className="text-lg text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const Icon = iconBySlug[service.slug as ServiceSlug] ?? FileText;
        const colors = iconColorBySlug[service.slug as ServiceSlug] ?? iconColorBySlug["translation-services"];
        const desc = service.shortDescription ?? (service.description && service.description.slice(0, 150)) ?? "";
        const thumbnailImage =
          service.thumbnailImage ?? serviceThumbnailImages[service.slug as ServiceSlug] ?? null;

        return (
          <ServiceCard
            key={service.slug}
            slug={service.slug}
            name={service.name}
            description={desc}
            thumbnailImage={thumbnailImage}
            Icon={Icon}
            iconBg={colors.bg}
            iconText={colors.text}
            iconShape={colors.shape}
            priceAmount={service.priceAmount}
            priceCurrency={service.priceCurrency}
            priceLabel={priceLabel}
            bookNowLabel={bookNowLabel}
            detailsLabel={detailsLabel}
            getBookHref={getBookHref}
          />
        );
      })}
    </div>
  );
}
