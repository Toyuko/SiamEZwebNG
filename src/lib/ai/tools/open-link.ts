/**
 * Concierge deep-link adapters — open listing / service / life-event paths.
 * Listing URLs always use cuid contracts (`/sales/{cuid}`, `/real-estate/{cuid}`).
 */

import {
  buildLifeEventRecommendationPath,
  buildListingRecommendationPath,
  buildServiceRecommendationPath,
} from "@/lib/recommendations";
import type { RecommendationListingType } from "@/lib/recommendations";

export type OpenLinkKind = "listing" | "service" | "life_event";

export type OpenListingToolInput = {
  listingType: RecommendationListingType;
  listingId: string;
  label?: string;
};

export type OpenServiceToolInput = {
  slug: string;
  preferBook?: boolean;
  label?: string;
};

export type OpenLifeEventToolInput = {
  lifeEventKey?: string;
  label?: string;
};

export type OpenLinkToolResult = {
  ok: true;
  kind: OpenLinkKind;
  href: string;
  label: string;
};

export type OpenLinkToolError = {
  ok: false;
  reason: "invalid_id" | "invalid_slug";
};

/**
 * Build a vehicle/property deep link for Concierge to surface.
 * Acceptance: Concierge can open `/sales/[id]`.
 */
export function openListingTool(
  input: OpenListingToolInput
): OpenLinkToolResult | OpenLinkToolError {
  const listingId = input.listingId?.trim();
  if (!listingId) {
    return { ok: false, reason: "invalid_id" };
  }
  try {
    const href = buildListingRecommendationPath(input.listingType, listingId);
    const label =
      input.label?.trim() ||
      (input.listingType === "vehicle" ? "Open vehicle listing" : "Open property listing");
    return { ok: true, kind: "listing", href, label };
  } catch {
    return { ok: false, reason: "invalid_id" };
  }
}

export function openServiceTool(
  input: OpenServiceToolInput
): OpenLinkToolResult | OpenLinkToolError {
  const slug = input.slug?.trim();
  if (!slug) {
    return { ok: false, reason: "invalid_slug" };
  }
  try {
    const href = buildServiceRecommendationPath(slug, {
      preferBook: input.preferBook ?? true,
    });
    return {
      ok: true,
      kind: "service",
      href,
      label: input.label?.trim() || `Open ${slug}`,
    };
  } catch {
    return { ok: false, reason: "invalid_slug" };
  }
}

export function openLifeEventTool(
  input: OpenLifeEventToolInput
): OpenLinkToolResult {
  const href = buildLifeEventRecommendationPath(input.lifeEventKey);
  return {
    ok: true,
    kind: "life_event",
    href,
    label: input.label?.trim() || "Open life event checklist",
  };
}
