/**
 * Platform Wave M4 — Life Events Engines types.
 * Step targets are flexible JSON; listing deep links use cuid ids only.
 */

export type LifeEventListingType = "vehicle" | "property";

export type LifeEventListingFilters = {
  category?: string;
  listingType?: string;
  province?: string;
};

/**
 * Flexible step target stored as JSON on LifeEventStep.target.
 * Prefer serviceSlug and/or listingFilters; listingId must be a cuid when set.
 */
export type LifeEventStepTarget = {
  serviceSlug?: string;
  listingType?: LifeEventListingType;
  listingFilters?: LifeEventListingFilters;
  /** cuid deep link — never a marketplace slug */
  listingId?: string;
  /** Locale-agnostic path override (e.g. /sales, /real-estate?province=Bangkok) */
  href?: string;
};

export type LifeEventStepStatus = "pending" | "started" | "completed" | "skipped";
export type LifeEventRunStatus = "active" | "completed" | "abandoned";

export type StepTransition =
  | { ok: true; from: LifeEventStepStatus; to: LifeEventStepStatus }
  | { ok: false; reason: "invalid_transition" | "same_status" };

export type RunProgressSummary = {
  total: number;
  completed: number;
  started: number;
  pending: number;
  skipped: number;
  /** 0–100 */
  percent: number;
  allDone: boolean;
};
