/**
 * Recommendations engine entry — deterministic rules first, optional polish.
 */

import { applyRecommendationRules } from "./rules";
import {
  polishRecommendationReasons,
  polishRecommendationReasonsSync,
} from "./polish";
import type {
  RecommendationContext,
  RecommendationResult,
  RecommendationSuggestion,
} from "./types";

export function recommendSync(context: RecommendationContext): RecommendationResult {
  const suggestions = applyRecommendationRules(context);
  const polished = polishRecommendationReasonsSync(suggestions, {
    locale: context.locale,
  });
  return {
    suggestions: polished.suggestions,
    polished: polished.polished,
  };
}

export async function recommend(
  context: RecommendationContext
): Promise<RecommendationResult> {
  const suggestions = applyRecommendationRules(context);
  const polished = await polishRecommendationReasons(suggestions, {
    locale: context.locale,
  });
  return {
    suggestions: polished.suggestions,
    polished: polished.polished,
  };
}

/** Map engine suggestions to catalog-style service chips (Concierge). */
export function serviceSuggestionsOnly(
  suggestions: RecommendationSuggestion[]
): RecommendationSuggestion[] {
  return suggestions.filter((s) => s.kind === "service");
}

export function listingSuggestionsOnly(
  suggestions: RecommendationSuggestion[]
): RecommendationSuggestion[] {
  return suggestions.filter((s) => s.kind === "listing");
}
