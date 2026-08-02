/**
 * Listing SEO metadata resolution (Wave M1).
 * Prefer enhancement seoTitle / seoDescription; fall back to title + description slice.
 */

export type ListingMetadataSource = {
  title: string;
  description?: string | null;
};

export type ListingEnhancementMeta = {
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type ResolvedListingMetadata = {
  title: string;
  description: string;
  /** True when seoTitle came from the enhancement store. */
  usedEnhancementTitle: boolean;
  /** True when seoDescription came from the enhancement store. */
  usedEnhancementDescription: boolean;
};

import { truncate } from "@/lib/migration/text";

const DEFAULT_META_DESCRIPTION_LENGTH = 160;

/** Collapse whitespace and slice for meta description fallbacks. */
export function sliceDescriptionForMeta(
  text: string | null | undefined,
  maxLength = DEFAULT_META_DESCRIPTION_LENGTH
): string {
  return truncate(text ?? "", maxLength);
}

/**
 * Resolve page metadata for a vehicle/property detail page.
 * Enhancement fields win when non-empty; otherwise title + description slice.
 */
export function resolveListingMetadata(
  source: ListingMetadataSource,
  enhancement?: ListingEnhancementMeta | null
): ResolvedListingMetadata {
  const enhancementTitle = enhancement?.seoTitle?.trim() || "";
  const enhancementDescription = enhancement?.seoDescription?.trim() || "";
  const fallbackTitle = source.title.trim() || "Listing";
  const fallbackDescription = sliceDescriptionForMeta(source.description);

  return {
    title: enhancementTitle || fallbackTitle,
    description: enhancementDescription || fallbackDescription,
    usedEnhancementTitle: Boolean(enhancementTitle),
    usedEnhancementDescription: Boolean(enhancementDescription),
  };
}
