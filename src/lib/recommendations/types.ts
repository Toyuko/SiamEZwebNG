/**
 * Platform Wave M5 — Recommendations engine types.
 * Listing deep links always use cuid ids (never marketplace slug).
 */

export type RecommendationLocale = "en" | "th";

export type RecommendationKind = "service" | "listing" | "life_event";

export type RecommendationListingType = "vehicle" | "property";

export type EngagementSource = "view" | "save" | "compare" | "query";

/** Lightweight engagement signal from marketplace views/saves/compare. */
export type EngagementListingSignal = {
  listingType: RecommendationListingType;
  listingId: string;
  category?: string | null;
  title?: string | null;
  source: EngagementSource;
};

/** Recent booking / case service slug (lightweight). */
export type BookingSignal = {
  serviceSlug: string;
};

/** Goals / life-event progress hints. */
export type GoalLifeEventSignal = {
  lifeEventKey?: string;
  lifeEventId?: string;
  title?: string;
  incompleteServiceSlugs?: string[];
};

/**
 * Pure engine input — inject signals from engagement, bookings, goals, or chat query.
 * No Prisma dependency; callers hydrate context separately.
 */
export type RecommendationContext = {
  locale: RecommendationLocale;
  listings?: EngagementListingSignal[];
  bookings?: BookingSignal[];
  goals?: GoalLifeEventSignal[];
  /** Free-text intent (Concierge chat / search). */
  query?: string;
  limit?: number;
};

export type RecommendationSuggestion = {
  kind: RecommendationKind;
  /** Stable id: service slug | listing cuid | life-event key */
  id: string;
  title: string;
  reason: string;
  /** Locale-agnostic public path (next-intl Link). */
  href: string;
  score: number;
  meta?: {
    serviceSlug?: string;
    listingType?: RecommendationListingType;
    listingId?: string;
    lifeEventKey?: string;
  };
};

export type RecommendationResult = {
  suggestions: RecommendationSuggestion[];
  /** True when OPENAI_API_KEY was used to polish reason copy. */
  polished: boolean;
};
