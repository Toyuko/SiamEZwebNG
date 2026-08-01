/**
 * Project domain rows into typed SearchDocuments.
 * Read-only — never writes listing description fields.
 */

import { getServiceSearchMeta } from "@/config/service-search";
import { getHelpSearchStubs } from "@/lib/search/help-stubs";
import {
  buildPropertySearchPath,
  buildServiceSearchPath,
  buildVehicleSearchPath,
} from "@/lib/search/urls";
import type {
  HelpSearchDocument,
  PropertySearchDocument,
  PropertySearchSource,
  SearchDocument,
  ServiceSearchDocument,
  ServiceSearchSource,
  VehicleSearchDocument,
  VehicleSearchSource,
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

export type BuildSearchIndexInput = {
  services?: ServiceSearchSource[];
  vehicles?: VehicleSearchSource[];
  properties?: PropertySearchSource[];
  /** Include static help stubs (default true). */
  includeHelp?: boolean;
  locale?: "en" | "th";
};

/** Build a flat index from division sources (+ optional help stubs). */
export function buildSearchDocuments(input: BuildSearchIndexInput = {}): SearchDocument[] {
  const services = (input.services ?? []).map(buildServiceSearchDocument);
  const vehicles = (input.vehicles ?? []).map(buildVehicleSearchDocument);
  const properties = (input.properties ?? []).map(buildPropertySearchDocument);
  const help: HelpSearchDocument[] =
    input.includeHelp === false ? [] : getHelpSearchStubs(input.locale ?? "en");

  return [...services, ...vehicles, ...properties, ...help];
}
