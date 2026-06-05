import type { ServiceSlug } from "@/config/services";
import { serviceSlugs } from "@/config/services";
import {
  serviceDirectoryCategoryKeys,
  type ServiceDirectoryCategoryKey,
} from "@/config/service-catalog";

/** Category keys for directory filters and search grouping (i18n: services.directoryCategories.*) */
export const serviceSearchCategoryKeys = serviceDirectoryCategoryKeys;

export type ServiceSearchCategoryKey = ServiceDirectoryCategoryKey;

export type ServiceSearchMeta = {
  categoryKey: ServiceSearchCategoryKey;
  keywords: string[];
};

/**
 * Search metadata per canonical service slug: category grouping + synonym keywords
 * for Fuse.js (titles/descriptions come from the service record itself).
 */
export const serviceSearchMeta: Record<ServiceSlug, ServiceSearchMeta> = {
  "driver-license": {
    categoryKey: "drivingVehicle",
    keywords: ["license", "licence", "dlt", "driving", "idp", "motorcycle", "car", "bangkok", "ใบขับขี่"],
  },
  "vehicle-registration": {
    categoryKey: "drivingVehicle",
    keywords: ["registration", "dlt", "plate", "transfer", "car register", "bike register", "จดทะเบียนรถ"],
  },
  "visa-services": {
    categoryKey: "immigrationLegal",
    keywords: ["visa", "immigration", "extension", "stay", "permit", "non-immigrant", "tourist", "วีซ่า"],
  },
  "translation-services": {
    categoryKey: "translationDocuments",
    keywords: ["translate", "translation", "certified", "document", "notarize", "thai english", "แปลเอกสาร"],
  },
  "police-clearance": {
    categoryKey: "immigrationLegal",
    keywords: ["police", "clearance", "background check", "criminal record", "certificate", "หนังสือรับรองความประพฤติ"],
  },
  "marriage-registration": {
    categoryKey: "immigrationLegal",
    keywords: ["marriage", "wedding", "amphur", "embassy", "mfa", "spouse", "register", "จดทะเบียนสมรส"],
  },
  "basic-translation": {
    categoryKey: "translationDocuments",
    keywords: ["basic translation", "fixed price", "per page", "certified", "แปลราคาคงที่"],
  },
  "construction-handyman": {
    categoryKey: "homeProperty",
    keywords: ["construction", "renovation", "repair", "handyman", "home", "condo", "ช่างซ่อม"],
  },
  "car-motorbike-finder-selling-service": {
    categoryKey: "drivingVehicle",
    keywords: ["buy car", "sell car", "motorbike", "motorcycle", "dealer", "vehicle finder", "ซื้อขายรถ"],
  },
  "transportation-services": {
    categoryKey: "transportPrivateDriver",
    keywords: ["airport", "transfer", "taxi", "shuttle", "transport", "tour", "รับส่งสนามบิน"],
  },
  "private-driver-service": {
    categoryKey: "transportPrivateDriver",
    keywords: ["chauffeur", "driver", "private driver", "hire driver", "daily driver", "คนขับส่วนตัว"],
  },
  "event-planning-venue-services": {
    categoryKey: "eventsLifestyle",
    keywords: ["event", "wedding venue", "party", "planning", "red door", "venue", "จัดงาน"],
  },
};

const defaultMeta: ServiceSearchMeta = {
  categoryKey: "businessServices",
  keywords: [],
};

export function getServiceSearchMeta(slug: string): ServiceSearchMeta {
  if ((serviceSlugs as readonly string[]).includes(slug)) {
    return serviceSearchMeta[slug as ServiceSlug];
  }
  return defaultMeta;
}
