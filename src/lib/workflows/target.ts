/**
 * Parse / validate WorkflowTemplateStep.target JSON and resolve public deep links.
 * Listing URLs always use cuid contracts from Migration Engine helpers.
 */

import {
  buildRealEstateListingPath,
  buildSalesListingPath,
} from "@/lib/migration/urls";
import { buildServiceBookPath, buildServiceSearchPath } from "@/lib/search/urls";
import type { WorkflowStepTarget } from "./types";

export function parseStepTarget(raw: unknown): WorkflowStepTarget {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const target: WorkflowStepTarget = {};

  if (typeof o.serviceSlug === "string" && o.serviceSlug.trim()) {
    target.serviceSlug = o.serviceSlug.trim();
  }
  if (o.listingType === "vehicle" || o.listingType === "property") {
    target.listingType = o.listingType;
  }
  if (typeof o.listingId === "string" && o.listingId.trim()) {
    target.listingId = o.listingId.trim();
  }
  if (typeof o.href === "string" && o.href.trim()) {
    target.href = o.href.trim();
  }
  if (o.listingFilters && typeof o.listingFilters === "object" && !Array.isArray(o.listingFilters)) {
    const f = o.listingFilters as Record<string, unknown>;
    const filters: NonNullable<WorkflowStepTarget["listingFilters"]> = {};
    if (typeof f.category === "string" && f.category.trim()) filters.category = f.category.trim();
    if (typeof f.listingType === "string" && f.listingType.trim()) {
      filters.listingType = f.listingType.trim();
    }
    if (typeof f.province === "string" && f.province.trim()) filters.province = f.province.trim();
    if (Object.keys(filters).length > 0) target.listingFilters = filters;
  }

  return target;
}

function appendQuery(path: string, params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const q = qs.toString();
  return q ? `${path}?${q}` : path;
}

/**
 * Resolve a locale-agnostic public href for a step target.
 * Priority: explicit href → listingId deep link (cuid) → listing directory + filters → service book/detail.
 */
export function resolveStepTargetHref(
  target: WorkflowStepTarget,
  options?: { preferBook?: boolean }
): string | null {
  if (target.href) {
    return target.href.startsWith("/") ? target.href : `/${target.href}`;
  }

  if (target.listingId && target.listingType) {
    if (target.listingType === "vehicle") {
      return buildSalesListingPath(target.listingId);
    }
    return buildRealEstateListingPath(target.listingId);
  }

  if (target.listingType === "vehicle") {
    return appendQuery("/sales", {
      category: target.listingFilters?.category,
    });
  }

  if (target.listingType === "property") {
    return appendQuery("/real-estate", {
      listing: target.listingFilters?.listingType,
      province: target.listingFilters?.province,
    });
  }

  if (target.serviceSlug) {
    return options?.preferBook
      ? buildServiceBookPath(target.serviceSlug)
      : buildServiceSearchPath(target.serviceSlug);
  }

  return null;
}

/** Serialize a target for Prisma Json writes. */
export function serializeStepTarget(target: WorkflowStepTarget): WorkflowStepTarget {
  return parseStepTarget(target);
}
