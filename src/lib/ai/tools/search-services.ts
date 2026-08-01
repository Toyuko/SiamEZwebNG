/**
 * Read-only concierge tool helper — catalog search for discovery / handoff.
 * Prefer this over mutating case tools until explicit user confirmation flows exist.
 */

import {
  getPopularRecommendations,
  getServiceBySlug,
  searchCatalogServices,
} from "@/lib/ai/recommend";
import type {
  ConciergeLocale,
  ConciergeServiceRecommendation,
} from "@/lib/ai/types";

export type SearchServicesToolInput = {
  query?: string;
  locale: ConciergeLocale;
  limit?: number;
  popularOnly?: boolean;
};

export type SearchServicesToolResult = {
  recommendations: ConciergeServiceRecommendation[];
  bookPathTemplate: "/book/[slug]";
};

export function searchServicesTool(
  input: SearchServicesToolInput
): SearchServicesToolResult {
  const limit = input.limit ?? 5;

  if (input.popularOnly || !input.query?.trim()) {
    return {
      recommendations: getPopularRecommendations(input.locale, limit),
      bookPathTemplate: "/book/[slug]",
    };
  }

  return {
    recommendations: searchCatalogServices(input.query, input.locale, limit),
    bookPathTemplate: "/book/[slug]",
  };
}

export function resolveServiceForBooking(
  slug: string,
  locale: ConciergeLocale
): ConciergeServiceRecommendation | null {
  return getServiceBySlug(slug, locale);
}

/** Absolute-ish app path for wizard handoff (locale prefix added by next-intl Link). */
export function bookingPathForSlug(slug: string): string {
  return `/book/${slug}`;
}
