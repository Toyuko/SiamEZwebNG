/**
 * Deterministic cross-sell rules driven by configurable recommendation edges.
 * Defaults live in `src/config/recommendation-graph.ts`; callers may inject
 * admin/DB edges via `context.edges`.
 */

import { getActiveCatalogEntries } from "@/config/service-catalog";
import {
  DEFAULT_RECOMMENDATION_EDGES,
  edgesForTriggers,
  type RecommendationEdgeDef,
  type RecommendationTrigger,
} from "@/config/recommendation-graph";
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
const PROPERTY_HINT_RE =
  /condo|apartment|house|villa|property|real\s*estate|คอนโด|บ้าน|อพาร์ทเมนท์|อสังหา/i;
const MOTORCYCLE_QUERY_RE =
  /motorcycle|motorbike|scooter|\bbike\b|มอเตอร์ไซค์|สกู๊ตเตอร์|บิ๊กไบค์/i;
const VEHICLE_QUERY_RE = /car|vehicle|truck|van|รถยนต์|รถยนต|รถบรรทุก/i;

const COPY = {
  en: {
    listingContinue: "Continue where you left off on this listing.",
    goalService: "Next step from your active goal / life event.",
    movingEvent: "Settling in? Follow the Moving to Thailand checklist (home → docs → vehicle).",
    vehicleRegistration: "Complete registration, plates, and tax renewals for your vehicle.",
    motorcycleLicense: "A Thai driver's license (including motorcycle classes) pairs well with a new bike.",
  },
  th: {
    listingContinue: "กลับไปดูรายการที่คุณสนใจต่อ",
    goalService: "ขั้นตอนถัดไปจากเป้าหมาย / เหตุการณ์ชีวิตของคุณ",
    movingEvent: "กำลังย้ายมาอยู่ไทย? ตามเช็กลิสต์ย้ายมาอยู่ประเทศไทย",
    vehicleRegistration: "จดทะเบียน ป้ายทะเบียน และต่อภาษีรถให้ครบ",
    motorcycleLicense: "ใบขับขี่ไทย (รวมรถจักรยานยนต์) เหมาะกับรถคันใหม่ของคุณ",
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
  if (!cat) return true;
  return VEHICLE_CATEGORY_RE.test(cat) || /car|auto|truck|van/i.test(cat);
}

export function isPropertySignal(signal: EngagementListingSignal): boolean {
  return signal.listingType === "property";
}

function applyGraphEdges(
  out: RecommendationSuggestion[],
  seen: Set<string>,
  edges: RecommendationEdgeDef[],
  triggers: RecommendationTrigger[],
  locale: RecommendationLocale
) {
  for (const edge of edgesForTriggers(edges, triggers)) {
    const reason = locale === "th" ? edge.reasonTh || edge.reasonEn : edge.reasonEn;
    if (edge.targetKind === "service") {
      pushService(out, seen, {
        slug: edge.targetKey,
        reason,
        score: edge.score,
        locale,
      });
    } else if (edge.targetKind === "life_event") {
      const title =
        edge.targetKey === "moving-to-thailand"
          ? locale === "th"
            ? "ย้ายมาอยู่ประเทศไทย"
            : "Moving to Thailand"
          : edge.targetKey.replace(/-/g, " ");
      pushLifeEvent(out, seen, {
        key: edge.targetKey,
        title,
        reason,
        score: edge.score,
      });
    }
  }
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
  const edges = context.edges?.length
    ? context.edges
    : DEFAULT_RECOMMENDATION_EDGES;
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

  const triggers: RecommendationTrigger[] = [];
  if (sawMotorcycle) triggers.push("motorcycle", "query:motorcycle");
  else if (sawVehicle) triggers.push("vehicle", "query:vehicle");
  if (sawProperty) triggers.push("property", "query:property");

  applyGraphEdges(out, seen, edges, triggers, locale);
  applyGoalSignals(out, seen, context.goals ?? [], locale);

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
