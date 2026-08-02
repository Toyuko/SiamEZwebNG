/**
 * Deterministic cross-sell rules (no LLM).
 * Only emit real seeded service slugs / life-event keys.
 *
 * Motorcycle / vehicle → registration (+ finder, driver license).
 * No standalone insurance slug exists in seed — vehicle-registration covers
 * tax/insurance renewals; do not invent packages.
 */

import { getActiveCatalogEntries } from "@/config/service-catalog";
import type {
  EngagementListingSignal,
  GoalLifeEventSignal,
  RecommendationContext,
  RecommendationLocale,
  RecommendationSuggestion,
} from "./types";
import {
  buildLifeEventRecommendationPath,
  buildListingRecommendationPath,
  buildServiceRecommendationPath,
} from "./urls";

const MOTORCYCLE_CATEGORY_RE = /motorcycle|motorbike|scooter|big[\s-]?bike|มอเตอร์ไซค์|สกู๊ตเตอร์/i;
const VEHICLE_CATEGORY_RE = /^(car|truck|van|suv|pickup|sedan|vehicle)$/i;
/** Avoid \\b for Thai — JS word boundaries are ASCII-only. */
const PROPERTY_HINT_RE =
  /condo|apartment|house|villa|property|real\s*estate|คอนโด|บ้าน|อพาร์ทเมนท์|อสังหา/i;
const MOTORCYCLE_QUERY_RE =
  /motorcycle|motorbike|scooter|\bbike\b|มอเตอร์ไซค์|สกู๊ตเตอร์|บิ๊กไบค์/i;
const VEHICLE_QUERY_RE = /car|vehicle|truck|van|รถยนต์|รถยนต|รถบรรทุก/i;

const COPY = {
  en: {
    motorcycleRegistration:
      "You viewed a motorcycle — register or transfer ownership with DLT support.",
    motorcycleFinder: "Need help buying or selling a bike? Our Auto & Bike Finder handles paperwork.",
    motorcycleLicense: "A Thai driver's license (including motorcycle classes) pairs well with a new bike.",
    vehicleRegistration: "Complete registration, plates, and tax renewals for your vehicle.",
    vehicleFinder: "Source, negotiate, and transfer vehicles with SiamEZ support.",
    propertyServices: "Property viewing, contracts, and buyer/seller support.",
    propertyTranslation: "Certified translation for leases, title deeds, and contracts.",
    movingEvent: "Settling in? Follow the Moving to Thailand checklist (home → docs → vehicle).",
    listingContinue: "Continue where you left off on this listing.",
    goalService: "Next step from your active goal / life event.",
  },
  th: {
    motorcycleRegistration:
      "คุณกำลังดูมอเตอร์ไซค์ — จดทะเบียนหรือโอนกรรมสิทธิ์พร้อมช่วยเหลือที่กรมขนส่ง",
    motorcycleFinder: "ต้องการซื้อ/ขายมอเตอร์ไซค์? บริการหาซื้อรถช่วยเจรจาและเอกสาร",
    motorcycleLicense: "ใบขับขี่ไทย (รวมรถจักรยานยนต์) เหมาะกับรถคันใหม่ของคุณ",
    vehicleRegistration: "จดทะเบียน ป้ายทะเบียน และต่อภาษีรถให้ครบ",
    vehicleFinder: "หา เจรจา และโอนรถพร้อมสนับสนุนจาก SiamEZ",
    propertyServices: "ช่วยดูบ้าน สัญญา และสนับสนุนผู้ซื้อ/ผู้ขาย",
    propertyTranslation: "แปลเอกสารรับรองสำหรับสัญญาเช่า โฉนด และสัญญา",
    movingEvent: "กำลังย้ายมาอยู่ไทย? ตามเช็กลิสต์ย้ายมาอยู่ประเทศไทย",
    listingContinue: "กลับไปดูรายการที่คุณสนใจต่อ",
    goalService: "ขั้นตอนถัดไปจากเป้าหมาย / เหตุการณ์ชีวิตของคุณ",
  },
} as const;

const KNOWN_SERVICE_SLUGS = new Set(
  getActiveCatalogEntries().map((e) => e.slug)
);

function serviceTitle(slug: string, locale: RecommendationLocale): string {
  const entry = getActiveCatalogEntries().find((e) => e.slug === slug);
  if (!entry) return slug;
  return entry.name[locale] || entry.name.en;
}

function pushService(
  out: RecommendationSuggestion[],
  seen: Set<string>,
  opts: {
    slug: string;
    reason: string;
    score: number;
    locale: RecommendationLocale;
    preferBook?: boolean;
  }
) {
  if (!KNOWN_SERVICE_SLUGS.has(opts.slug)) return;
  const key = `service:${opts.slug}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({
    kind: "service",
    id: opts.slug,
    title: serviceTitle(opts.slug, opts.locale),
    reason: opts.reason,
    href: buildServiceRecommendationPath(opts.slug, {
      preferBook: opts.preferBook ?? true,
    }),
    score: opts.score,
    meta: { serviceSlug: opts.slug },
  });
}

function pushLifeEvent(
  out: RecommendationSuggestion[],
  seen: Set<string>,
  opts: {
    key: string;
    title: string;
    reason: string;
    score: number;
  }
) {
  const id = `life_event:${opts.key}`;
  if (seen.has(id)) return;
  seen.add(id);
  out.push({
    kind: "life_event",
    id: opts.key,
    title: opts.title,
    reason: opts.reason,
    href: buildLifeEventRecommendationPath(opts.key),
    score: opts.score,
    meta: { lifeEventKey: opts.key },
  });
}

function pushListing(
  out: RecommendationSuggestion[],
  seen: Set<string>,
  signal: EngagementListingSignal,
  reason: string,
  score: number
) {
  const key = `listing:${signal.listingType}:${signal.listingId}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({
    kind: "listing",
    id: signal.listingId,
    title: signal.title?.trim() || signal.listingId,
    reason,
    href: buildListingRecommendationPath(signal.listingType, signal.listingId),
    score,
    meta: {
      listingType: signal.listingType,
      listingId: signal.listingId,
    },
  });
}

export function isMotorcycleSignal(signal: EngagementListingSignal): boolean {
  if (signal.listingType !== "vehicle") return false;
  const cat = signal.category ?? "";
  const title = signal.title ?? "";
  return MOTORCYCLE_CATEGORY_RE.test(cat) || MOTORCYCLE_CATEGORY_RE.test(title);
}

export function isVehicleSignal(signal: EngagementListingSignal): boolean {
  if (signal.listingType !== "vehicle") return false;
  if (isMotorcycleSignal(signal)) return true;
  const cat = (signal.category ?? "").trim();
  if (!cat) return true; // treat unspecified vehicle as automotive
  return VEHICLE_CATEGORY_RE.test(cat) || /car|auto|truck|van/i.test(cat);
}

export function isPropertySignal(signal: EngagementListingSignal): boolean {
  return signal.listingType === "property";
}

function applyMotorcyclePackage(
  out: RecommendationSuggestion[],
  seen: Set<string>,
  locale: RecommendationLocale,
  baseScore: number
) {
  const copy = COPY[locale] ?? COPY.en;
  pushService(out, seen, {
    slug: "vehicle-registration",
    reason: copy.motorcycleRegistration,
    score: baseScore,
    locale,
  });
  pushService(out, seen, {
    slug: "car-motorbike-finder-selling-service",
    reason: copy.motorcycleFinder,
    score: baseScore - 1,
    locale,
  });
  pushService(out, seen, {
    slug: "driver-license",
    reason: copy.motorcycleLicense,
    score: baseScore - 2,
    locale,
  });
}

function applyVehiclePackage(
  out: RecommendationSuggestion[],
  seen: Set<string>,
  locale: RecommendationLocale,
  baseScore: number
) {
  const copy = COPY[locale] ?? COPY.en;
  pushService(out, seen, {
    slug: "vehicle-registration",
    reason: copy.vehicleRegistration,
    score: baseScore,
    locale,
  });
  pushService(out, seen, {
    slug: "car-motorbike-finder-selling-service",
    reason: copy.vehicleFinder,
    score: baseScore - 1,
    locale,
  });
}

function applyPropertyPackage(
  out: RecommendationSuggestion[],
  seen: Set<string>,
  locale: RecommendationLocale,
  baseScore: number
) {
  const copy = COPY[locale] ?? COPY.en;
  pushService(out, seen, {
    slug: "real-estate-services",
    reason: copy.propertyServices,
    score: baseScore,
    locale,
  });
  pushService(out, seen, {
    slug: "translation-services",
    reason: copy.propertyTranslation,
    score: baseScore - 1,
    locale,
  });
  pushLifeEvent(out, seen, {
    key: "moving-to-thailand",
    title: locale === "th" ? "ย้ายมาอยู่ประเทศไทย" : "Moving to Thailand",
    reason: copy.movingEvent,
    score: baseScore - 2,
  });
}

function applyGoalSignals(
  out: RecommendationSuggestion[],
  seen: Set<string>,
  goals: GoalLifeEventSignal[],
  locale: RecommendationLocale
) {
  const copy = COPY[locale] ?? COPY.en;
  for (const goal of goals) {
    if (goal.lifeEventKey) {
      pushLifeEvent(out, seen, {
        key: goal.lifeEventKey,
        title:
          goal.title ||
          (locale === "th" ? "เหตุการณ์ชีวิตของคุณ" : "Your life event"),
        reason: copy.movingEvent,
        score: 70,
      });
    }
    for (const slug of goal.incompleteServiceSlugs ?? []) {
      pushService(out, seen, {
        slug,
        reason: copy.goalService,
        score: 68,
        locale,
      });
    }
  }
}

/**
 * Run deterministic cross-sell rules against a recommendation context.
 * Higher score = stronger match. Does not call external APIs.
 */
export function applyRecommendationRules(
  context: RecommendationContext
): RecommendationSuggestion[] {
  const locale = context.locale === "th" ? "th" : "en";
  const copy = COPY[locale] ?? COPY.en;
  const out: RecommendationSuggestion[] = [];
  const seen = new Set<string>();
  const listings = context.listings ?? [];
  const query = context.query?.trim() ?? "";

  let sawMotorcycle = false;
  let sawVehicle = false;
  let sawProperty = false;

  for (const signal of listings) {
    if (isMotorcycleSignal(signal)) {
      sawMotorcycle = true;
      sawVehicle = true;
      pushListing(out, seen, signal, copy.listingContinue, 95);
    } else if (isVehicleSignal(signal)) {
      sawVehicle = true;
      pushListing(out, seen, signal, copy.listingContinue, 90);
    } else if (isPropertySignal(signal)) {
      sawProperty = true;
      pushListing(out, seen, signal, copy.listingContinue, 88);
    }
  }

  if (MOTORCYCLE_QUERY_RE.test(query)) {
    sawMotorcycle = true;
    sawVehicle = true;
  } else if (VEHICLE_QUERY_RE.test(query)) {
    sawVehicle = true;
  }
  if (PROPERTY_HINT_RE.test(query)) {
    sawProperty = true;
  }

  if (sawMotorcycle) {
    applyMotorcyclePackage(out, seen, locale, 100);
  } else if (sawVehicle) {
    applyVehiclePackage(out, seen, locale, 92);
  }

  if (sawProperty) {
    applyPropertyPackage(out, seen, locale, 85);
  }

  applyGoalSignals(out, seen, context.goals ?? [], locale);

  // Booking adjacency: vehicle registration → suggest finder / license lightly
  for (const booking of context.bookings ?? []) {
    if (booking.serviceSlug === "car-motorbike-finder-selling-service") {
      pushService(out, seen, {
        slug: "vehicle-registration",
        reason: copy.vehicleRegistration,
        score: 75,
        locale,
      });
    }
    if (booking.serviceSlug === "vehicle-registration") {
      pushService(out, seen, {
        slug: "driver-license",
        reason: copy.motorcycleLicense,
        score: 72,
        locale,
      });
    }
  }

  out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const limit = context.limit ?? 8;
  return out.slice(0, limit);
}
