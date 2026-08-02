/**
 * Project domain rows into typed SearchDocuments.
 * Read-only — never writes listing description fields.
 */

import { getServiceSearchMeta } from "@/config/service-search";
import { getHelpSearchStubs } from "@/lib/search/help-stubs";
import {
  buildBookingSearchPath,
  buildGoalSearchPath,
  buildLifeEventSearchPath,
  buildPropertySearchPath,
  buildServiceSearchPath,
  buildVehicleSearchPath,
} from "@/lib/search/urls";
import type {
  BookingSearchDocument,
  GoalSearchDocument,
  HelpSearchDocument,
  LifeEventSearchDocument,
  PropertySearchDocument,
  PropertySearchSource,
  SearchDocument,
  ServiceSearchDocument,
  ServiceSearchSource,
  VehicleSearchDocument,
  VehicleSearchSource,
  LifeEventSearchSource,
  GoalSearchSource,
  BookingSearchSource,
} from "@/lib/search/types";

export function buildServiceSearchDocument(
  source: ServiceSearchSource
): ServiceSearchDocument {
  const slug = source.slug.trim();
  const meta = getServiceSearchMeta(slug);
  const keywords = [...(source.keywords ?? []), ...meta.keywords];
  const desc = source.shortDescription ?? source.description ?? "";
  const title = source.name;

  return {
    id: `service:${slug}`,
    division: "service",
    slug,
    title,
    subtitle: desc ? String(desc).slice(0, 160) : undefined,
    keywords,
    searchText: [title, slug, desc, ...keywords].join(" "),
    href: buildServiceSearchPath(slug),
  };
}

export function buildVehicleSearchDocument(
  source: VehicleSearchSource
): VehicleSearchDocument {
  const listingId = source.id.trim();
  const title = source.title;
  const subtitle = [source.make, source.model, String(source.year), source.category]
    .filter(Boolean)
    .join(" · ");
  const keywords = [
    source.make,
    source.model,
    String(source.year),
    source.category,
    "vehicle",
    "car",
    "motorcycle",
    "sales",
  ].filter(Boolean);

  return {
    id: `vehicle:${listingId}`,
    division: "vehicle",
    listingId,
    title,
    subtitle,
    keywords,
    searchText: [title, subtitle, ...keywords].join(" "),
    href: buildVehicleSearchPath(listingId),
  };
}

export function buildPropertySearchDocument(
  source: PropertySearchSource
): PropertySearchDocument {
  const listingId = source.id.trim();
  const title = source.title;
  const location = [source.neighborhood, source.district, source.province]
    .filter(Boolean)
    .join(", ");
  const subtitle = [source.propertyType, source.listingType, location]
    .filter(Boolean)
    .join(" · ");
  const keywords = [
    source.propertyType,
    source.listingType,
    source.province,
    source.district ?? "",
    source.neighborhood ?? "",
    "property",
    "real estate",
    "condo",
    "house",
  ].filter(Boolean);

  return {
    id: `property:${listingId}`,
    division: "property",
    listingId,
    title,
    subtitle,
    keywords,
    searchText: [title, subtitle, ...keywords].join(" "),
    href: buildPropertySearchPath(listingId),
  };
}

export function buildLifeEventSearchDocument(
  source: LifeEventSearchSource,
  locale: "en" | "th" = "en"
): LifeEventSearchDocument {
  const key = source.key.trim();
  const title =
    locale === "th" && source.titleTh?.trim() ? source.titleTh.trim() : source.titleEn;
  const description =
    locale === "th" && source.descriptionTh?.trim()
      ? source.descriptionTh.trim()
      : (source.descriptionEn ?? "");
  const keywords = [
    key,
    source.titleEn,
    source.titleTh ?? "",
    "life event",
    "journey",
    "goal",
    "checklist",
  ].filter(Boolean);

  return {
    id: `life_event:${key}`,
    division: "life_event",
    key,
    title,
    subtitle: description ? String(description).slice(0, 160) : undefined,
    keywords,
    searchText: [title, key, description, ...keywords].join(" "),
    href: buildLifeEventSearchPath(key),
  };
}

export function buildGoalSearchDocument(source: GoalSearchSource): GoalSearchDocument {
  const goalId = source.id.trim();
  const title = source.title.trim();
  const keywords = ["goal", "life event", "progress", source.status ?? "active"].filter(
    Boolean
  );

  return {
    id: `goal:${goalId}`,
    division: "goal",
    goalId,
    title,
    subtitle: source.status ? `Status: ${source.status}` : undefined,
    keywords,
    searchText: [title, ...keywords].join(" "),
    href: buildGoalSearchPath(),
  };
}

export function buildBookingSearchDocument(
  source: BookingSearchSource
): BookingSearchDocument {
  const caseId = source.id.trim();
  const caseNumber = source.caseNumber.trim();
  const title = source.serviceName.trim() || caseNumber;
  const subtitle = caseNumber !== title ? caseNumber : undefined;
  const keywords = [
    caseNumber,
    source.serviceName,
    source.status ?? "",
    "booking",
    "case",
    "service",
  ].filter(Boolean);

  return {
    id: `booking:${caseId}`,
    division: "booking",
    caseId,
    caseNumber,
    title,
    subtitle,
    keywords,
    searchText: [title, caseNumber, source.serviceName, ...keywords].join(" "),
    href: buildBookingSearchPath(caseId),
  };
}

export type BuildSearchIndexInput = {
  services?: ServiceSearchSource[];
  vehicles?: VehicleSearchSource[];
  properties?: PropertySearchSource[];
  lifeEvents?: LifeEventSearchSource[];
  goals?: GoalSearchSource[];
  bookings?: BookingSearchSource[];
  /** Include static help stubs (default true). */
  includeHelp?: boolean;
  locale?: "en" | "th";
};

/** Build a flat index from division sources (+ optional help stubs). */
export function buildSearchDocuments(input: BuildSearchIndexInput = {}): SearchDocument[] {
  const locale = input.locale ?? "en";
  const services = (input.services ?? []).map(buildServiceSearchDocument);
  const vehicles = (input.vehicles ?? []).map(buildVehicleSearchDocument);
  const properties = (input.properties ?? []).map(buildPropertySearchDocument);
  const lifeEvents = (input.lifeEvents ?? []).map((s) =>
    buildLifeEventSearchDocument(s, locale)
  );
  const goals = (input.goals ?? []).map(buildGoalSearchDocument);
  const bookings = (input.bookings ?? []).map(buildBookingSearchDocument);
  const help: HelpSearchDocument[] =
    input.includeHelp === false ? [] : getHelpSearchStubs(locale);

  return [
    ...services,
    ...vehicles,
    ...properties,
    ...lifeEvents,
    ...goals,
    ...bookings,
    ...help,
  ];
}
