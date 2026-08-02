/**
 * Concierge adapter — recommendations engine (deterministic; no OpenAI required).
 */

import {
  recommendSync,
  type RecommendationContext,
  type RecommendationSuggestion,
} from "@/lib/recommendations";
import type { ConciergeLocale } from "@/lib/ai/types";

export type RecommendToolInput = {
  locale: ConciergeLocale;
  query?: string;
  /** Injected engagement / goals context (optional). */
  context?: Omit<RecommendationContext, "locale" | "query" | "limit">;
  limit?: number;
};

export type RecommendToolResult = {
  suggestions: RecommendationSuggestion[];
  /** Service slugs for ConciergeServiceChips compatibility. */
  serviceSlugs: string[];
};

export function recommendTool(input: RecommendToolInput): RecommendToolResult {
  const result = recommendSync({
    locale: input.locale,
    query: input.query,
    listings: input.context?.listings,
    bookings: input.context?.bookings,
    goals: input.context?.goals,
    limit: input.limit ?? 6,
  });

  return {
    suggestions: result.suggestions,
    serviceSlugs: result.suggestions
      .filter((s) => s.kind === "service")
      .map((s) => s.id),
  };
}
