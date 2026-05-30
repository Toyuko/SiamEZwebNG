import type { ServiceSlug } from "@/config/services";
import { serviceSlugs } from "@/config/services";

/** Category keys for grouping search results (i18n: services.searchCategories.*) */
export const serviceSearchCategoryKeys = [
  "legalDocumentation",
  "immigrationTravel",
  "automotiveTransport",
  "homeLifestyle",
] as const;

export type ServiceSearchCategoryKey = (typeof serviceSearchCategoryKeys)[number];

export type ServiceSearchMeta = {
  categoryKey: ServiceSearchCategoryKey;
  keywords: string[];
};

/**
 * Search metadata per canonical service slug: category grouping + synonym keywords
 * for Fuse.js (titles/descriptions come from the service record itself).
 */
export const serviceSearchMeta: Record<ServiceSlug, ServiceSearchMeta> = {
  "marriage-registration": {
    categoryKey: "legalDocumentation",
    keywords: ["marriage", "wedding", "amphur", "embassy", "mfa", "spouse", "register"],
  },
  "translation-services": {
    categoryKey: "legalDocumentation",
    keywords: ["translate", "translation", "certified", "document", "notarize", "thai english"],
  },
  "driver-license": {
    categoryKey: "automotiveTransport",
    keywords: ["license", "licence", "dlt", "driving", "idp", "motorcycle", "car", "bangkok"],
  },
  "police-clearance": {
    categoryKey: "legalDocumentation",
    keywords: ["police", "clearance", "background check", "criminal record", "certificate"],
  },
  "visa-services": {
    categoryKey: "immigrationTravel",
    keywords: ["visa", "immigration", "extension", "stay", "permit", "non-immigrant", "tourist"],
  },
  "construction-handyman": {
    categoryKey: "homeLifestyle",
    keywords: ["construction", "renovation", "repair", "handyman", "home", "condo"],
  },
  "car-motorbike-finder-selling-service": {
    categoryKey: "automotiveTransport",
    keywords: ["buy car", "sell car", "motorbike", "motorcycle", "dealer", "vehicle finder"],
  },
  "vehicle-registration": {
    categoryKey: "automotiveTransport",
    keywords: ["registration", "dlt", "plate", "transfer", "car register", "bike register"],
  },
  "transportation-services": {
    categoryKey: "automotiveTransport",
    keywords: ["airport", "transfer", "taxi", "shuttle", "transport", "tour"],
  },
  "private-driver-service": {
    categoryKey: "automotiveTransport",
    keywords: ["chauffeur", "driver", "private driver", "hire driver", "daily driver"],
  },
  "event-planning-venue-services": {
    categoryKey: "homeLifestyle",
    keywords: ["event", "wedding venue", "party", "planning", "red door", "venue"],
  },
};

const defaultMeta: ServiceSearchMeta = {
  categoryKey: "legalDocumentation",
  keywords: [],
};

export function getServiceSearchMeta(slug: string): ServiceSearchMeta {
  if ((serviceSlugs as readonly string[]).includes(slug)) {
    return serviceSearchMeta[slug as ServiceSlug];
  }
  return defaultMeta;
}
