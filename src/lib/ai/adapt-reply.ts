/**
 * Platform 2.1 — Adapt Concierge replies from journey memory + history.
 * Explains recommendations and surfaces next actions without hard-coding slugs.
 */

import {
  formatJourneySummary,
  goalChangeCopy,
  type ConciergeJourneyContext,
  type GoalChangeSignal,
} from "@/lib/ai/journey-context";
import type {
  ConciergeDeepLink,
  ConciergeLocale,
  ConciergeReply,
  ConciergeServiceRecommendation,
} from "@/lib/ai/types";
import type { RecommendationSuggestion } from "@/lib/recommendations";

const COPY = {
  en: {
    historyPrefix: (summary: string) => `Based on your journey (${summary}):`,
    whyHeading: "Why these suggestions",
    nextHeading: "Suggested next actions",
    because: "Because",
  },
  th: {
    historyPrefix: (summary: string) => `จากเส้นทางของคุณ (${summary}):`,
    whyHeading: "เหตุผลที่แนะนำ",
    nextHeading: "ขั้นตอนถัดไปที่แนะนำ",
    because: "เพราะ",
  },
} as const;

export type AdaptReplyInput = {
  reply: ConciergeReply;
  locale: ConciergeLocale;
  journey: ConciergeJourneyContext;
  goalChange: GoalChangeSignal;
  /** Engine suggestions with configurable reasons */
  suggestions?: RecommendationSuggestion[];
  /** True when signed-in history (goals/bookings/engagement) was loaded */
  hasCustomerHistory?: boolean;
};

function applyReasonsToServices(
  services: ConciergeServiceRecommendation[],
  suggestions: RecommendationSuggestion[]
): ConciergeServiceRecommendation[] {
  const bySlug = new Map(
    suggestions
      .filter((s) => s.kind === "service")
      .map((s) => [s.id, s.reason] as const)
  );
  return services.map((svc) => ({
    ...svc,
    reason: svc.reason ?? bySlug.get(svc.slug),
  }));
}

function applyReasonsToLinks(
  links: ConciergeDeepLink[] | undefined,
  suggestions: RecommendationSuggestion[]
): ConciergeDeepLink[] | undefined {
  if (!links?.length) return links;
  const byHref = new Map(suggestions.map((s) => [s.href, s.reason] as const));
  return links.map((link) => ({
    ...link,
    reason: link.reason ?? byHref.get(link.href),
  }));
}

function buildExplanationBlock(
  locale: ConciergeLocale,
  suggestions: RecommendationSuggestion[],
  services: ConciergeServiceRecommendation[]
): { block: string; explanations: string[] } {
  const copy = COPY[locale] ?? COPY.en;
  const lines: string[] = [];

  for (const s of suggestions.slice(0, 4)) {
    if (!s.reason?.trim()) continue;
    lines.push(`• ${s.title}: ${s.reason}`);
  }

  if (lines.length === 0) {
    for (const svc of services.slice(0, 3)) {
      if (!svc.reason?.trim()) continue;
      lines.push(`• ${svc.name}: ${svc.reason}`);
    }
  }

  if (lines.length === 0) {
    return { block: "", explanations: [] };
  }

  return {
    block: `\n\n${copy.whyHeading}:\n${lines.join("\n")}`,
    explanations: lines,
  };
}

function buildNextActionsBlock(
  locale: ConciergeLocale,
  suggestions: RecommendationSuggestion[],
  services: ConciergeServiceRecommendation[],
  links: ConciergeDeepLink[] | undefined
): string {
  const copy = COPY[locale] ?? COPY.en;
  const actions: string[] = [];

  for (const s of suggestions.slice(0, 3)) {
    actions.push(`→ ${s.title}`);
  }
  if (actions.length === 0) {
    for (const svc of services.slice(0, 2)) {
      actions.push(`→ ${svc.name}`);
    }
    for (const link of (links ?? []).slice(0, 2)) {
      actions.push(`→ ${link.label}`);
    }
  }

  if (actions.length === 0) return "";
  return `\n\n${copy.nextHeading}:\n${[...new Set(actions)].slice(0, 4).join("\n")}`;
}

/**
 * Enrich a base Concierge reply with journey awareness, goal-change notices,
 * recommendation explanations, and next-action prompts.
 */
export function adaptConciergeReply(input: AdaptReplyInput): ConciergeReply {
  const { reply, locale, journey, goalChange } = input;
  const suggestions = input.suggestions ?? [];
  const copy = COPY[locale] ?? COPY.en;

  const recommendations = applyReasonsToServices(
    reply.recommendations,
    suggestions
  );
  const deepLinks = applyReasonsToLinks(reply.deepLinks, suggestions);

  const { block: whyBlock, explanations } = buildExplanationBlock(
    locale,
    suggestions,
    recommendations
  );
  const nextBlock = buildNextActionsBlock(
    locale,
    suggestions,
    recommendations,
    deepLinks
  );

  const parts: string[] = [];

  const changeNotice = goalChangeCopy(goalChange, locale);
  if (changeNotice) {
    parts.push(changeNotice);
  }

  if (
    input.hasCustomerHistory &&
    journey.messageCount > 0 &&
    (journey.activeGoals.length > 0 || journey.topics.length > 0)
  ) {
    const summary = formatJourneySummary(journey, locale);
    // Only prepend history framing when it adds signal (not on first greeting)
    if (journey.messageCount >= 2 || journey.activeGoals.some((g) => g.source !== "message")) {
      parts.push(`${copy.historyPrefix(summary)}`);
    }
  }

  parts.push(reply.content);

  let content = parts.filter(Boolean).join("\n\n");
  content += whyBlock;
  content += nextBlock;

  return {
    ...reply,
    content: content.trim(),
    recommendations,
    deepLinks,
    journey,
    goalChange,
    explanations: explanations.length > 0 ? explanations : undefined,
  };
}
