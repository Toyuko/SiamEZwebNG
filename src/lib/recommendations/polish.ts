/**
 * Optional AI polish for recommendation reason copy.
 * Degrades synchronously to the deterministic reasons when OPENAI_API_KEY is absent.
 */

import { hasOpenAiApiKey } from "@/lib/ai/config";
import type { RecommendationLocale, RecommendationSuggestion } from "./types";

export type PolishOptions = {
  locale: RecommendationLocale;
  /** Force-skip even if a key is present (tests). */
  disabled?: boolean;
};

/**
 * Returns suggestions unchanged when no API key / polish disabled.
 * When a key is present, currently still returns deterministic copy —
 * a future LLM pass may rewrite `reason` only (never href / id / kind).
 */
export async function polishRecommendationReasons(
  suggestions: RecommendationSuggestion[],
  options: PolishOptions
): Promise<{ suggestions: RecommendationSuggestion[]; polished: boolean }> {
  if (options.disabled || !hasOpenAiApiKey() || suggestions.length === 0) {
    return { suggestions, polished: false };
  }

  // Soft polish hook: keep rules authoritative; do not invent slugs or rewrite hrefs.
  // Intentionally no network call unless we add a dedicated concise rewrite later —
  // presence of the key is reported so callers can feature-detect.
  return { suggestions, polished: false };
}

/** Sync helper for unit tests / client-safe paths. */
export function polishRecommendationReasonsSync(
  suggestions: RecommendationSuggestion[],
  options: PolishOptions
): { suggestions: RecommendationSuggestion[]; polished: boolean } {
  if (options.disabled || !hasOpenAiApiKey() || suggestions.length === 0) {
    return { suggestions, polished: false };
  }
  return { suggestions, polished: false };
}
