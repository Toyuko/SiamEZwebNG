/**
 * Structured data builders for marketplace listings (Wave M1).
 * Prefer stored enhancement.schemaJsonLd when present; otherwise build from source.
 */

import { site } from "@/config/site";
import {
  buildLocalizedRealEstateListingPath,
  buildLocalizedSalesListingPath,
} from "@/lib/migration/urls";
import type { ListingEnhancementType } from "@/lib/migration/types";

export type VehicleJsonLdSource = {
  id: string;
  title: string;
  description: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  priceAmount: number;
  priceCurrency: string;
  heroImageUrl: string;
  category?: string;
};

export type PropertyJsonLdSource = {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  province: string;
  district?: string | null;
  neighborhood?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm: number;
  priceAmount: number;
  priceCurrency: string;
  heroImageUrl: string;
};

function siteBaseUrl(): string {
  return site.url.replace(/\/$/, "");
}

export function buildVehicleJsonLd(
  source: VehicleJsonLdSource,
  options: { locale?: string; summary?: string | null } = {}
): Record<string, unknown> {
  const locale = options.locale?.trim() || "en";
  const url = `${siteBaseUrl()}${buildLocalizedSalesListingPath(locale, source)}`;
  const description = (options.summary?.trim() || source.description).replace(/\s+/g, " ").trim();

  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Vehicle"],
    name: source.title,
    description: description.slice(0, 5000),
    url,
    image: source.heroImageUrl,
    brand: {
      "@type": "Brand",
      name: source.make,
    },
    model: source.model,
    vehicleModelDate: String(source.year),
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: source.mileageKm,
      unitCode: "KMT",
    },
    offers: {
      "@type": "Offer",
      price: source.priceAmount,
      priceCurrency: source.priceCurrency || "THB",
      availability: "https://schema.org/InStock",
      url,
      seller: {
        "@type": "Organization",
        name: site.name,
        url: siteBaseUrl(),
      },
    },
  };
}

export function buildPropertyJsonLd(
  source: PropertyJsonLdSource,
  options: { locale?: string; summary?: string | null } = {}
): Record<string, unknown> {
  const locale = options.locale?.trim() || "en";
  const url = `${siteBaseUrl()}${buildLocalizedRealEstateListingPath(locale, source)}`;
  const description = (options.summary?.trim() || source.description).replace(/\s+/g, " ").trim();
  const locality = [source.neighborhood, source.district, source.province].filter(Boolean).join(", ");

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: source.title,
    description: description.slice(0, 5000),
    url,
    image: source.heroImageUrl,
    offers: {
      "@type": "Offer",
      price: source.priceAmount,
      priceCurrency: source.priceCurrency || "THB",
      availability: "https://schema.org/InStock",
      url,
      seller: {
        "@type": "Organization",
        name: site.name,
        url: siteBaseUrl(),
      },
    },
    about: {
      "@type": "Accommodation",
      name: source.title,
      numberOfRooms: source.bedrooms ?? undefined,
      numberOfBathroomsTotal: source.bathrooms ?? undefined,
      floorSize: {
        "@type": "QuantitativeValue",
        value: source.areaSqm,
        unitCode: "MTK",
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: locality || source.province,
        addressRegion: source.province,
        addressCountry: "TH",
      },
      additionalType: source.propertyType,
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "listingType",
        value: source.listingType,
      },
    ],
  };
}

/** Prefer stored schemaJsonLd object; otherwise null (caller builds from source). */
export function coerceStoredSchemaJsonLd(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function listingTypeToDivision(
  listingType: ListingEnhancementType
): "sales" | "real-estate" {
  return listingType === "vehicle" ? "sales" : "real-estate";
}
